import { z } from 'zod'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'

// B2/S3 Configuration Schema
export const B2ConfigSchema = z.object({
  endpoint: z.string().url(),
  region: z.string(),
  bucket: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string()
})

export type B2Config = z.infer<typeof B2ConfigSchema>

// Environment configuration
function getB2Config(): B2Config {
  const config = {
    endpoint: process.env.BUCKET_ENDPOINT_URL || '',
    region: process.env.BUCKET_REGION || '',
    bucket: process.env.BUCKET_NAME || '',
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY || ''
  }

  const parsed = B2ConfigSchema.safeParse(config)
  if (!parsed.success) {
    throw new Error(`Invalid B2 configuration: ${parsed.error.message}`)
  }

  return parsed.data
}

// Check if B2 is configured
export function isB2Configured(): boolean {
  try {
    getB2Config()
    return true
  } catch {
    return false
  }
}

// Generate public URL for B2 object
export function generateB2PublicUrl(key: string): string {
  const config = getB2Config()
  return `https://${config.bucket}.s3.${config.region}.backblazeb2.com/${key}`
}

// Validate S3 URL format
export function isValidS3Url(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.includes('backblazeb2.com') || parsed.hostname.includes('amazonaws.com'))
    )
  } catch {
    return false
  }
}

// Extract key from S3 URL
export function extractS3Key(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.pathname.substring(1) // Remove leading slash
  } catch {
    return null
  }
}

/**
 * Unified S3 object existence check with consistent error handling.
 * This function consolidates the logic from both the preflight API and model status API
 * to ensure consistent behavior across all S3 operations.
 */
export async function checkS3ObjectExists(
  s3Client: S3Client,
  bucket: string,
  key: string,
  context: string = 'unknown'
): Promise<{ exists: boolean; error?: string }> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return { exists: true }
  } catch (err: unknown) {
    // Consistent error handling across all S3-compatible providers
    if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>

      // Check $response.statusCode first (most reliable)
      const rawResp = obj['$response']
      if (rawResp && typeof rawResp === 'object') {
        const statusVal =
          (rawResp as Record<string, unknown>)['statusCode'] ?? (rawResp as Record<string, unknown>)['status']
        if (typeof statusVal === 'number') {
          if (statusVal === 404) return { exists: false }
          if (statusVal >= 200 && statusVal < 300) return { exists: true } // Handle deserialization errors

          // Log unexpected status codes for debugging
          console.warn(`S3 HEAD request failed [${context}]`, {
            bucket,
            key,
            status: statusVal,
            source: '$response.statusCode'
          })
          return { exists: false, error: `HTTP ${statusVal}` }
        }
      }

      // Check $metadata.httpStatusCode (fallback)
      const meta = obj['$metadata']
      if (meta && typeof meta === 'object') {
        const httpStatusCode =
          (meta as Record<string, unknown>)['httpStatusCode'] ?? (meta as Record<string, unknown>)['statusCode']
        if (typeof httpStatusCode === 'number') {
          if (httpStatusCode === 404) return { exists: false }
          if (httpStatusCode >= 200 && httpStatusCode < 300) return { exists: true } // Handle deserialization errors

          // Log unexpected status codes for debugging
          console.warn(`S3 HEAD request failed [${context}]`, {
            bucket,
            key,
            status: httpStatusCode,
            source: '$metadata.httpStatusCode'
          })
          return { exists: false, error: `HTTP ${httpStatusCode}` }
        }
      }

      // Check common error names/codes
      const nameVal = obj['name'] ?? obj['Code'] ?? obj['code']
      if (typeof nameVal === 'string') {
        if (nameVal === 'NotFound' || nameVal === 'NoSuchKey' || nameVal === 'NotFoundException') {
          return { exists: false }
        }
      }
    }

    // Fallback: log error and return false conservatively
    const message = err instanceof Error ? err.message : String(err)
    console.error(`S3 HEAD request failed [${context}]`, { bucket, key, message })
    return { exists: false, error: message }
  }
}
