import { S3Client } from '@aws-sdk/client-s3'

/** S3 client for Backblaze B2 (S3-compatible) */
export const b2 = new S3Client({
  region: process.env.BUCKET_REGION || 'auto',
  endpoint: process.env.BUCKET_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: true
})
