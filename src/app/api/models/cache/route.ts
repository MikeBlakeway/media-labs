import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PreloadRequestSchema, getPreloadingService } from '@/lib/model-preloading'
import { ModelTypeSchema } from '@/lib/workflow.preflight'
import { isB2Configured } from '@/lib/s3.utils'
import { downloadModelsParallel } from '@/lib/cold-start-progress'
import { modelPaths } from '@/lib/workflow.preflight'

export const runtime = 'nodejs'

// Schema for cache request
const CacheRequestSchema = z.object({
  models: z.array(
    z.object({
      modelName: z.string().min(1),
      modelType: ModelTypeSchema,
      priority: z.number().min(0).max(1).default(0.5)
    })
  ),
  workflowSlug: z.string().optional(),
  cancelExisting: z.boolean().default(false),
  useEnhancedMode: z.boolean().default(false) // Use enhanced progress tracking and parallel download optimization
})

export async function POST(req: NextRequest) {
  try {
    // Check if B2 cold storage is configured
    if (!isB2Configured()) {
      return NextResponse.json({ error: 'B2 cold storage is not configured' }, { status: 503 })
    }

    const body = await req.json()
    const parsed = CacheRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { models, workflowSlug, cancelExisting, useEnhancedMode } = parsed.data

    // Use enhanced mode for better performance if requested
    if (useEnhancedMode) {
      console.log('[Cache] Using enhanced performance mode for cold start')

      const MODELS_PREFIX = process.env.RUNPOD_MODELS_PREFIX || 'models'
      const modelDownloads = models.map(model => {
        const { s3Key, workerPath } = modelPaths(MODELS_PREFIX, {
          nodeId: 'cache',
          classType: 'CacheModel',
          name: model.modelName,
          type: model.modelType
        })
        return {
          modelPath: model.modelName,
          s3Key,
          workerPath
        }
      })

      // Start enhanced parallel download with progress tracking
      const result = await downloadModelsParallel(modelDownloads, 3)

      return NextResponse.json({
        success: result.completed > 0,
        enhanced: true,
        completed: result.completed,
        failed: result.failed,
        totalTime: result.totalTime,
        metTarget: result.metTarget,
        message: `Enhanced mode: ${result.completed} models downloaded in ${result.totalTime.toFixed(1)}s (target: 30s)`
      })
    }

    // Standard mode - use existing preloading service

    // Transform cache request to preload request format
    const preloadRequest = {
      models: models.map(model => ({
        modelName: model.modelName,
        modelType: model.modelType,
        priority: model.priority,
        workflowSlug
      })),
      trigger: 'manual_request' as const,
      cancelExisting
    }

    // Validate with preload schema
    const preloadParsed = PreloadRequestSchema.safeParse(preloadRequest)
    if (!preloadParsed.success) {
      return NextResponse.json(
        { error: 'Invalid preload request', details: preloadParsed.error.flatten() },
        { status: 400 }
      )
    }

    // Queue models for preloading
    const service = getPreloadingService()
    const result = await service.queuePreload(preloadParsed.data)

    return NextResponse.json({
      success: result.success,
      queued: result.queued,
      skipped: result.skipped,
      message: `${result.queued.length} models queued for preloading, ${result.skipped.length} skipped`
    })
  } catch (error) {
    console.error('Model cache request failed:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if B2 cold storage is configured
    if (!isB2Configured()) {
      return NextResponse.json({ error: 'B2 cold storage is not configured' }, { status: 503 })
    }

    // Get current preloading status
    const service = getPreloadingService()
    const status = service.getPreloadStatus()

    return NextResponse.json({
      queue: status,
      summary: {
        active: status.active.length,
        queued: status.queued.length,
        completed: status.completed.length,
        failed: status.failed.length,
        totalProgress: status.totalProgress,
        estimatedCompletion: status.estimatedCompletion
      }
    })
  } catch (error) {
    console.error('Failed to get cache status:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check if B2 cold storage is configured
    if (!isB2Configured()) {
      return NextResponse.json({ error: 'B2 cold storage is not configured' }, { status: 503 })
    }

    const url = new URL(req.url)
    const modelNames = url.searchParams.getAll('model')

    const service = getPreloadingService()

    let result
    if (modelNames.length > 0) {
      // Cancel specific models
      result = await service.cancelPreload(modelNames)
    } else {
      // Cancel all preloading
      result = await service.cancelAllPreloading()
    }

    return NextResponse.json({
      success: result.success,
      cancelled: result.cancelled,
      message: `${result.cancelled.length} model downloads cancelled`
    })
  } catch (error) {
    console.error('Failed to cancel model downloads:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
