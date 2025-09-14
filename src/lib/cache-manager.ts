import { z } from 'zod'

// Configuration constants from environment
export const CACHE_CONFIG = {
  HIGH_WATER_MARK: parseInt(process.env.CACHE_HIGH_WATER_MARK ?? '90'), // Trigger eviction at 90% usage
  LOW_WATER_MARK: parseInt(process.env.CACHE_LOW_WATER_MARK ?? '75'), // Stop eviction at 75% usage
  MIN_HEAT_SCORE: parseFloat(process.env.CACHE_MIN_HEAT_SCORE ?? '0.1'), // Minimum score to keep model
  PROTECTION_HOURS: parseInt(process.env.CACHE_PROTECTION_HOURS ?? '24'), // Protect recently accessed models
  CLEANUP_SCHEDULE: process.env.CACHE_CLEANUP_SCHEDULE ?? '0 2 * * *' // Daily cleanup at 2 AM
} as const

// Schema definitions
export const ModelCacheEntrySchema = z.object({
  modelName: z.string(),
  filePath: z.string(),
  size: z.number(),
  lastAccessed: z.date(),
  accessCount: z.number(),
  heatScore: z.number(),
  isPinned: z.boolean(),
  isInUse: z.boolean(),
  type: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints'])
})

export type ModelCacheEntry = z.infer<typeof ModelCacheEntrySchema>

export const VolumeStatsSchema = z.object({
  totalBytes: z.number(),
  usedBytes: z.number(),
  freeBytes: z.number(),
  usagePercent: z.number()
})

export type VolumeStats = z.infer<typeof VolumeStatsSchema>

export const CacheStatusSchema = z.object({
  volumeStats: VolumeStatsSchema,
  modelCount: z.number(),
  pinnedModels: z.number(),
  inUseModels: z.number(),
  lastOptimization: z.date().optional(),
  nextScheduledCleanup: z.date().optional()
})

export type CacheStatus = z.infer<typeof CacheStatusSchema>

export const EvictionResultSchema = z.object({
  success: z.boolean(),
  evictedModels: z.array(z.string()),
  reclaimedBytes: z.number(),
  newUsagePercent: z.number(),
  errors: z.array(z.string()).optional()
})

export type EvictionResult = z.infer<typeof EvictionResultSchema>

/**
 * Calculate model heat score based on usage patterns
 * score = (accessCount * 0.4) + (recency * 0.3) + (size penalty * -0.2) + (pin bonus * 0.5)
 */
export function calculateHeatScore(entry: Omit<ModelCacheEntry, 'heatScore'>): number {
  const now = new Date()
  const hoursSinceAccess = (now.getTime() - entry.lastAccessed.getTime()) / (1000 * 60 * 60)
  
  // Recency score: higher for recently accessed models (max 1.0, decays over 7 days)
  const recencyScore = Math.max(0, Math.min(1, 1 - hoursSinceAccess / (7 * 24)))
  
  // Access count score: logarithmic scaling (max 1.0 at 100+ accesses)
  const accessScore = Math.min(1, Math.log10(entry.accessCount + 1) / 2)
  
  // Size penalty: larger models get lower scores (normalize to GB, penalty up to -0.5)
  const sizeGB = entry.size / (1024 * 1024 * 1024)
  const sizePenalty = Math.min(0.5, sizeGB / 20) // 20GB = max penalty
  
  // Pin bonus: pinned models get significant boost
  const pinBonus = entry.isPinned ? 0.5 : 0
  
  // In-use bonus: models currently in use get protection
  const inUseBonus = entry.isInUse ? 1.0 : 0
  
  const score = (accessScore * 0.4) + (recencyScore * 0.3) + (-sizePenalty * 0.2) + pinBonus + inUseBonus
  
  return Math.max(0, Math.min(2, score)) // Clamp between 0 and 2
}

/**
 * Determine if a model should be protected from eviction
 */
export function isModelProtected(entry: ModelCacheEntry): boolean {
  // Never evict pinned or in-use models
  if (entry.isPinned || entry.isInUse) {
    return true
  }
  
  // Protect recently accessed models (within protection window)
  const now = new Date()
  const hoursSinceAccess = (now.getTime() - entry.lastAccessed.getTime()) / (1000 * 60 * 60)
  if (hoursSinceAccess < CACHE_CONFIG.PROTECTION_HOURS) {
    return true
  }
  
  // Protect models with high heat scores
  if (entry.heatScore >= CACHE_CONFIG.MIN_HEAT_SCORE * 10) {
    return true
  }
  
  return false
}

/**
 * LRU eviction algorithm with heat score consideration
 * Returns list of models to evict, sorted by priority (least valuable first)
 */
export function selectModelsForEviction(
  models: ModelCacheEntry[],
  targetBytes: number
): ModelCacheEntry[] {
  // Filter out protected models
  const evictableModels = models.filter(model => !isModelProtected(model))
  
  // Sort by eviction priority: lowest heat score first, then by last accessed time
  evictableModels.sort((a, b) => {
    if (a.heatScore !== b.heatScore) {
      return a.heatScore - b.heatScore // Lower heat score = higher eviction priority
    }
    return a.lastAccessed.getTime() - b.lastAccessed.getTime() // Older = higher eviction priority
  })
  
  // Select models until we reach target bytes
  const toEvict: ModelCacheEntry[] = []
  let reclaimedBytes = 0
  
  for (const model of evictableModels) {
    if (reclaimedBytes >= targetBytes) {
      break
    }
    toEvict.push(model)
    reclaimedBytes += model.size
  }
  
  return toEvict
}

/**
 * Calculate how many bytes need to be reclaimed to reach target usage
 */
export function calculateEvictionTarget(volumeStats: VolumeStats, targetPercent: number): number {
  const targetUsageBytes = (volumeStats.totalBytes * targetPercent) / 100
  const excessBytes = volumeStats.usedBytes - targetUsageBytes
  return Math.max(0, excessBytes)
}

/**
 * Check if eviction should be triggered based on current volume usage
 */
export function shouldTriggerEviction(volumeStats: VolumeStats): boolean {
  return volumeStats.usagePercent >= CACHE_CONFIG.HIGH_WATER_MARK
}

/**
 * Update model access tracking
 */
export function updateModelAccess(entry: ModelCacheEntry): ModelCacheEntry {
  const updated = {
    ...entry,
    lastAccessed: new Date(),
    accessCount: entry.accessCount + 1
  }
  
  // Recalculate heat score with new access data
  updated.heatScore = calculateHeatScore(updated)
  
  return updated
}

/**
 * Validate cache configuration
 */
export function validateCacheConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (CACHE_CONFIG.HIGH_WATER_MARK <= CACHE_CONFIG.LOW_WATER_MARK) {
    errors.push('HIGH_WATER_MARK must be greater than LOW_WATER_MARK')
  }
  
  if (CACHE_CONFIG.HIGH_WATER_MARK > 100 || CACHE_CONFIG.LOW_WATER_MARK > 100) {
    errors.push('Water mark values must be <= 100')
  }
  
  if (CACHE_CONFIG.MIN_HEAT_SCORE < 0 || CACHE_CONFIG.MIN_HEAT_SCORE > 2) {
    errors.push('MIN_HEAT_SCORE must be between 0 and 2')
  }
  
  if (CACHE_CONFIG.PROTECTION_HOURS < 0) {
    errors.push('PROTECTION_HOURS must be >= 0')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}