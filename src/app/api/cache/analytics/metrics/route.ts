import { NextRequest, NextResponse } from 'next/server'
import { ModelCacheEntrySchema, VolumeStatsSchema, calculateHeatScore, type ModelCacheEntry } from '@/lib/cache-manager'

interface ModelData {
  name: string
  heatScore: number
  type: string
  size: number
  isPinned: boolean
  isInUse: boolean
}

export const runtime = 'nodejs'

// In-memory storage for metrics tracking
// In production, this would be replaced with a persistent database
const metricsData = {
  cacheHits: 0,
  cacheMisses: 0,
  totalEvictions: 0,
  totalReclaimed: 0,
  lastUpdated: new Date()
}

// Shared in-memory cache storage (same as cache/status endpoint)
const modelCache = new Map<string, ModelCacheEntry>()

/**
 * Get sample volume statistics (matches cache/status logic)
 */
async function getVolumeStats() {
  try {
    console.log('[cache-metrics] Using fallback volume stats')
    return VolumeStatsSchema.parse({
      totalBytes: 64424509440, // 60GB default
      usedBytes: Math.floor(64424509440 * 0.45), // 45% usage as example
      freeBytes: Math.floor(64424509440 * 0.55),
      usagePercent: 45.0
    })
  } catch (err) {
    console.error('Failed to get volume stats:', err)
    return VolumeStatsSchema.parse({
      totalBytes: 64424509440,
      usedBytes: 0,
      freeBytes: 64424509440,
      usagePercent: 0
    })
  }
}

/**
 * Get sample models data (matches cache/status logic)
 */
async function getModelsData() {
  try {
    // Sample model data (matches cache/status endpoint)
    const sampleModels = [
      {
        modelName: 'flux1-dev.safetensors',
        filePath: '/runpod-volume/models/unet/flux1-dev.safetensors',
        size: 12000000000, // 12GB
        lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        accessCount: 15,
        isPinned: true,
        isInUse: false,
        type: 'unet'
      },
      {
        modelName: 'clip_l.safetensors',
        filePath: '/runpod-volume/models/clip/clip_l.safetensors',
        size: 1200000000, // 1.2GB
        lastAccessed: new Date(Date.now() - 30 * 60 * 1000),
        accessCount: 8,
        isPinned: false,
        isInUse: true,
        type: 'clip'
      },
      {
        modelName: 'sdxl_vae.safetensors',
        filePath: '/runpod-volume/models/vae/sdxl_vae.safetensors',
        size: 600000000, // 600MB
        lastAccessed: new Date(Date.now() - 6 * 60 * 60 * 1000),
        accessCount: 3,
        isPinned: false,
        isInUse: false,
        type: 'vae'
      }
    ]

    const models = sampleModels.map(model => {
      let cacheEntry = modelCache.get(model.modelName)
      if (!cacheEntry) {
        cacheEntry = {
          ...model,
          heatScore: 0,
          type: model.type as ModelCacheEntry['type']
        }
      } else {
        Object.assign(cacheEntry, { ...model, type: model.type as ModelCacheEntry['type'] })
      }

      // Calculate heat score
      cacheEntry.heatScore = calculateHeatScore(cacheEntry)
      modelCache.set(model.modelName, cacheEntry)

      return ModelCacheEntrySchema.parse(cacheEntry)
    })

    return models
  } catch (err) {
    console.error('Failed to get models:', err)
    return []
  }
}

/**
 * Get cache efficiency metrics
 */
