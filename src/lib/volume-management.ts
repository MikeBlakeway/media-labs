/**
 * Volume Management Service
 *
 * Implements intelligent volume management including:
 * - LRU (Least Recently Used) eviction strategy
 * - Model usage tracking and analytics
 * - Volume utilization monitoring
 * - Automatic cleanup when approaching capacity limits
 */

// Volume configuration constants
const VOLUME_PATH = '/runpod-volume'

// Types for volume management
export type ModelUsage = {
  modelPath: string
  modelType: string
  lastUsed: string
  accessCount: number
  totalBytes: number
  createdAt: string
  isProtected?: boolean
}

export type VolumeStats = {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  utilizationPercent: number
  modelCount: number
  oldestModel?: string
  newestModel?: string
}

// Configuration for volume management
export interface VolumeManagementConfig {
  maxUtilizationPercent: number // Trigger cleanup at this threshold (default: 90%)
  targetUtilizationPercent: number // Clean down to this level (default: 80%)
  minRetentionHours: number // Never evict models accessed within this time (default: 24)
  protectedModels: string[] // Models that should never be evicted
  enableAutoCleanup: boolean // Whether to automatically trigger cleanup
}

export class VolumeManagementService {
  private config: VolumeManagementConfig
  private usageTracker = new Map<string, ModelUsage>()
  private lastStatsUpdate: Date | null = null
  private cachedStats: VolumeStats | null = null

  constructor(config: Partial<VolumeManagementConfig> = {}) {
    this.config = {
      maxUtilizationPercent: 90,
      targetUtilizationPercent: 80,
      minRetentionHours: 24,
      protectedModels: [
        'models/checkpoints/sd-v1-5.safetensors',
        'models/clip/clip_l.safetensors',
        'models/vae/ae.safetensors'
      ],
      enableAutoCleanup: true,
      ...config
    }
  }

  /**
   * Record model usage to update access patterns
   */
  async recordModelUsage(modelPath: string, modelType: string, sizeBytes: number): Promise<void> {
    const now = new Date().toISOString()
    const existing = this.usageTracker.get(modelPath)

    const usage: ModelUsage = {
      modelPath,
      modelType,
      lastUsed: now,
      accessCount: existing ? existing.accessCount + 1 : 1,
      totalBytes: sizeBytes,
      createdAt: existing?.createdAt || now,
      isProtected: this.config.protectedModels.includes(modelPath)
    }

    this.usageTracker.set(modelPath, usage)
    console.log(`[VolumeManagement] Recorded usage for ${modelPath}: ${usage.accessCount} accesses`)

    // Check if we need to trigger cleanup
    if (this.config.enableAutoCleanup) {
      void this.checkAndCleanup()
    }
  }

