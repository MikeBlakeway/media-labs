import { S3Client } from '@aws-sdk/client-s3'

function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}

// Accept your existing .env names
export const RUNPOD_BUCKET = req('RUNPOD_VOLUME_ID')
export const RUNPOD_REGION = req('RUNPOD_S3_REGION')
export const RUNPOD_S3_ENDPOINT = req('RUNPOD_S3_ENDPOINT')

export const runpodS3 = new S3Client({
  region: RUNPOD_REGION, // e.g. "eu-ro-1"
  endpoint: RUNPOD_S3_ENDPOINT, // e.g. "https://s3api-eu-ro-1.runpod.io"
  forcePathStyle: true, // important for S3-compatible endpoints
  credentials: {
    accessKeyId: req('RUNPOD_S3_ACCESS_KEY_ID'),
    secretAccessKey: req('RUNPOD_S3_SECRET_ACCESS_KEY')
  }
})
