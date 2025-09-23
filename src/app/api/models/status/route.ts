import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPreloadingService, estimateWorkflowReadyTime } from '@/lib/model-preloading'
import { getTemplate } from '@/lib/templates.fs'
import { inferModelRequirements, modelPaths } from '@/lib/workflow.preflight'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'
import { runpodS3, RUNPOD_BUCKET } from '@/lib/runpodVolume'
import { HeadObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'

const MODELS_PREFIX = process.env.RUNPOD_MODELS_PREFIX || 'models'

/**
 * Check if a model exists on the RunPod volume
 */
async function isModelAvailableOnVolume(modelName: string, modelType: string): Promise<boolean> {
  try {
    const requirement = {
      nodeId: 'status-check',
      classType: 'ModelLoader',
      name: modelName,
      type: modelType as 'unet' | 'clip' | 'clip_vision' | 'vae' | 'lora' | 'checkpoints'
    }
    const { s3Key } = modelPaths(MODELS_PREFIX, requirement)
    await runpodS3.send(new HeadObjectCommand({ Bucket: RUNPOD_BUCKET, Key: s3Key }))
    return true
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>

      // Check metadata first - if we have a 200 status, the object exists despite deserialization errors
      const meta = obj['$metadata']
      if (meta && typeof meta === 'object') {
        const httpStatusCode = (meta as Record<string, unknown>)['httpStatusCode']
        if (typeof httpStatusCode === 'number') {
          if (httpStatusCode === 200) return true // Object exists, ignore deserialization errors
          if (httpStatusCode === 404) return false
        }
      }

      // Check for 404 in response
      const rawResp = obj['$response']
      if (rawResp && typeof rawResp === 'object') {
        const statusVal = (rawResp as Record<string, unknown>)['statusCode']
        if (typeof statusVal === 'number') {
          if (statusVal === 200) return true // Object exists
          if (statusVal === 404) return false
        }
      }

      // For any other structured error with a 200 status, assume the object exists
      // This handles various SDK deserialization issues without relying on specific error messages
      if (meta && typeof meta === 'object') {
        const httpStatusCode = (meta as Record<string, unknown>)['httpStatusCode']
        if (typeof httpStatusCode === 'number' && httpStatusCode === 200) {
          return true
        }
      }
    }

    // On other errors, assume not available
    console.warn('Error checking model availability:', { modelName, modelType, error: err })
    return false
  }
}

const StatusQuerySchema = z.object({
  workflowSlug: z.string().optional(),
  modelName: z.string().optional(),
  modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']).optional()
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = {
      workflowSlug: searchParams.get('workflowSlug') || undefined,
      modelName: searchParams.get('modelName') || undefined,
      modelType: searchParams.get('modelType') || undefined
    }

    const parsed = StatusQuerySchema.safeParse(query)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 })
    }

    const service = getPreloadingService()

    // If specific model requested
    if (parsed.data.modelName && parsed.data.modelType) {
      const modelStatus = service.getModelStatus(parsed.data.modelName, parsed.data.modelType)

      if (!modelStatus) {
        // Check if model is available on volume
        const availableOnVolume = await isModelAvailableOnVolume(parsed.data.modelName, parsed.data.modelType)

        return NextResponse.json({
          modelName: parsed.data.modelName,
          modelType: parsed.data.modelType,
          status: availableOnVolume ? 'completed' : 'not_queued',
          progress: availableOnVolume ? 1 : 0,
          inQueue: false
        })
      }

      return NextResponse.json({
        ...modelStatus,
        inQueue: true
      })
    }

    // If workflow slug provided, get workflow-specific status
    if (parsed.data.workflowSlug) {
      const template = getTemplate(parsed.data.workflowSlug)
      if (!template) {
        return NextResponse.json({ error: 'Workflow template not found' }, { status: 404 })
      }

      // Validate workflow
      const workflowValidation = ExportApiWorkflowSchema.safeParse(template.workflow)
      if (!workflowValidation.success) {
        return NextResponse.json({ error: 'Invalid workflow in template' }, { status: 500 })
      }

      // Get required models
      const requirements = inferModelRequirements(workflowValidation.data)
      const readyTimeInfo = estimateWorkflowReadyTime(requirements)

      // Get status for each required model with volume availability check
      const modelStatuses = await Promise.all(
        requirements.map(async req => {
          // First check if model is already available on volume (fastest check)
          const availableOnVolume = await isModelAvailableOnVolume(req.name, req.type)

          if (availableOnVolume) {
            // Skip preloading service entirely if model is already available
            return {
              nodeId: req.nodeId,
              classType: req.classType,
              type: req.type,
              name: req.name,
              modelName: req.name,
              modelType: req.type,
              status: 'completed' as const,
              progress: 1,
              estimatedTimeRemaining: 0,
              inQueue: false
            }
          }

          // Only check preloading service if model is not on volume
          const status = service.getModelStatus(req.name, req.type)
          const finalStatus = status?.status || 'not_queued'

          return {
            // Fields from ModelRequirement
            nodeId: req.nodeId,
            classType: req.classType,
            type: req.type,
            name: req.name,
            // Fields for ModelStatusSchema compatibility
            modelName: req.name,
            modelType: req.type,
            // Status fields
            status: finalStatus,
            progress: status?.progress || (finalStatus === 'completed' ? 1 : 0),
            estimatedTimeRemaining: status?.estimatedTimeRemaining,
            inQueue: !!status
          }
        })
      )

      // Recalculate ready time based on updated statuses
      const allReady = modelStatuses.every(m => m.status === 'completed')
      const pendingModels = modelStatuses.filter(m => m.status !== 'completed').map(m => m.name)

      const queueStatus = service.getPreloadStatus()

      return NextResponse.json({
        workflowSlug: parsed.data.workflowSlug,
        workflowName: template.name,
        readyNow: allReady,
        estimatedReadyTime: allReady ? null : readyTimeInfo.estimatedTime,
        pendingModels: pendingModels,
        requiredModels: modelStatuses,
        queueSummary: {
          totalActive: queueStatus.active.length,
          totalQueued: queueStatus.queued.length,
          totalProgress: queueStatus.totalProgress,
          estimatedCompletion: queueStatus.estimatedCompletion
        }
      })
    }

    // General queue status
    const queueStatus = service.getPreloadStatus()

    return NextResponse.json({
      queue: queueStatus,
      summary: {
        totalModels:
          queueStatus.active.length +
          queueStatus.queued.length +
          queueStatus.completed.length +
          queueStatus.failed.length,
        activeDownloads: queueStatus.active.length,
        queuedDownloads: queueStatus.queued.length,
        completedDownloads: queueStatus.completed.length,
        failedDownloads: queueStatus.failed.length,
        overallProgress: queueStatus.totalProgress,
        estimatedCompletion: queueStatus.estimatedCompletion
      }
    })
  } catch (error) {
    console.error('Model status API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to get model status', details: message }, { status: 500 })
  }
}
