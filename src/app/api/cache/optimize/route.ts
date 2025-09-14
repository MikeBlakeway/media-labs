import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  calculateEvictionTarget,
  selectModelsForEviction,
  shouldTriggerEviction,
  isModelProtected,
  EvictionResultSchema,
  CACHE_CONFIG,
  type ModelCacheEntry
} from '@/lib/cache-manager'

export const runtime = 'nodejs'

const OptimizeRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  targetPercent: z.number().min(1).max(100).optional(),
  dryRun: z.boolean().optional().default(false)
})

/**
 * Get current volume statistics and model list
 */
async function getCacheData() {
  const response = await fetch('/api/cache/status')
  if (!response.ok) {
    throw new Error('Failed to get cache status')
  }

  const data = await response.json()
  return {
    volumeStats: data.cacheStatus.volumeStats,
    models: data.models
  }
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
    console.error(`Failed to evict model ${modelPath}:`, err)
    return false
  }
}

/**
 * Trigger cache optimization cycle
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = OptimizeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    const { force, targetPercent, dryRun } = parsed.data

    console.log(
      `[cache-optimize] Starting optimization cycle (force=${force}, target=${targetPercent}%, dryRun=${dryRun})`
    )

    // Get current cache state
    const { volumeStats, models } = await getCacheData()

    // Check if optimization is needed
    if (!force && !shouldTriggerEviction(volumeStats)) {
      return NextResponse.json({
        success: true,
        message: 'No optimization needed',
        currentUsage: volumeStats.usagePercent,
        threshold: CACHE_CONFIG.HIGH_WATER_MARK
      })
    }

    // Calculate eviction target
    const target = targetPercent ?? CACHE_CONFIG.LOW_WATER_MARK
    const targetBytes = calculateEvictionTarget(volumeStats, target)

    if (targetBytes <= 0) {
      return NextResponse.json({
        success: true,
        message: 'Already below target usage',
        currentUsage: volumeStats.usagePercent,
        targetUsage: target
      })
    }

    // Select models for eviction
    const modelsToEvict = selectModelsForEviction(models, targetBytes)

    if (modelsToEvict.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No models available for eviction',
        reason: 'All models are either pinned, in use, or protected',
        protectedModels: models.filter((m: ModelCacheEntry) => isModelProtected(m)).length,
        totalModels: models.length
      })
    }

    const evictedModels: string[] = []
    const errors: string[] = []
    let reclaimedBytes = 0

    // Execute evictions (unless dry run)
    if (!dryRun) {
      for (const model of modelsToEvict) {
        console.log(
          `[cache-optimize] Evicting model: ${model.modelName} (${(model.size / 1024 / 1024 / 1024).toFixed(
            2
          )}GB, heat: ${model.heatScore.toFixed(3)})`
        )

        const success = await evictModelFromVolume(model.filePath)

        if (success) {
          evictedModels.push(model.modelName)
          reclaimedBytes += model.size
          console.log(`[cache-optimize] Successfully evicted ${model.modelName}`)
        } else {
          errors.push(`Failed to evict ${model.modelName}`)
          console.error(`[cache-optimize] Failed to evict ${model.modelName}`)
        }
      }
    } else {
      // Dry run - just calculate what would be evicted
      evictedModels.push(...modelsToEvict.map(m => m.modelName))
      reclaimedBytes = modelsToEvict.reduce((sum, m) => sum + m.size, 0)
    }

    // Calculate new usage percentage
    const newUsedBytes = volumeStats.usedBytes - reclaimedBytes
    const newUsagePercent = (newUsedBytes / volumeStats.totalBytes) * 100

    const result = EvictionResultSchema.parse({
      success: true,
      evictedModels,
      reclaimedBytes,
      newUsagePercent,
      errors: errors.length > 0 ? errors : undefined
    })

    console.log(
      `[cache-optimize] Optimization complete: evicted ${evictedModels.length} models, reclaimed ${(
        reclaimedBytes /
        1024 /
        1024 /
        1024
      ).toFixed(2)}GB`
    )

    return NextResponse.json({
      ...result,
      dryRun,
      plannedEvictions: modelsToEvict.map(m => ({
        modelName: m.modelName,
        size: m.size,
        heatScore: m.heatScore,
        lastAccessed: m.lastAccessed,
        reason: `Low heat score (${m.heatScore.toFixed(3)})`
      })),
      optimization: {
        startUsage: volumeStats.usagePercent,
        targetUsage: target,
        actualUsage: newUsagePercent,
        targetBytes,
        reclaimedBytes
      }
    })
  } catch (err) {
    console.error('[cache-optimize] Optimization failed:', err)
    const message = err instanceof Error ? err.message : 'Cache optimization failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Get optimization status and recommendations
 */
export async function GET() {
  try {
    const { volumeStats, models } = await getCacheData()

    // Analyze current state
    const protectedModels = models.filter((m: ModelCacheEntry) => isModelProtected(m))
    const evictableModels = models.filter((m: ModelCacheEntry) => !isModelProtected(m))

    // Calculate what would be evicted if triggered now
    const targetBytes = calculateEvictionTarget(volumeStats, CACHE_CONFIG.LOW_WATER_MARK)
    const wouldEvict = selectModelsForEviction(models, targetBytes)

    const recommendations: string[] = []

    if (shouldTriggerEviction(volumeStats)) {
      recommendations.push(
        `Volume usage (${volumeStats.usagePercent.toFixed(1)}%) exceeds threshold (${CACHE_CONFIG.HIGH_WATER_MARK}%)`
      )
      if (wouldEvict.length > 0) {
        recommendations.push(
          `${wouldEvict.length} models could be evicted to reclaim ${(targetBytes / 1024 / 1024 / 1024).toFixed(2)}GB`
        )
      } else {
        recommendations.push('No models available for eviction - consider unpinning or adjusting protection settings')
      }
    } else if (volumeStats.usagePercent > 80) {
      recommendations.push('Volume usage approaching threshold - monitor closely')
    } else {
      recommendations.push('Volume usage is healthy')
    }

    return NextResponse.json({
      success: true,
      status: {
        needsOptimization: shouldTriggerEviction(volumeStats),
        currentUsage: volumeStats.usagePercent,
        thresholds: {
          high: CACHE_CONFIG.HIGH_WATER_MARK,
          low: CACHE_CONFIG.LOW_WATER_MARK
        },
        models: {
          total: models.length,
          protected: protectedModels.length,
          evictable: evictableModels.length,
          wouldEvict: wouldEvict.length
        },
        recommendations
      },
      plannedEvictions: wouldEvict.slice(0, 10).map(m => ({
        modelName: m.modelName,
        size: m.size,
        heatScore: m.heatScore,
        lastAccessed: m.lastAccessed,
        type: m.type
      }))
    })
  } catch (err) {
    console.error('[cache-optimize] Status check failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to get optimization status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
