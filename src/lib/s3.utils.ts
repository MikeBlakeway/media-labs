import { z } from 'zod'

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
