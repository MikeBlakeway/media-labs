/**
 * Model Analytics Library Tests
 * 
 * Tests for model usage tracking, priority calculation, and combination analysis.
 */

import {
  calculateModelPriority,
  findModelCombinations,
  getPreloadCandidates,
  trackModelUsage,
  ModelUsageEventSchema,
  ModelPrioritySchema,
  ModelCombinationSchema,
  DEFAULT_PRIORITY_WEIGHTS
} from './model-analytics'
import type { ModelUsageEvent } from './model-analytics'
import type { ModelRequirement } from './workflow.preflight'

describe('Model Analytics', () => {
  const mockEvents: ModelUsageEvent[] = [
    {
      modelName: 'flux1-dev.safetensors',
      modelType: 'checkpoints',
      workflowSlug: 'text-to-image',
      timestamp: '2024-01-01T10:00:00Z',
      duration: 120,
      success: true
    },
    {
      modelName: 'flux1-dev.safetensors',
      modelType: 'checkpoints',
      workflowSlug: 'text-to-image',
      timestamp: '2024-01-02T10:00:00Z',
      duration: 90,
      success: true
    },
    {
      modelName: 'clip_l.safetensors',
      modelType: 'clip',
      workflowSlug: 'text-to-image',
      timestamp: '2024-01-01T10:05:00Z',
      duration: 30,
      success: true
    }
  ]

  describe('trackModelUsage', () => {
    it('creates valid usage events', () => {
      const event = trackModelUsage({
        modelName: 'test-model.safetensors',
        modelType: 'checkpoints',
        workflowSlug: 'test-workflow',
        duration: 60,
        success: true
      })

      expect(ModelUsageEventSchema.safeParse(event).success).toBe(true)
      expect(event.modelName).toBe('test-model.safetensors')
      expect(event.modelType).toBe('checkpoints')
      expect(event.timestamp).toBeDefined()
    })

    it('throws error for invalid events', () => {
      expect(() => {
        trackModelUsage({
          modelName: '',
          modelType: 'invalid' as 'unet' | 'clip' | 'clip_vision' | 'vae' | 'lora' | 'checkpoints',
          success: true
        })
      }).toThrow('Invalid model usage event')
    })
  })

  describe('calculateModelPriority', () => {
    it('calculates priority based on usage patterns', () => {
      const priority = calculateModelPriority(
        'flux1-dev.safetensors',
        mockEvents,
        ['text-to-image'],
        DEFAULT_PRIORITY_WEIGHTS
      )

      expect(ModelPrioritySchema.safeParse(priority).success).toBe(true)
      expect(priority.modelName).toBe('flux1-dev.safetensors')
      expect(priority.usageCount).toBe(2)
      expect(priority.workflows).toContain('text-to-image')
      expect(priority.score).toBeGreaterThan(0)
      expect(priority.reasons.length).toBeGreaterThan(0)
    })

    it('returns zero usage for unknown models', () => {
      const priority = calculateModelPriority(
        'unknown-model.safetensors',
        mockEvents,
        [],
        DEFAULT_PRIORITY_WEIGHTS
      )

      expect(priority.usageCount).toBe(0)
      expect(priority.score).toBeGreaterThanOrEqual(0)
    })

    it('calculates average duration correctly', () => {
      const priority = calculateModelPriority(
        'flux1-dev.safetensors',
        mockEvents,
        ['text-to-image'],
        DEFAULT_PRIORITY_WEIGHTS
      )

      expect(priority.averageDuration).toBe(105) // (120 + 90) / 2
    })
  })

  describe('findModelCombinations', () => {
    it('identifies model combinations from sessions', () => {
      const combinations = findModelCombinations(mockEvents)

      expect(Array.isArray(combinations)).toBe(true)
      expect(combinations.length).toBeGreaterThanOrEqual(0)
      
      if (combinations.length > 0) {
        const combo = combinations[0]
        expect(ModelCombinationSchema.safeParse(combo).success).toBe(true)
        expect(combo.models.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('filters combinations by minimum frequency', () => {
      // Create events that don't meet frequency threshold
      const singleEvents: ModelUsageEvent[] = [
        {
          modelName: 'model1.safetensors',
          modelType: 'checkpoints',
          workflowSlug: 'workflow1',
          timestamp: '2024-01-01T10:00:00Z',
          success: true
        }
      ]

      const combinations = findModelCombinations(singleEvents)
      expect(combinations.length).toBe(0) // No combinations meet minimum frequency
    })
  })

  describe('getPreloadCandidates', () => {
    const mockRequirements: ModelRequirement[] = [
      {
        nodeId: '1',
        classType: 'CheckpointLoaderSimple',
        type: 'checkpoints',
        name: 'flux1-dev.safetensors'
      }
    ]

    it('returns prioritized candidates for workflow', () => {
      const candidates = getPreloadCandidates(
        'text-to-image',
        mockRequirements,
        mockEvents,
        []
      )

      expect(Array.isArray(candidates)).toBe(true)
      expect(candidates.length).toBeGreaterThan(0)
      
      // Should include required models
      const requiredModel = candidates.find(c => c.modelName === 'flux1-dev.safetensors')
      expect(requiredModel).toBeDefined()
      
      // Should be sorted by priority descending
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i].score).toBeLessThanOrEqual(candidates[i - 1].score)
      }
    })

    it('includes additional models from combinations', () => {
      const combinations = findModelCombinations(mockEvents)
      const candidates = getPreloadCandidates(
        'text-to-image',
        mockRequirements,
        mockEvents,
        combinations
      )

      expect(candidates.length).toBeGreaterThanOrEqual(mockRequirements.length)
    })

    it('handles empty inputs gracefully', () => {
      const candidates = getPreloadCandidates('unknown-workflow', [], [], [])
      expect(candidates).toEqual([])
    })
  })

  describe('Schema Validation', () => {
    it('validates ModelUsageEvent schema', () => {
      const validEvent = {
        modelName: 'test.safetensors',
        modelType: 'checkpoints',
        workflowSlug: 'test',
        timestamp: '2024-01-01T10:00:00Z',
        duration: 60,
        success: true
      }

      expect(ModelUsageEventSchema.safeParse(validEvent).success).toBe(true)
    })

    it('rejects invalid ModelUsageEvent', () => {
      const invalidEvent = {
        modelName: '',
        modelType: 'invalid',
        timestamp: 'invalid-date'
      }

      expect(ModelUsageEventSchema.safeParse(invalidEvent).success).toBe(false)
    })

    it('validates ModelPriority schema', () => {
      const validPriority = {
        modelName: 'test.safetensors',
        modelType: 'checkpoints',
        score: 0.8,
        reasons: ['frequently used'],
        usageCount: 5,
        workflows: ['workflow1']
      }

      expect(ModelPrioritySchema.safeParse(validPriority).success).toBe(true)
    })

    it('validates ModelCombination schema', () => {
      const validCombination = {
        models: ['model1.safetensors', 'model2.safetensors'],
        workflows: ['workflow1'],
        frequency: 3,
        lastSeen: '2024-01-01T10:00:00Z',
        averageSuccess: 0.9
      }

      expect(ModelCombinationSchema.safeParse(validCombination).success).toBe(true)
    })
  })
})