  /**
   * Get current volume statistics
   */
  async getVolumeStats(): Promise<VolumeStats> {
    // Use cached stats if updated within last 5 minutes
    if (this.cachedStats && this.lastStatsUpdate && Date.now() - this.lastStatsUpdate.getTime() < 5 * 60 * 1000) {
      return this.cachedStats
    }

    try {
      // Call volume worker to get disk usage stats
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'df',
          args: { paths: [VOLUME_PATH] }
        })
      })

      if (!response.ok) {
        throw new Error(`Volume stats API error: ${response.status}`)
      }

      const result = await response.json()

      if (!result.ok) {
        throw new Error(result.error || 'Failed to get volume stats')
      }

      // Extract stats from volume worker response
      const volumePath = result.usage?.find((u: { path: string }) => u.path === VOLUME_PATH)
      if (!volumePath) {
        throw new Error('Volume path not found in disk usage results')
      }

      const totalBytes = volumePath.totalBytes || 64 * 1024 * 1024 * 1024 // 64GB default
      const usedBytes = volumePath.usedBytes || 0
      const availableBytes = totalBytes - usedBytes
      const utilizationPercent = (usedBytes / totalBytes) * 100

      // Get model statistics from usage tracker
      const usageValues = Array.from(this.usageTracker.values())
      const modelCount = usageValues.length
      const oldestModel =
        usageValues.length > 0
          ? usageValues.reduce((oldest, current) => (current.createdAt < oldest.createdAt ? current : oldest)).createdAt
          : undefined
      const newestModel =
        usageValues.length > 0
          ? usageValues.reduce((newest, current) => (current.createdAt > newest.createdAt ? current : newest)).createdAt
          : undefined

      const stats: VolumeStats = {
        totalBytes,
        usedBytes,
        availableBytes,
        utilizationPercent,
        modelCount,
        oldestModel,
        newestModel
      }

      // Cache the results
      this.cachedStats = stats
      this.lastStatsUpdate = new Date()

      return stats
    } catch (error) {
      console.error('[VolumeManagement] Failed to get volume stats:', error)

      // Return fallback stats
      return {
        totalBytes: 64 * 1024 * 1024 * 1024, // 64GB
        usedBytes: 0,
        availableBytes: 64 * 1024 * 1024 * 1024,
        utilizationPercent: 0,
        modelCount: this.usageTracker.size,
        oldestModel: undefined,
        newestModel: undefined
      }
    }
  }

  /**
   * Check if cleanup is needed and perform it
   */
  async checkAndCleanup(): Promise<{ needed: boolean; executed: boolean; freedBytes?: number }> {
    const stats = await this.getVolumeStats()

    if (stats.utilizationPercent < this.config.maxUtilizationPercent) {
      return { needed: false, executed: false }
    }

    console.log(`[VolumeManagement] Volume utilization at ${stats.utilizationPercent.toFixed(1)}%, triggering cleanup`)

    try {
      const freedBytes = await this.performLRUEviction(stats)
      return { needed: true, executed: true, freedBytes }
    } catch (error) {
      console.error('[VolumeManagement] Cleanup failed:', error)
      return { needed: true, executed: false }
    }
  }

  /**
   * Perform LRU eviction to free up space
   */
  private async performLRUEviction(stats: VolumeStats): Promise<number> {
    const now = new Date()
    const minRetentionTime = new Date(now.getTime() - this.config.minRetentionHours * 60 * 60 * 1000)

    // Get evictable models sorted by LRU (oldest first)
    const evictableCandidates = Array.from(this.usageTracker.values())
      .filter(usage => {
        // Skip protected models
        if (usage.isProtected) return false

        // Skip recently accessed models
        if (new Date(usage.lastUsed) > minRetentionTime) return false

        return true
      })
      .sort((a, b) => {
        // Sort by access time (oldest first), then by access count (least used first)
        const timeDiff = new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime()
        if (timeDiff !== 0) return timeDiff
        return a.accessCount - b.accessCount
      })

    if (evictableCandidates.length === 0) {
      console.warn('[VolumeManagement] No evictable models found')
      return 0
    }

    // Calculate how much space we need to free
    const targetBytes = stats.totalBytes * (this.config.targetUtilizationPercent / 100)
    const bytesToFree = stats.usedBytes - targetBytes

    console.log(`[VolumeManagement] Need to free ${(bytesToFree / 1024 / 1024).toFixed(1)} MB`)

    let freedBytes = 0
    const evictedModels: string[] = []

    for (const candidate of evictableCandidates) {
      if (freedBytes >= bytesToFree) break

      try {
        // Remove model from volume
        await this.evictModel(candidate.modelPath)
        freedBytes += candidate.totalBytes
        evictedModels.push(candidate.modelPath)
        this.usageTracker.delete(candidate.modelPath)

        console.log(
          `[VolumeManagement] Evicted ${candidate.modelPath} (${(candidate.totalBytes / 1024 / 1024).toFixed(1)} MB)`
        )
      } catch (error) {
        console.error(`[VolumeManagement] Failed to evict ${candidate.modelPath}:`, error)
      }
    }

    console.log(
      `[VolumeManagement] Eviction complete: freed ${(freedBytes / 1024 / 1024).toFixed(1)} MB from ${
        evictedModels.length
      } models`
    )

    // Invalidate cached stats
    this.cachedStats = null
    this.lastStatsUpdate = null

    return freedBytes
  }

  /**
   * Evict a specific model from the volume
   */
  private async evictModel(modelPath: string): Promise<void> {
    const response = await fetch('/api/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'rm',
        args: {
          paths: [`${VOLUME_PATH}/${modelPath}`],
          dryRun: false
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Volume eviction API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.ok) {
      throw new Error(result.error || 'Model eviction failed')
    }
  }

  /**
   * Get usage analytics for models
   */
  getUsageAnalytics(): {
    totalModels: number
    protectedModels: number
    evictableModels: number
    mostUsed: ModelUsage[]
    leastUsed: ModelUsage[]
    recentlyAccessed: ModelUsage[]
  } {
    const allUsage = Array.from(this.usageTracker.values())
    const now = new Date()
    const recentThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours

    return {
      totalModels: allUsage.length,
      protectedModels: allUsage.filter(u => u.isProtected).length,
      evictableModels: allUsage.filter(u => !u.isProtected && new Date(u.lastUsed) < recentThreshold).length,
      mostUsed: allUsage.sort((a, b) => b.accessCount - a.accessCount).slice(0, 10),
      leastUsed: allUsage.sort((a, b) => a.accessCount - b.accessCount).slice(0, 10),
      recentlyAccessed: allUsage
        .filter(u => new Date(u.lastUsed) > recentThreshold)
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    }
  }

  /**
   * Manually trigger cleanup
   */
  async forceCleanup(): Promise<{ freedBytes: number; evictedModels: number }> {
    const stats = await this.getVolumeStats()
    const freedBytes = await this.performLRUEviction(stats)
    const evictedModels = stats.modelCount - (await this.getVolumeStats()).modelCount

    return { freedBytes, evictedModels }
  }

  /**
   * Add a model to the protected list
   */
  protectModel(modelPath: string): void {
    if (!this.config.protectedModels.includes(modelPath)) {
      this.config.protectedModels.push(modelPath)
    }

    // Update the usage tracker if model exists
    const usage = this.usageTracker.get(modelPath)
    if (usage) {
      usage.isProtected = true
      this.usageTracker.set(modelPath, usage)
    }
  }

  /**
   * Remove a model from the protected list
   */
  unprotectModel(modelPath: string): void {
    this.config.protectedModels = this.config.protectedModels.filter(p => p !== modelPath)

    // Update the usage tracker if model exists
    const usage = this.usageTracker.get(modelPath)
    if (usage) {
      usage.isProtected = false
      this.usageTracker.set(modelPath, usage)
    }
  }
}

// Global instance
export const volumeManagement = new VolumeManagementService()
