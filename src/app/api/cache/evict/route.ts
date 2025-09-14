import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isModelProtected, type ModelCacheEntry } from '@/lib/cache-manager'

export const runtime = 'nodejs'

const EvictRequestSchema = z.object({
  modelName: z.string(),
  force: z.boolean().optional().default(false)
})

/**
 * Get model information for eviction check
 */
async function getModelInfo(modelName: string) {
  const response = await fetch('/api/cache/status')
  if (!response.ok) {
    throw new Error('Failed to get cache status')
  }

  const data = await response.json()
  const model = data.models.find((m: ModelCacheEntry) => m.modelName === modelName)

  if (!model) {
    throw new Error(`Model ${modelName} not found`)
  }

  return model
}

/**
 * Execute model eviction through volume worker
 */
async function evictModelFromVolume(modelPath: string): Promise<boolean> {
  try {
    const response = await fetch('/api/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'rm',
        args: { path: modelPath }
      })
    })

    if (!response.ok) {
      throw new Error(`Volume worker error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.ok === true
  } catch (err) {
    console.error(`Failed to evict model from volume:`, err)
    return false
  }
}

/**
 * Manually evict a specific model
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = EvictRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    const { modelName, force } = parsed.data

    console.log(`[cache-evict] Attempting to evict model: ${modelName} (force=${force})`)

    // Get model information
    const model = await getModelInfo(modelName)

    // Check if model is protected (unless force is true)
    if (!force && isModelProtected(model)) {
      const reasons = []
      if (model.isPinned) reasons.push('pinned')
      if (model.isInUse) reasons.push('in use')

      const now = new Date()
      const hoursSinceAccess = (now.getTime() - new Date(model.lastAccessed).getTime()) / (1000 * 60 * 60)
      if (hoursSinceAccess < 24) reasons.push('recently accessed')

      return NextResponse.json(
        {
          success: false,
          error: 'Model is protected from eviction',
          modelName,
          protectionReasons: reasons,
          hint: 'Use force=true to override protection, or unpin the model first'
        },
        { status: 403 }
      )
    }

    // Execute eviction
    const success = await evictModelFromVolume(model.filePath)

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to evict model from volume',
          modelName
        },
        { status: 500 }
      )
    }

    console.log(`[cache-evict] Successfully evicted model: ${modelName}`)

    return NextResponse.json({
      success: true,
      modelName,
      reclaimedBytes: model.size,
      message: `Model ${modelName} evicted successfully`,
      evictionDetails: {
        filePath: model.filePath,
        size: model.size,
        heatScore: model.heatScore,
        wasProtected: !force && isModelProtected(model),
        forcedEviction: force
      }
    })
  } catch (err) {
    console.error('[cache-evict] Eviction failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to evict model'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Get eviction preview for a model
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = z.object({ modelName: z.string() }).safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    const { modelName } = parsed.data

    // Get model information
    const model = await getModelInfo(modelName)

    // Check protection status
    const isProtected = isModelProtected(model)
    const protectionReasons = []

    if (model.isPinned) protectionReasons.push('Model is pinned')
    if (model.isInUse) protectionReasons.push('Model is currently in use')

    const now = new Date()
    const hoursSinceAccess = (now.getTime() - new Date(model.lastAccessed).getTime()) / (1000 * 60 * 60)
    if (hoursSinceAccess < 24) protectionReasons.push('Model was accessed recently')

    return NextResponse.json({
      success: true,
      modelName,
      canEvict: !isProtected,
      protected: isProtected,
      protectionReasons,
      modelInfo: {
        filePath: model.filePath,
        size: model.size,
        sizeGB: (model.size / 1024 / 1024 / 1024).toFixed(2),
        heatScore: model.heatScore,
        lastAccessed: model.lastAccessed,
        accessCount: model.accessCount,
        type: model.type
      },
      impact: {
        reclaimedBytes: model.size,
        reclaimedGB: (model.size / 1024 / 1024 / 1024).toFixed(2)
      }
    })
  } catch (err) {
    console.error('[cache-evict] Preview failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to get eviction preview'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
