import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { b2S3Client, BUCKET_NAME } from '@/lib/b2Client'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  s3Url: z.string().url(),
  expiresIn: z.number().min(60).max(86400).optional().default(3600) // 1 minute to 24 hours, default 1 hour
})

const ResponseSchema = z.object({
  signedUrl: z.string().url(),
  expiresAt: z.string() // ISO timestamp
})

/**
 * Generate a signed URL for accessing private B2 files
 *
 * @param s3Url - The original S3 URL from the worker
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL with expiration time
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { s3Url, expiresIn } = parsed.data

    // Extract the S3 key from the URL
    // URL format: https://s3.eu-central-003.backblazeb2.com/media-labs/09-25/f2c49618.../file.mp4
    const urlObj = new URL(s3Url)
    const pathParts = urlObj.pathname.split('/')

    // Remove empty string and bucket name to get the key
    const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME)
    if (bucketIndex === -1) {
      return NextResponse.json({ error: 'Invalid S3 URL: bucket name not found in path' }, { status: 400 })
    }

    const s3Key = pathParts.slice(bucketIndex + 1).join('/')

    if (!s3Key) {
      return NextResponse.json({ error: 'Invalid S3 URL: could not extract key' }, { status: 400 })
    }

    // Generate signed URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    })

    const signedUrl = await getSignedUrl(b2S3Client, command, {
      expiresIn
    })

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const response = {
      signedUrl,
      expiresAt
    }

    const validatedResponse = ResponseSchema.parse(response)
    return NextResponse.json(validatedResponse, { status: 200 })
  } catch (err) {
    console.error('Error generating signed URL:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
