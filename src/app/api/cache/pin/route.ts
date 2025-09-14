import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const PinRequestSchema = z.object({
  modelName: z.string(),
  pinned: z.boolean()
})

// In-memory storage for pinned models
// In production, this would be replaced with a persistent database
const pinnedModels = new Set<string>()

/**
 * Pin or unpin a model to protect it from eviction
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PinRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid request format',
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    const { modelName, pinned } = parsed.data

    if (pinned) {
      pinnedModels.add(modelName)
      console.log(`[cache-pin] Model ${modelName} has been pinned`)
    } else {
      pinnedModels.delete(modelName)
      console.log(`[cache-pin] Model ${modelName} has been unpinned`)
    }

    return NextResponse.json({
      success: true,
      modelName,
      pinned,
      message: `Model ${pinned ? 'pinned' : 'unpinned'} successfully`
    })
  } catch (err) {
    console.error('[cache-pin] Pin operation failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to update model pin status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Get list of pinned models
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      pinnedModels: Array.from(pinnedModels),
      count: pinnedModels.size
    })
  } catch (err) {
    console.error('[cache-pin] Failed to get pinned models:', err)
    const message = err instanceof Error ? err.message : 'Failed to get pinned models'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}