import { S3Client } from '@aws-sdk/client-s3'

/** S3 client for Backblaze B2 (S3-compatible) */
export const b2 = new S3Client({
  region: process.env.B2_S3_REGION || 'auto',
  endpoint: process.env.B2_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.B2_S3_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: true
})
