import { S3Client } from '@aws-sdk/client-s3'

function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}

/**
 * S3 client configured for Backblaze B2
 * Used for generating signed URLs for private bucket access
 */
export const b2S3Client = new S3Client({
  region: req('BUCKET_REGION'),
  endpoint: req('BUCKET_ENDPOINT_URL'),
  credentials: {
    accessKeyId: req('BUCKET_ACCESS_KEY_ID'),
    secretAccessKey: req('BUCKET_SECRET_ACCESS_KEY')
  },
  forcePathStyle: true // Required for B2 compatibility
})

export const BUCKET_NAME = req('BUCKET_NAME')
