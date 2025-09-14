import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPreloadingService } from '@/lib/model-preloading'
import { findModelCombinations, type ModelUsageEvent } from '@/lib/model-analytics'
import { listTemplates, getTemplate } from '@/lib/templates.fs'
import { inferModelRequirements } from '@/lib/workflow.preflight'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

const WarmRequestSchema = z.object({
  strategy: z.enum(['popular_models', 'recent_combinations', 'all_templates']).default('popular_models'),
  maxModels: z.number().min(1).max(50).default(10),
  priorityThreshold: z.number().min(0).max(1).default(0.3)
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = WarmRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { strategy, maxModels, priorityThreshold } = parsed.data
    const service = getPreloadingService()

    // Mock usage events for demonstration
    // In a real implementation, this would load from a database
    const mockEvents: ModelUsageEvent[] = generateMockUsageEvents()

    let modelsToWarm: { name: string; type: string; priority: number }[] = []

    switch (strategy) {
      case 'popular_models': {
        // Warm most frequently used models
        const modelUsage = new Map<string, { count: number; type: string }>()

        for (const event of mockEvents) {
          const key = event.modelName
          const existing = modelUsage.get(key)
          if (existing) {
            existing.count++
          } else {
            modelUsage.set(key, { count: 1, type: event.modelType })
          }
        }

        modelsToWarm = Array.from(modelUsage.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, maxModels)
          .map(([name, data]) => ({
            name,
            type: data.type,
            priority: Math.min(data.count / 10, 1) // Normalize to 0-1
          }))
          .filter(m => m.priority >= priorityThreshold)

        break
      }

      case 'recent_combinations': {
        // Warm models from frequently occurring combinations
        const combinations = findModelCombinations(mockEvents)
        const modelScores = new Map<string, number>()

        for (const combo of combinations) {
          const score = combo.frequency * combo.averageSuccess
          for (const model of combo.models) {
            const currentScore = modelScores.get(model) || 0
            modelScores.set(model, Math.max(currentScore, score))
          }
        }

        modelsToWarm = Array.from(modelScores.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, maxModels)
          .map(([name, score]) => ({
            name,
            type: inferModelTypeFromName(name),
            priority: Math.min(score / 10, 1)
          }))
          .filter(m => m.priority >= priorityThreshold)

        break
      }

      case 'all_templates': {
        // Warm models from all workflow templates
        const templates = listTemplates()
        const allRequirements = new Map<string, { type: string; workflows: string[] }>()

        for (const template of templates) {
          const fullTemplate = getTemplate(template.slug)
          if (!fullTemplate) continue

          const workflowValidation = ExportApiWorkflowSchema.safeParse(fullTemplate.workflow)
          if (!workflowValidation.success) continue

          const requirements = inferModelRequirements(workflowValidation.data)

          for (const req of requirements) {
            const existing = allRequirements.get(req.name)
            if (existing) {
              existing.workflows.push(template.slug)
            } else {
              allRequirements.set(req.name, {
                type: req.type,
                workflows: [template.slug]
              })
            }
          }
        }

        modelsToWarm = Array.from(allRequirements.entries())
          .map(([name, data]) => ({
            name,
            type: data.type,
            priority: Math.min(data.workflows.length / 5, 1) // More workflows = higher priority
          }))
          .sort((a, b) => b.priority - a.priority)
          .slice(0, maxModels)
          .filter(m => m.priority >= priorityThreshold)

        break
      }
    }

    if (modelsToWarm.length === 0) {
      return NextResponse.json({
        success: true,
        strategy,
        warmed: 0,
        message: 'No models met the warming criteria'
      })
    }

    // Create preload request
    const preloadRequest = {
      models: modelsToWarm.map(m => ({
        modelName: m.name,
        modelType: m.type as 'unet' | 'clip' | 'clip_vision' | 'vae' | 'lora' | 'checkpoints',
        priority: m.priority
      })),
      trigger: 'background_warming' as const,
      cancelExisting: false
    }

    const result = await service.queuePreload(preloadRequest)

    return NextResponse.json({
      success: true,
      strategy,
      warmed: result.queued.length,
      skipped: result.skipped.length,
      models: result.queued,
      message: `Started warming ${result.queued.length} models using ${strategy} strategy`
    })
  } catch (error) {
    console.error('Model warming API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to start model warming', details: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get warming schedule and status
    const service = getPreloadingService()
    const status = service.getPreloadStatus()

    // Check if we're in warming hours (2-4 AM by default)
    const now = new Date()
    const currentHour = now.getHours()
    const warmingHours = [2, 3, 4] // Could be configurable
    const isWarmingTime = warmingHours.includes(currentHour)

    return NextResponse.json({
      isWarmingTime,
      currentHour,
      warmingHours,
      activeWarmingJobs: status.active.filter(
        job => job.priority < 0.5 // Lower priority indicates background warming
      ).length,
      nextWarmingTime: getNextWarmingTime(warmingHours),
      queueStatus: {
        active: status.active.length,
        queued: status.queued.length,
        completed: status.completed.length
      }
    })
  } catch (error) {
    console.error('Model warming status API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to get warming status', details: message }, { status: 500 })
  }
}

/**
 * Generate mock usage events for demonstration
 */
function generateMockUsageEvents(): ModelUsageEvent[] {
  const models = [
    { name: 'flux1-dev.safetensors', type: 'checkpoints' as const },
    { name: 'clip_l.safetensors', type: 'clip' as const },
    { name: 'clip_g.safetensors', type: 'clip' as const },
    { name: 'ae.safetensors', type: 'vae' as const },
    { name: 't5xxl_fp16.safetensors', type: 'unet' as const },
    { name: 'wan2.1_flf2v_720p_14B_fp16.safetensors', type: 'unet' as const }
  ]

  const workflows = ['text-to-image', 'wan2-1-flf2v', 'img2img']
  const events: ModelUsageEvent[] = []

  // Generate usage events for the last 30 days
  const now = new Date()
  for (let day = 0; day < 30; day++) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000)

    // 2-5 events per day
    const eventsPerDay = Math.floor(Math.random() * 4) + 2

    for (let i = 0; i < eventsPerDay; i++) {
      const model = models[Math.floor(Math.random() * models.length)]
      const workflow = workflows[Math.floor(Math.random() * workflows.length)]

      events.push({
        modelName: model.name,
        modelType: model.type,
        workflowSlug: workflow,
        timestamp: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        duration: Math.random() * 300 + 30, // 30-330 seconds
        success: Math.random() > 0.1 // 90% success rate
      })
    }
  }

  return events
}

/**
 * Infer model type from name
 */
function inferModelTypeFromName(name: string): string {
  const nameLower = name.toLowerCase()
  if (nameLower.includes('clip')) return 'clip'
  if (nameLower.includes('vae') || nameLower.includes('ae.')) return 'vae'
  if (nameLower.includes('unet') || nameLower.includes('flux')) return 'unet'
  if (nameLower.includes('lora')) return 'lora'
  return 'checkpoints'
}

/**
 * Get the next warming time
 */
function getNextWarmingTime(warmingHours: number[]): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Find next warming hour today
  for (const hour of warmingHours.sort()) {
    const warmingTime = new Date(today.getTime() + hour * 60 * 60 * 1000)
    if (warmingTime > now) {
      return warmingTime.toISOString()
    }
  }

  // Next warming time is tomorrow
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const nextWarmingHour = Math.min(...warmingHours)
  const nextWarmingTime = new Date(tomorrow.getTime() + nextWarmingHour * 60 * 60 * 1000)

  return nextWarmingTime.toISOString()
}
