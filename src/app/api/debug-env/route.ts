import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const runpodEnv = {
    RUNPOD_VOLUME_ID: process.env.RUNPOD_VOLUME_ID || 'NOT SET',
    RUNPOD_S3_ENDPOINT: process.env.RUNPOD_S3_ENDPOINT || 'NOT SET',
    RUNPOD_S3_REGION: process.env.RUNPOD_S3_REGION || 'NOT SET',
    RUNPOD_S3_ACCESS_KEY_ID: process.env.RUNPOD_S3_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    RUNPOD_S3_SECRET_ACCESS_KEY: process.env.RUNPOD_S3_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET'
  }

  return NextResponse.json(runpodEnv, { status: 200 })
}