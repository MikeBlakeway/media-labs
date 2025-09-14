import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { coldStartTracker, downloadModelsParallel } from '@/lib/cold-start-progress'

export const runtime = 'nodejs'

// Schema for progress tracking requests
const ProgressRequestSchema = z.union([
  z.object({
    action: z.literal('get-metrics')
  }),
  z.object({
    action: z.literal('get-progress')
  }),
  z.object({
    action: z.literal('start-parallel-download'),
    models: z.array(
      z.object({
        modelPath: z.string(),
        s3Key: z.string(),
        workerPath: z.string()
      })
    ),
    maxConcurrency: z.number().min(1).max(10).optional().default(3)
  }),
  z.object({
    action: z.literal('reset')
  })
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ProgressRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { action } = parsed.data

    switch (action) {
      case 'get-metrics': {
        const metrics = coldStartTracker.getMetrics()
        return NextResponse.json({ metrics })
      }

      case 'get-progress': {
        const progress = coldStartTracker.getAllProgress()
        const metrics = coldStartTracker.getMetrics()
        return NextResponse.json({ progress, metrics })
      }

      case 'start-parallel-download': {
        const { models, maxConcurrency } = parsed.data
        console.log(`[ProgressAPI] Starting parallel download of ${models.length} models`)

        const result = await downloadModelsParallel(models, maxConcurrency)
        return NextResponse.json({ result })
      }

      case 'reset': {
        coldStartTracker.reset()
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ProgressAPI] Error:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Default GET request returns current progress and metrics
    const progress = coldStartTracker.getAllProgress()
    const metrics = coldStartTracker.getMetrics()
    const isComplete = coldStartTracker.isComplete()
    const metTarget = coldStartTracker.metPerformanceTarget()

    return NextResponse.json({
      progress,
      metrics,
      isComplete,
      metTarget,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ProgressAPI] Error:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
