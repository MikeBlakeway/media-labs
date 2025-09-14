import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateModelAccess } from '@/lib/cache-manager'

export const runtime = 'nodejs'

const TrackAccessRequestSchema = z.object({
  modelName: z.string(),
  modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
  workflowId: z.string().optional(),
  userId: z.string().optional()
})

interface ModelCacheEntry {
  modelName: string
  filePath: string
  size: number
  lastAccessed: Date
  accessCount: number
  isPinned: boolean
  isInUse: boolean
  type: 'unet' | 'clip' | 'clip_vision' | 'vae' | 'lora' | 'checkpoints'
  heatScore: number
}

// In-memory storage for model access tracking
// In production, this would be replaced with a persistent database
const modelAccessData = new Map<string, ModelCacheEntry>()
let accessHistory: Array<{ timestamp: Date; modelName: string; modelType: string }> = []

/**
 * Track model access for cache analytics
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TrackAccessRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid request format',
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    const { modelName, modelType, workflowId, userId } = parsed.data
    const timestamp = new Date()

    console.log(`[cache-track] Tracking access: ${modelName} (${modelType})`)

    // Get or create model cache entry
    let cacheEntry = modelAccessData.get(modelName)
    if (!cacheEntry) {
      cacheEntry = {
        modelName,
        filePath: `/runpod-volume/models/${modelType}/${modelName}`,
        size: 0, // Will be updated when we get volume info
        lastAccessed: timestamp,
        accessCount: 0,
        isPinned: false,
        isInUse: false,
        type: modelType,
        heatScore: 0
      }
      modelAccessData.set(modelName, cacheEntry)
    }

    // Update access tracking
    const updatedEntry = updateModelAccess(cacheEntry)
    modelAccessData.set(modelName, updatedEntry)

    // Add to access history
    accessHistory.push({
      timestamp,
      modelName,
      modelType
    })

    // Keep only last 1000 access records
    if (accessHistory.length > 1000) {
      accessHistory = accessHistory.slice(-1000)
    }

    console.log(`[cache-track] Updated ${modelName}: accessCount=${updatedEntry.accessCount}, heatScore=${updatedEntry.heatScore.toFixed(3)}`)

    return NextResponse.json({
      success: true,
      modelName,
      modelType,
      accessCount: updatedEntry.accessCount,
      heatScore: updatedEntry.heatScore,
      lastAccessed: updatedEntry.lastAccessed,
      workflowId,
      userId
    })
  } catch (err) {
    console.error('[cache-track] Access tracking failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to track model access'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Get model access statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const modelName = searchParams.get('modelName')
    const limit = parseInt(searchParams.get('limit') ?? '100')

    if (modelName) {
      // Get specific model access data
      const cacheEntry = modelAccessData.get(modelName)
      if (!cacheEntry) {
        return NextResponse.json({
          error: `Model ${modelName} not found in access tracking`
        }, { status: 404 })
      }

      // Get recent access history for this model
      const modelHistory = accessHistory
        .filter(entry => entry.modelName === modelName)
        .slice(-50) // Last 50 accesses

      return NextResponse.json({
        success: true,
        modelName,
        accessData: cacheEntry,
        recentAccesses: modelHistory,
        totalAccesses: cacheEntry.accessCount
      })
    }

    // Get overall access statistics
    const allModels = Array.from(modelAccessData.values())
    const totalAccesses = accessHistory.length
    const uniqueModels = allModels.length
    const mostAccessed = allModels
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)

    // Calculate access frequency by hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentAccesses = accessHistory.filter(entry => entry.timestamp > oneHourAgo)

    // Group by model type
    const accessByType = accessHistory.reduce((acc, entry) => {
      acc[entry.modelType] = (acc[entry.modelType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      statistics: {
        totalAccesses,
        uniqueModels,
        recentAccesses: recentAccesses.length,
        accessByType
      },
      mostAccessed: mostAccessed.map(model => ({
        modelName: model.modelName,
        type: model.type,
        accessCount: model.accessCount,
        heatScore: model.heatScore,
        lastAccessed: model.lastAccessed
      })),
      recentActivity: accessHistory.slice(-limit).map(entry => ({
        timestamp: entry.timestamp,
        modelName: entry.modelName,
        modelType: entry.modelType
      }))
    })
  } catch (err) {
    console.error('[cache-track] Failed to get access statistics:', err)
    const message = err instanceof Error ? err.message : 'Failed to get access statistics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}