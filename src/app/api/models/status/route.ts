import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPreloadingService, estimateWorkflowReadyTime } from '@/lib/model-preloading'
import { getTemplate } from '@/lib/templates.fs'
import { inferModelRequirements } from '@/lib/workflow.preflight'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

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
        return NextResponse.json({
          modelName: parsed.data.modelName,
          modelType: parsed.data.modelType,
          status: 'not_queued',
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

      // Get status for each required model
      const modelStatuses = requirements.map(req => {
        const status = service.getModelStatus(req.name, req.type)
        return {
          ...req,
          status: status?.status || 'not_queued',
          progress: status?.progress || 0,
          estimatedTimeRemaining: status?.estimatedTimeRemaining,
          inQueue: !!status
        }
      })

      const queueStatus = service.getPreloadStatus()

      return NextResponse.json({
        workflowSlug: parsed.data.workflowSlug,
        workflowName: template.name,
        readyNow: readyTimeInfo.readyNow,
        estimatedReadyTime: readyTimeInfo.estimatedTime,
        pendingModels: readyTimeInfo.pendingModels,
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
