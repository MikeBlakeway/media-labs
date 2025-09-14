/**
 * useWorkflowOutputType Hook
 *
 * Determines the expected output type (image/video) from workflow metadata
 * with intelligent fallback heuristics for workflows without explicit outputType.
 */

import { useMemo } from 'react'
import type { TemplateMeta } from '@/lib/templates.schema'
import type { WorkflowTemplate } from '@/lib/templates.types'

export type OutputType = 'image' | 'video'

export interface UseWorkflowOutputTypeResult {
  outputType: OutputType
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Hook to determine output type from workflow metadata
 * @param workflowMeta - The workflow template metadata
 * @returns Object with outputType, confidence level, and reasoning
 */
export function useWorkflowOutputType(
  workflowMeta: TemplateMeta | WorkflowTemplate | null
): UseWorkflowOutputTypeResult {
  return useMemo(() => {
    if (!workflowMeta) {
      return {
        outputType: 'image',
        confidence: 'low',
        reason: 'No workflow metadata available, defaulting to image'
      }
    }

    // Use explicit outputType if provided (high confidence)
    if ('outputType' in workflowMeta && workflowMeta.outputType) {
      return {
        outputType: workflowMeta.outputType,
        confidence: 'high',
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
        outputType: 'video',
        confidence: 'medium',
        reason: `Inferred from workflow name/slug containing "${matchedVideoPattern}"`
      }
    }

    // Default to image (low confidence when relying on default)
    return {
      outputType: 'image',
      confidence: 'low',
      reason: 'No video indicators found, defaulting to image'
    }
  }, [workflowMeta])
}

/**
 * Simple version that just returns the output type
 * @param workflowMeta - The workflow template metadata
 * @returns The determined output type
 */
export function useWorkflowOutputTypeSimple(workflowMeta: TemplateMeta | WorkflowTemplate | null): OutputType {
  const { outputType } = useWorkflowOutputType(workflowMeta)
  return outputType
}
