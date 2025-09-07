import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    USE_LOCAL_WORKER: process.env.USE_LOCAL_WORKER,
    LOCAL_WORKER_URL: process.env.LOCAL_WORKER_URL,
    RUNPOD_API_KEY: process.env.RUNPOD_API_KEY ? '***' : undefined,
    RUNPOD_ENDPOINT_ID: process.env.RUNPOD_ENDPOINT_ID,
    NODE_ENV: process.env.NODE_ENV
  })
}

export async function POST() {
  return NextResponse.json({
    USE_LOCAL_WORKER: process.env.USE_LOCAL_WORKER,
    LOCAL_WORKER_URL: process.env.LOCAL_WORKER_URL,
    RUNPOD_API_KEY: process.env.RUNPOD_API_KEY ? '***' : undefined,
    RUNPOD_ENDPOINT_ID: process.env.RUNPOD_ENDPOINT_ID,
    NODE_ENV: process.env.NODE_ENV
  })
}