export async function GET() {
  try {
    // Get current cache status directly (avoiding server-side fetch issues)
    const volumeStats = await getVolumeStats()
    const cacheModels = await getModelsData()

    // Convert to analytics format
    const models: ModelData[] = cacheModels.map(model => ({
      name: model.modelName,
      heatScore: model.heatScore,
      type: model.type,
      size: model.size,
      isPinned: model.isPinned,
      isInUse: model.isInUse
    }))

    // Create data structure to match expected format
    const data = {
      success: true,
      data: {
        models,
        totalModels: models.length,
        totalSize: models.reduce((sum, model) => sum + model.size, 0),
        pinnedModels: models.filter(m => m.isPinned).length,
        inUseModels: models.filter(m => m.isInUse).length
      },
      cacheStatus: {
        volumeStats
      }
    } // Calculate average heat score
    const averageHeatScore =
      models.length > 0 ? models.reduce((sum: number, model: ModelData) => sum + model.heatScore, 0) / models.length : 0

    // Calculate hit/miss ratios
    const totalRequests = metricsData.cacheHits + metricsData.cacheMisses
    const hitRatio = totalRequests > 0 ? (metricsData.cacheHits / totalRequests) * 100 : 0
    const missRatio = totalRequests > 0 ? (metricsData.cacheMisses / totalRequests) * 100 : 0

    // Calculate model distribution by type
    const modelDistribution = models.reduce((acc: Record<string, number>, model: ModelData) => {
      acc[model.type] = (acc[model.type] || 0) + 1
      return acc
    }, {})

    // Calculate size distribution
    const totalSize = models.reduce((sum: number, model: ModelData) => sum + model.size, 0)
    const averageModelSize = models.length > 0 ? totalSize / models.length : 0

    // Heat score distribution
    const heatScoreRanges = {
      very_low: models.filter((m: ModelData) => m.heatScore < 0.2).length,
      low: models.filter((m: ModelData) => m.heatScore >= 0.2 && m.heatScore < 0.5).length,
      medium: models.filter((m: ModelData) => m.heatScore >= 0.5 && m.heatScore < 0.8).length,
      high: models.filter((m: ModelData) => m.heatScore >= 0.8 && m.heatScore < 1.2).length,
      very_high: models.filter((m: ModelData) => m.heatScore >= 1.2).length
    }

    const metrics = {
      hitRatio,
      missRatio,
      averageHeatScore,
      totalEvictions: metricsData.totalEvictions,
      totalReclaimed: metricsData.totalReclaimed,
      modelCount: models.length,
      pinnedModels: models.filter((m: ModelData) => m.isPinned).length,
      inUseModels: models.filter((m: ModelData) => m.isInUse).length,
      modelDistribution,
      heatScoreRanges,
      sizeMetrics: {
        totalSize,
        averageSize: averageModelSize,
        totalSizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
        averageSizeGB: (averageModelSize / 1024 / 1024 / 1024).toFixed(2)
      },
      efficiency: {
        storageUtilization: data.cacheStatus?.volumeStats?.usagePercent || 0,
        cacheEfficiency: hitRatio,
        evictionEfficiency:
          metricsData.totalEvictions > 0
            ? (metricsData.totalReclaimed / 1024 / 1024 / 1024).toFixed(2) + 'GB per eviction cycle'
            : 'No evictions yet'
      },
      lastUpdated: metricsData.lastUpdated
    }

    return NextResponse.json({
      success: true,
      metrics
    })
  } catch (err) {
    console.error('[cache-metrics] Failed to get metrics:', err)
    const message = err instanceof Error ? err.message : 'Failed to get cache metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Update metrics (used internally by cache system)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate metrics update
    const updates = {
      cacheHits: typeof body.cacheHits === 'number' ? body.cacheHits : undefined,
      cacheMisses: typeof body.cacheMisses === 'number' ? body.cacheMisses : undefined,
      totalEvictions: typeof body.totalEvictions === 'number' ? body.totalEvictions : undefined,
      totalReclaimed: typeof body.totalReclaimed === 'number' ? body.totalReclaimed : undefined
    }

    // Apply updates
    if (updates.cacheHits !== undefined) {
      metricsData.cacheHits += updates.cacheHits
    }
    if (updates.cacheMisses !== undefined) {
      metricsData.cacheMisses += updates.cacheMisses
    }
    if (updates.totalEvictions !== undefined) {
      metricsData.totalEvictions += updates.totalEvictions
    }
    if (updates.totalReclaimed !== undefined) {
      metricsData.totalReclaimed += updates.totalReclaimed
    }

    metricsData.lastUpdated = new Date()

    console.log('[cache-metrics] Metrics updated:', updates)

    return NextResponse.json({
      success: true,
      metrics: metricsData
    })
  } catch (err) {
    console.error('[cache-metrics] Failed to update metrics:', err)
    const message = err instanceof Error ? err.message : 'Failed to update metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
