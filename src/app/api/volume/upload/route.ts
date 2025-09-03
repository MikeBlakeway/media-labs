// src/app/api/volume/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { runpodS3, RUNPOD_BUCKET } from '@/lib/runpodVolume'
import { sanitizeFilename, ensureEnv, MAX_UPLOAD_BYTES, isAllowedMime } from '@/lib/filename'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'

export const runtime = 'nodejs'

type JsonOk = {
  key: string
  workerPath: string
  jobId: string
  filename: string
  size: number
  contentType: string
}

// Web ReadableStream<Uint8Array> → AsyncIterable<Uint8Array>
async function* toAsyncIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) yield value
    }
  } finally {
    reader.releaseLock()
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureEnv('RUNPOD_S3_ENDPOINT', process.env.RUNPOD_S3_ENDPOINT)
    ensureEnv('RUNPOD_S3_REGION', process.env.RUNPOD_S3_REGION)
    const bucket = ensureEnv('RUNPOD_VOLUME_ID', RUNPOD_BUCKET)

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'form-data field "file" is required' }, { status: 400 })
    }

    const providedJobId = form.get('jobId')
    const jobId =
      typeof providedJobId === 'string' && providedJobId.trim().length > 0 ? providedJobId.trim() : crypto.randomUUID()

    const contentType = file.type || 'application/octet-stream'
    const size = file.size
    if (size <= 0) return NextResponse.json({ error: 'empty file' }, { status: 400 })
    if (size > MAX_UPLOAD_BYTES)
      return NextResponse.json({ error: `file too large (> ${MAX_UPLOAD_BYTES} bytes)` }, { status: 413 })
    if (!isAllowedMime(contentType))
      return NextResponse.json({ error: `unsupported content-type: ${contentType}` }, { status: 415 })

    const safeName = sanitizeFilename(file.name || 'upload')
    const key = `inputs/${jobId}/${safeName}`

    const webStream = file.stream() as ReadableStream<Uint8Array>
    const nodeReadable = Readable.from(toAsyncIterable(webStream))

    await runpodS3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: nodeReadable,
        ContentType: contentType,
        ContentLength: size // 👈 crucial: prevents aws-chunked; fixes x-amz-decoded-content-length=undefined
      })
    )

    const workerPath = `/runpod-volume/${key}`
    const payload: JsonOk = { key, workerPath, jobId, filename: safeName, size, contentType }
    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
