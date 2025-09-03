import { NextResponse } from 'next/server'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { runpodS3, RUNPOD_BUCKET } from '@/lib/runpodVolume'

export const runtime = 'nodejs'

export async function GET() {
  const Prefix = (process.env.RUNPOD_MODELS_PREFIX ?? 'models').replace(/\/+$/, '') + '/'
  const cmd = new ListObjectsV2Command({ Bucket: RUNPOD_BUCKET, Prefix, MaxKeys: 10 })
  try {
    const out = await runpodS3.send(cmd)
    return NextResponse.json({
      bucket: RUNPOD_BUCKET,
      prefix: Prefix,
      keys: (out.Contents ?? []).map(o => o?.Key)
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), bucket: RUNPOD_BUCKET, prefix: Prefix },
      { status: 500 }
    )
  }
}
