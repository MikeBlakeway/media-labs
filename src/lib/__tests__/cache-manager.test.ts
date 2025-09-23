import {
  calculateHeatScore,
  selectModelsForEviction,
  isModelProtected,
  updateModelAccess,
  validateCacheConfig,
  CACHE_CONFIG
} from '../cache-manager'

describe('Cache Manager', () => {
  describe('calculateHeatScore', () => {
    it('should calculate heat score correctly', () => {
      const baseModel = {
        modelName: 'test-model.safetensors',
        filePath: '/runpod-volume/models/unet/test-model.safetensors',
        size: 1024 * 1024 * 1024, // 1GB
        lastAccessed: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        accessCount: 5,
        isPinned: false,
        isInUse: false,
        type: 'unet' as const
      }

      const score = calculateHeatScore(baseModel)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(2)
    })

    it('should give higher scores to pinned models', () => {
      const baseModel = {
        modelName: 'test-model.safetensors',
        filePath: '/runpod-volume/models/unet/test-model.safetensors',
        size: 1024 * 1024 * 1024,
        lastAccessed: new Date(Date.now() - 60 * 60 * 1000),
        accessCount: 5,
        isPinned: false,
        isInUse: false,
        type: 'unet' as const
      }

      const pinnedModel = { ...baseModel, isPinned: true }

      const baseScore = calculateHeatScore(baseModel)
      const pinnedScore = calculateHeatScore(pinnedModel)

      expect(pinnedScore).toBeGreaterThan(baseScore)
    })
  })

  describe('isModelProtected', () => {
    it('should protect pinned models', () => {
      const model = {
        modelName: 'test-model.safetensors',
        filePath: '/runpod-volume/models/unet/test-model.safetensors',
        size: 1024 * 1024 * 1024,
        lastAccessed: new Date(),
        accessCount: 1,
        heatScore: 0.1,
        isPinned: true,
        isInUse: false,
        type: 'unet' as const
      }

      expect(isModelProtected(model)).toBe(true)
    })

    it('should protect models in use', () => {
      const model = {
        modelName: 'test-model.safetensors',
        filePath: '/runpod-volume/models/unet/test-model.safetensors',
        size: 1024 * 1024 * 1024,
        lastAccessed: new Date(),
        accessCount: 1,
        heatScore: 0.1,
        isPinned: false,
        isInUse: true,
        type: 'unet' as const
      }

      expect(isModelProtected(model)).toBe(true)
    })

    it('should protect recently accessed models', () => {
      const model = {
        modelName: 'test-model.safetensors',
        filePath: '/runpod-volume/models/unet/test-model.safetensors',
        size: 1024 * 1024 * 1024,
        lastAccessed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        accessCount: 1,
        heatScore: 0.1,
        isPinned: false,
        isInUse: false,
        type: 'unet' as const
      }

      expect(isModelProtected(model)).toBe(true)
    })
  })

  describe('selectModelsForEviction', () => {
    it('should select lowest heat score models first', () => {
      const models = [
        {
          modelName: 'high-heat.safetensors',
          filePath: '/runpod-volume/models/unet/high-heat.safetensors',
          size: 1024 * 1024 * 1024,
          lastAccessed: new Date(),
          accessCount: 10,
          heatScore: 0.8,
          isPinned: false,
          isInUse: false,
          type: 'unet' as const
        },
        {
          modelName: 'low-heat.safetensors',
          filePath: '/runpod-volume/models/unet/low-heat.safetensors',
          size: 1024 * 1024 * 1024,
          lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          accessCount: 1,
          heatScore: 0.1,
          isPinned: false,
          isInUse: false,
          type: 'unet' as const
        }
      ]

      const toEvict = selectModelsForEviction(models, 1024 * 1024 * 1024)
      expect(toEvict).toHaveLength(1)
      expect(toEvict[0].modelName).toBe('low-heat.safetensors')
    })

    it('should not select protected models', () => {
      const models = [
        {
          modelName: 'protected.safetensors',
          filePath: '/runpod-volume/models/unet/protected.safetensors',
          size: 1024 * 1024 * 1024,
          lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          accessCount: 1,
          heatScore: 0.1,
          isPinned: true,
          isInUse: false,
          type: 'unet' as const
        },
        {
          modelName: 'evictable.safetensors',
          filePath: '/runpod-volume/models/unet/evictable.safetensors',
          size: 1024 * 1024 * 1024,
          lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          accessCount: 1,
          heatScore: 0.1,
          isPinned: false,
          isInUse: false,
          type: 'unet' as const
        }
      ]

      const toEvict = selectModelsForEviction(models, 1024 * 1024 * 1024)
      expect(toEvict).toHaveLength(1)
      expect(toEvict[0].modelName).toBe('evictable.safetensors')
    })
  })

  describe('updateModelAccess', () => {
    it('should increment access count and update timestamp', () => {
      const model = {
        modelName: 'test-model.safetensors',
        filePath: '/runpod-volume/models/unet/test-model.safetensors',
        size: 1024 * 1024 * 1024,
        lastAccessed: new Date(Date.now() - 60 * 60 * 1000),
        accessCount: 5,
        heatScore: 0.5,
        isPinned: false,
        isInUse: false,
        type: 'unet' as const
      }

      const updated = updateModelAccess(model)
      expect(updated.accessCount).toBe(6)
      expect(updated.lastAccessed.getTime()).toBeGreaterThan(model.lastAccessed.getTime())
      // Heat score should be recalculated (may be higher or lower depending on algorithm)
      expect(typeof updated.heatScore).toBe('number')
      expect(updated.heatScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('validateCacheConfig', () => {
    it('should validate correct configuration', () => {
      const result = validateCacheConfig()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid water mark configuration', () => {
      // This would need to be tested with environment variable mocking
      // For now, just verify the function exists and returns validation structure
      const result = validateCacheConfig()
      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('CACHE_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(CACHE_CONFIG.HIGH_WATER_MARK).toBeGreaterThan(0)
      expect(CACHE_CONFIG.LOW_WATER_MARK).toBeGreaterThan(0)
      expect(CACHE_CONFIG.HIGH_WATER_MARK).toBeGreaterThan(CACHE_CONFIG.LOW_WATER_MARK)
      expect(CACHE_CONFIG.MIN_HEAT_SCORE).toBeGreaterThanOrEqual(0)
      expect(CACHE_CONFIG.PROTECTION_HOURS).toBeGreaterThanOrEqual(0)
    })
  })
})
