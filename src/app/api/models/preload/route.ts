import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PreloadRequestSchema, getPreloadingService } from '@/lib/model-preloading'
import { calculateModelPriority, type ModelUsageEvent } from '@/lib/model-analytics'
import { getTemplate } from '@/lib/templates.fs'
import { inferModelRequirements } from '@/lib/workflow.preflight'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

const PreloadApiRequestSchema = z.discriminatedUnion('type', [
  // Preload models for a specific workflow
  z.object({
    type: z.literal('workflow'),
    workflowSlug: z.string(),
    trigger: z.enum(['template_selection', 'form_completion', 'background_warming', 'manual_request'])
  }),
  // Preload specific models
  z.object({
    type: z.literal('models'),
    models: z.array(
      z.object({
        modelName: z.string(),
        modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
        priority: z.number().min(0).max(1).optional().default(0.5)
      })
    ),
    trigger: z.enum(['template_selection', 'form_completion', 'background_warming', 'manual_request']),
    workflowSlug: z.string().optional()
  }),
  // Cancel preloading
  z.object({
    type: z.literal('cancel'),
    modelNames: z.array(z.string()).optional() // If not provided, cancels all
  })
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PreloadApiRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const service = getPreloadingService()
    const request = parsed.data

    if (request.type === 'cancel') {
      // Cancel preloading
      const result = request.modelNames
        ? await service.cancelPreload(request.modelNames)
        : await service.cancelAllPreloading()

      return NextResponse.json({
        success: true,
        cancelled: result.cancelled,
        message: `Cancelled preloading for ${result.cancelled.length} models`
      })
    }

    if (request.type === 'workflow') {
      // Preload models for a workflow
      const template = getTemplate(request.workflowSlug)
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

      if (requirements.length === 0) {
        return NextResponse.json({
          success: true,
          queued: [],
          skipped: [],
          message: 'No models required for this workflow'
        })
      }

      // Calculate priorities based on mock usage data
      // In a real implementation, this would load from a database
      const mockEvents: ModelUsageEvent[] = []
      const priorities = requirements.map(req => calculateModelPriority(req.name, mockEvents, [request.workflowSlug]))

      // Create preload request
      const preloadRequest = {
        models: priorities.map(p => ({
          modelName: p.modelName,
          modelType: p.modelType,
          priority: p.score,
          workflowSlug: request.workflowSlug
        })),
        trigger: request.trigger,
        cancelExisting: false
      }

      const result = await service.queuePreload(preloadRequest)

      return NextResponse.json({
        success: true,
        queued: result.queued,
        skipped: result.skipped,
        message: `Queued ${result.queued.length} models for preloading`,
        requirements: requirements.map(r => ({ name: r.name, type: r.type }))
      })
    }

    if (request.type === 'models') {
      // Preload specific models
      const preloadRequest = {
        models: request.models.map(m => ({
          modelName: m.modelName,
          modelType: m.modelType,
          priority: m.priority || 0.5,
          workflowSlug: request.workflowSlug
        })),
        trigger: request.trigger,
        cancelExisting: false
      }

      const validated = PreloadRequestSchema.safeParse(preloadRequest)
      if (!validated.success) {
        return NextResponse.json(
          { error: 'Invalid preload request', details: validated.error.flatten() },
          { status: 400 }
        )
      }

      const result = await service.queuePreload(validated.data)

      return NextResponse.json({
        success: true,
        queued: result.queued,
        skipped: result.skipped,
        message: `Queued ${result.queued.length} models for preloading`
      })
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  } catch (error) {
    console.error('Model preload API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to process preload request', details: message }, { status: 500 })
  }
}
