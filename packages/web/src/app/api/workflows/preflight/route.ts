import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runpodS3, RUNPOD_BUCKET } from '@/lib/runpodVolume'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { getTemplate } from '@/lib/templates.fs'
import { ExportApiWorkflowSchema, type ExportApiWorkflow } from '@/lib/workflow.infer'
import { inferModelRequirements, modelPaths, ModelPresenceSchema, type ModelPresence } from '@/lib/workflow.preflight'

export const runtime = 'nodejs'

const PreflightReqSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('slug'), slug: z.string() }),
  z.object({ kind: z.literal('workflow'), workflow: ExportApiWorkflowSchema })
])

const MODELS_PREFIX = process.env.RUNPOD_MODELS_PREFIX || 'models'

async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    // Prefer HEAD to check object existence — faster and more reliable across S3-compatible APIs
    await runpodS3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (err: unknown) {
    // Inspect known AWS SDK shapes without unsafe casting.
    if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>

      // 1) Some SDK errors expose a raw $response with statusCode even when parsing fails
      const rawResp = obj['$response']
      if (rawResp && typeof rawResp === 'object') {
        const statusVal =
          (rawResp as Record<string, unknown>)['statusCode'] ?? (rawResp as Record<string, unknown>)['status']
        if (typeof statusVal === 'number') {
          const status = statusVal
          if (status === 404) return false
          if (status >= 200 && status < 300) return true
          // For other non-2xx, log and treat as not present (conservative)
          console.error('HEAD failed', { bucket, key, status, note: 'raw $response present' })
          return false
        }
      }

      // 2) Fallback: check $metadata.httpStatusCode
      const meta = obj['$metadata']
      if (meta && typeof meta === 'object') {
        const httpStatusCode =
          (meta as Record<string, unknown>)['httpStatusCode'] ?? (meta as Record<string, unknown>)['statusCode']
        if (typeof httpStatusCode === 'number') {
          const httpStatus = httpStatusCode
          if (httpStatus === 404) return false
          if (httpStatus >= 200 && httpStatus < 300) return true
          console.error('HEAD failed', { bucket, key, status: httpStatus, note: '$metadata.httpStatusCode' })
          return false
        }
      }

      // 3) Check common provider error codes/names
      const nameVal = obj['name'] ?? obj['Code'] ?? obj['code']
      if (typeof nameVal === 'string') {
        if (nameVal === 'NotFound' || nameVal === 'NoSuchKey' || nameVal === 'NotFoundException') return false
      }
    }

    // If we couldn't classify the error, log the message and return false conservatively.
    const msg = err instanceof Error ? err.message : String(err)
    console.error('HEAD failed', { bucket, key, msg })
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown = await req.json()
    const parsed = PreflightReqSchema.safeParse(bodyUnknown)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code
      }))
      return NextResponse.json({ error: { issues } }, { status: 400 })
    }

    let wf: ExportApiWorkflow
    if (parsed.data.kind === 'slug') {
      const tpl = getTemplate(parsed.data.slug)
      if (!tpl) return NextResponse.json({ error: 'template not found' }, { status: 404 })
      const v = ExportApiWorkflowSchema.safeParse(tpl.workflow)
      if (!v.success) return NextResponse.json({ error: 'stored workflow invalid' }, { status: 500 })
      wf = v.data
    } else {
      wf = parsed.data.workflow
    }

    const reqs = inferModelRequirements(wf)
    const presences: ModelPresence[] = []

    for (const r of reqs) {
      const { s3Key, workerPath } = modelPaths(MODELS_PREFIX, r)
      const present = await objectExists(RUNPOD_BUCKET, s3Key) // <- boolean
      // ✅ present is now a boolean, not an object
      presences.push(ModelPresenceSchema.parse({ ...r, present, s3Key, workerPath }))
    }

    return NextResponse.json({ ok: true, results: presences }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
