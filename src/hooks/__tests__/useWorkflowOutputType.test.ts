/**
 * Tests for useWorkflowOutputType Hook Logic
 *
 * Tests the core logic for determining output type from workflow metadata
 * with both explicit outputType and fallback heuristics.
 */

import type { TemplateMeta } from '@/lib/templates.schema'
import type { WorkflowTemplate } from '@/lib/templates.types'

// Extract the core logic for testing without React hooks
function determineOutputType(workflowMeta: TemplateMeta | WorkflowTemplate | null) {
  if (!workflowMeta) {
    return {
      outputType: 'image' as const,
      confidence: 'low' as const,
      reason: 'No workflow metadata available, defaulting to image'
    }
  }

  // Use explicit outputType if provided (high confidence)
  if ('outputType' in workflowMeta && workflowMeta.outputType) {
    return {
      outputType: workflowMeta.outputType,
      confidence: 'high' as const,
      reason: 'Explicit outputType specified in workflow metadata'
    }
  }

  // Fallback to heuristics based on workflow name and slug
  const name = workflowMeta.name?.toLowerCase() || ''
  const slug = workflowMeta.slug?.toLowerCase() || ''
  const combined = `${name} ${slug}`

  // Video workflow patterns (medium confidence)
  const videoPatterns = [
    'video',
    'i2v',
    'image-to-video',
    'image2video',
    'text-to-video',
    'text2video',
    't2v',
    'animation',
    'animate',
    'motion',
    'movie',
    'clip',
    'sequence',
    'frames',
    'temporal'
  ]

  const matchedVideoPattern = videoPatterns.find(pattern => combined.includes(pattern))

  if (matchedVideoPattern) {
    return {
      outputType: 'video' as const,
      confidence: 'medium' as const,
      reason: `Inferred from workflow name/slug containing "${matchedVideoPattern}"`
    }
  }

  // Default to image (low confidence when relying on default)
  return {
    outputType: 'image' as const,
    confidence: 'low' as const,
    reason: 'No video indicators found, defaulting to image'
  }
}

describe('determineOutputType', () => {
  const mockImageWorkflow: TemplateMeta = {
    slug: 'text-to-image',
    name: 'Text to Image',
    fields: [],
    outputType: 'image'
  }

  const mockVideoWorkflow: TemplateMeta = {
    slug: 'image-to-video',
    name: 'Image to Video',
    fields: [],
    outputType: 'video'
  }

  const mockWorkflowWithoutOutputType: Partial<TemplateMeta> = {
    slug: 'unknown-workflow',
    name: 'Unknown Workflow',
    fields: []
  }

  const mockVideoWorkflowByName: Partial<TemplateMeta> = {
    slug: 'video-generation',
    name: 'Video Generation Model',
    fields: []
  }

  const mockAnimationWorkflow: Partial<TemplateMeta> = {
    slug: 'animation-creator',
    name: 'Create Animation',
    fields: []
  }

  describe('with explicit outputType', () => {
    it('should return image type for explicit image workflow', () => {
      const result = determineOutputType(mockImageWorkflow)

      expect(result.outputType).toBe('image')
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe('Explicit outputType specified in workflow metadata')
    })

    it('should return video type for explicit video workflow', () => {
      const result = determineOutputType(mockVideoWorkflow)

      expect(result.outputType).toBe('video')
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe('Explicit outputType specified in workflow metadata')
    })
  })

  describe('with heuristic detection', () => {
    it('should detect video from workflow name containing "video"', () => {
      const result = determineOutputType(mockVideoWorkflowByName as TemplateMeta)

      expect(result.outputType).toBe('video')
      expect(result.confidence).toBe('medium')
      expect(result.reason).toContain('video')
    })

    it('should detect video from workflow name containing "animation"', () => {
      const result = determineOutputType(mockAnimationWorkflow as TemplateMeta)

      expect(result.outputType).toBe('video')
      expect(result.confidence).toBe('medium')
      expect(result.reason).toContain('animation')
    })

    it('should default to image for unknown patterns', () => {
      const result = determineOutputType(mockWorkflowWithoutOutputType as TemplateMeta)

      expect(result.outputType).toBe('image')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('No video indicators found, defaulting to image')
    })
  })

  describe('with null/undefined input', () => {
    it('should handle null workflow metadata', () => {
      const result = determineOutputType(null)

      expect(result.outputType).toBe('image')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('No workflow metadata available, defaulting to image')
    })
  })

  describe('video pattern detection', () => {
    const testCases = [
      { name: 'i2v workflow', slug: 'i2v-test', expected: 'video' },
      { name: 'animation workflow', slug: 'animation-generator', expected: 'video' },
      { name: 'motion workflow', slug: 'motion-generator', expected: 'video' },
      { name: 't2v workflow', slug: 't2v-model', expected: 'video' },
      { name: 'frames workflow', slug: 'frames-only', expected: 'video' },
      { name: 'text workflow', slug: 'text-generator', expected: 'image' }
    ]

    testCases.forEach(({ name, slug, expected }) => {
      it(`should detect ${expected} from ${name}`, () => {
        const workflow: Partial<TemplateMeta> = {
          slug,
          name: `Test ${name}`,
          fields: []
        }

        const result = determineOutputType(workflow as TemplateMeta)

        expect(result.outputType).toBe(expected)
        if (expected === 'video') {
          expect(result.confidence).toBe('medium')
        } else {
          expect(result.confidence).toBe('low')
        }
      })
    })
  })

  describe('WorkflowTemplate compatibility', () => {
    it('should work with WorkflowTemplate type', () => {
      const workflowTemplate: WorkflowTemplate = {
        slug: 'test-video',
        name: 'Test Video Workflow',
        workflow: {},
        fields: [],
        createdAt: Date.now(),
        outputType: 'video'
      }

      const result = determineOutputType(workflowTemplate)

      expect(result.outputType).toBe('video')
      expect(result.confidence).toBe('high')
    })
  })
})
