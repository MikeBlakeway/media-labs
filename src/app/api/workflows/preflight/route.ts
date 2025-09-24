import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runpodS3, RUNPOD_BUCKET } from '@/lib/runpodVolume'
import { b2 } from '@/lib/b2'
import { isB2Configured, checkS3ObjectExists } from '@/lib/s3.utils'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { getTemplate } from '@/lib/templates.fs'
import { ExportApiWorkflowSchema, type ExportApiWorkflow } from '@/lib/workflow.infer'
import { inferModelRequirements, modelPaths, ModelPresenceSchema, type ModelPresence } from '@/lib/workflow.preflight'
import { detectRunPodVariant, isModelPreinstalled } from '@/lib/runpod.preinstalled'
import { volumeManagement } from '@/lib/volume-management'

export const runtime = 'nodejs'

const PreflightReqSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('slug'), slug: z.string() }),
  z.object({ kind: z.literal('workflow'), workflow: ExportApiWorkflowSchema })
])

const MODELS_PREFIX = process.env.RUNPOD_MODELS_PREFIX || 'models'
const B2_BUCKET = process.env.BUCKET_NAME || ''

/**
 * Estimate model size based on type for volume management
 */
function getEstimatedModelSize(modelType: string): number {
  const sizeEstimates = {
    unet: 5 * 1024 * 1024 * 1024, // 5GB
    checkpoints: 4 * 1024 * 1024 * 1024, // 4GB
    clip: 500 * 1024 * 1024, // 500MB
    clip_vision: 1 * 1024 * 1024 * 1024, // 1GB
    vae: 300 * 1024 * 1024, // 300MB
    lora: 100 * 1024 * 1024 // 100MB
  }

  return sizeEstimates[modelType as keyof typeof sizeEstimates] || 1 * 1024 * 1024 * 1024 // 1GB default
}

async function checkB2ModelPresence(s3Key: string): Promise<boolean> {
  if (!isB2Configured() || !B2_BUCKET) {
    return false
  }

  try {
    await b2.send(new HeadObjectCommand({ Bucket: B2_BUCKET, Key: s3Key }))
    return true
  } catch (err: unknown) {
    // Use similar error handling as objectExists for consistency
    if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>

      const rawResp = obj['$response']
      if (rawResp && typeof rawResp === 'object') {
        const statusVal =
          (rawResp as Record<string, unknown>)['statusCode'] ?? (rawResp as Record<string, unknown>)['status']
        if (typeof statusVal === 'number' && statusVal === 404) return false
      }

      const meta = obj['$metadata']
      if (meta && typeof meta === 'object') {
        const httpStatusCode =
          (meta as Record<string, unknown>)['httpStatusCode'] ?? (meta as Record<string, unknown>)['statusCode']
        if (typeof httpStatusCode === 'number' && httpStatusCode === 404) return false
      }

      const nameVal = obj['name'] ?? obj['Code'] ?? obj['code']
      if (typeof nameVal === 'string') {
        if (nameVal === 'NotFound' || nameVal === 'NoSuchKey' || nameVal === 'NotFoundException') return false
      }
    }

    // Log error but don't fail the request
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('B2 HEAD check failed', { bucket: B2_BUCKET, key: s3Key, msg })
    return false
  }
}

async function checkModelPresence(
  bucket: string,
  s3Key: string,
  modelName: string
): Promise<{
  present: boolean
  b2Available?: boolean
  requiresColdStart?: boolean
  estimatedColdStartTime?: number
}> {
  // First check if model is pre-installed in the RunPod variant
  const variant = detectRunPodVariant()
  if (isModelPreinstalled(modelName, variant)) {
    console.log(`Model ${modelName} is pre-installed in RunPod variant ${variant}`)
    return { present: true }
  }

  // Check if it exists in the S3 volume using unified checking function
  const checkStartTime = Date.now()
  const volumeCheck = await checkS3ObjectExists(runpodS3, bucket, s3Key, `preflight-${modelName}`)
  const checkDuration = Date.now() - checkStartTime

  console.log(`[PREFLIGHT] Model check for ${modelName}:`, {
    s3Key,
    exists: volumeCheck.exists,
    duration: `${checkDuration}ms`,
    error: volumeCheck.error || 'none'
  })

  if (volumeCheck.exists) {
    return { present: true }
  }

  // Log any errors from the volume check for debugging
  if (volumeCheck.error) {
    console.warn(`Volume check failed for ${modelName}:`, volumeCheck.error)
  }

  // If not on volume, check B2 cold storage
  const b2Available = await checkB2ModelPresence(s3Key)
  if (b2Available) {
    return {
      present: false,
      b2Available: true,
      requiresColdStart: true,
      estimatedColdStartTime: 25 // Estimate 25 seconds for B2 download
    }
  }

  // Model not found anywhere
  return { present: false }
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
      const modelStatus = await checkModelPresence(RUNPOD_BUCKET, s3Key, r.name)

      // Record model usage for volume management (if present on volume)
      if (modelStatus.present) {
        // Estimate model size based on type - this will be updated with actual size when downloaded
        const estimatedSizeBytes = getEstimatedModelSize(r.type)
        void volumeManagement.recordModelUsage(s3Key, r.type, estimatedSizeBytes)

        // Track model access for cache analytics
        try {
          const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
          await fetch(`${baseUrl}/api/cache/track-access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelName: r.name,
              modelType: r.type,
              workflowId: parsed.data.kind === 'slug' ? parsed.data.slug : 'direct'
            })
          })
        } catch (trackErr) {
          // Don't fail preflight if tracking fails
          console.warn('Failed to track model access:', trackErr)
        }
      }

      presences.push(
        ModelPresenceSchema.parse({
          ...r,
          present: modelStatus.present,
          s3Key,
          workerPath,
          b2Available: modelStatus.b2Available,
          requiresColdStart: modelStatus.requiresColdStart,
          estimatedColdStartTime: modelStatus.estimatedColdStartTime
        })
      )
    }

    // Log the final preflight results for debugging
    const summary = {
      total: presences.length,
      present: presences.filter(p => p.present).length,
      missing: presences.filter(p => !p.present).length,
      models: presences.map(p => ({ name: p.name, present: p.present }))
    }

    console.log(`[PREFLIGHT] Final results for workflow:`, summary)

    return NextResponse.json({ ok: true, results: presences }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
