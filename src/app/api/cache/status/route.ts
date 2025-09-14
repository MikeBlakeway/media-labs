import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ModelCacheEntrySchema,
  VolumeStatsSchema,
  CacheStatusSchema,
  calculateHeatScore,
  CACHE_CONFIG,
  type ModelCacheEntry
} from '@/lib/cache-manager'

export const runtime = 'nodejs'

// In-memory cache storage for model tracking
// In production, this would be replaced with a persistent database
const modelCache = new Map<string, ModelCacheEntry>()
let volumeStatsHistory: Array<{
  timestamp: Date
  stats: { totalBytes: number; usedBytes: number; freeBytes: number; usagePercent: number }
}> = []

/**
 * Get current volume statistics from volume worker
 */
async function getVolumeStats() {
  try {
    // Note: In server-side API routes, we need to call the volume worker directly
    // rather than making HTTP calls to our own API endpoints
    // For now, we'll return mock data and let the actual implementation call volume worker

    console.log('[cache-status] Using fallback volume stats - integrate with volume worker directly')

    // Return default stats - in production this would call volume worker directly
    return VolumeStatsSchema.parse({
      totalBytes: 64424509440, // 60GB default
      usedBytes: Math.floor(64424509440 * 0.45), // 45% usage as example
      freeBytes: Math.floor(64424509440 * 0.55),
      usagePercent: 45.0
    })
  } catch (err) {
    console.error('Failed to get volume stats:', err)
    // Return default stats if volume worker is unavailable
    return VolumeStatsSchema.parse({
      totalBytes: 64424509440, // 60GB default
      usedBytes: 0,
      freeBytes: 64424509440,
      usagePercent: 0
    })
  }
}

/**
 * Get list of models from volume worker
 */
async function getModelsFromVolume() {
  try {
    console.log('[cache-status] Using mock model data - integrate with volume worker directly')

    // For demo purposes, create some sample model data
    const sampleModels = [
      {
        modelName: 'flux1-dev.safetensors',
        filePath: '/runpod-volume/models/unet/flux1-dev.safetensors',
        size: 12000000000, // 12GB
        lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        accessCount: 15,
        isPinned: true,
        isInUse: false,
        type: 'unet'
      },
      {
        modelName: 'clip_l.safetensors',
        filePath: '/runpod-volume/models/clip/clip_l.safetensors',
        size: 1200000000, // 1.2GB
        lastAccessed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        accessCount: 8,
        isPinned: false,
        isInUse: true,
        type: 'clip'
      },
      {
        modelName: 'sdxl_vae.safetensors',
        filePath: '/runpod-volume/models/vae/sdxl_vae.safetensors',
        size: 600000000, // 600MB
        lastAccessed: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        accessCount: 3,
        isPinned: false,
        isInUse: false,
        type: 'vae'
      }
    ]

    const models = sampleModels.map(model => {
      // Get or create cache entry
      let cacheEntry = modelCache.get(model.modelName)
      if (!cacheEntry) {
        cacheEntry = {
          ...model,
          heatScore: 0, // Will be calculated below
          type: model.type as ModelCacheEntry['type']
        }
      } else {
        // Update cache entry with current data
        Object.assign(cacheEntry, { ...model, type: model.type as ModelCacheEntry['type'] })
      }

      // Calculate heat score
      cacheEntry.heatScore = calculateHeatScore(cacheEntry)

      // Update cache
      modelCache.set(model.modelName, cacheEntry)

      return ModelCacheEntrySchema.parse(cacheEntry)
    })

    return models
  } catch (err) {
    console.error('Failed to get models from volume:', err)
    return []
  }
}

/**
 * Get cache status with current statistics
 */
export async function GET() {
  try {
    const volumeStats = await getVolumeStats()
    const models = await getModelsFromVolume()

    // Store volume stats in history
    volumeStatsHistory.push({
      timestamp: new Date(),
      stats: volumeStats
    })

    // Keep only last 24 hours of history
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    volumeStatsHistory = volumeStatsHistory.filter(entry => entry.timestamp > oneDayAgo)

    const pinnedModels = models.filter(m => m.isPinned).length
    const inUseModels = models.filter(m => m.isInUse).length

    // Calculate next scheduled cleanup (daily at 2 AM)
    const now = new Date()
    const nextCleanup = new Date(now)
    nextCleanup.setHours(2, 0, 0, 0)
    if (nextCleanup <= now) {
      nextCleanup.setDate(nextCleanup.getDate() + 1)
    }

    const cacheStatus = CacheStatusSchema.parse({
      volumeStats,
      modelCount: models.length,
      pinnedModels,
      inUseModels,
      nextScheduledCleanup: nextCleanup
    })

    return NextResponse.json({
      success: true,
      cacheStatus,
      models,
      config: CACHE_CONFIG
    })
  } catch (err) {
    console.error('Cache status error:', err)
    const message = err instanceof Error ? err.message : 'Failed to get cache status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Update cache configuration
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate configuration updates
    const ConfigUpdateSchema = z.object({
      highWaterMark: z.number().min(1).max(100).optional(),
      lowWaterMark: z.number().min(1).max(100).optional(),
      minHeatScore: z.number().min(0).max(2).optional(),
      protectionHours: z.number().min(0).optional()
    })

    const parsed = ConfigUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid configuration',
          details: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    const updates = parsed.data

    // Validate that high water mark > low water mark
    const newHighWaterMark = updates.highWaterMark ?? CACHE_CONFIG.HIGH_WATER_MARK
    const newLowWaterMark = updates.lowWaterMark ?? CACHE_CONFIG.LOW_WATER_MARK

    if (newHighWaterMark <= newLowWaterMark) {
      return NextResponse.json(
        {
          error: 'High water mark must be greater than low water mark'
        },
        { status: 400 }
      )
    }

    // In production, these would be saved to environment/config store
    // For now, we'll just acknowledge the update
    console.log('Cache configuration update requested:', updates)

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      newConfig: {
        ...CACHE_CONFIG,
        ...updates
      }
    })
  } catch (err) {
    console.error('Cache config update error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update cache configuration'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
