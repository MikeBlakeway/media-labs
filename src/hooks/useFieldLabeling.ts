/**
 * useFieldLabeling Hook
 *
 * Manages enhanced field labeling with workflow context.
 * Extracts field labeling logic from the main workflow component.
 */

import { useCallback } from 'react'
import type { ExportApiWorkflow } from '@/lib/workflow.infer'

// Type for workflow node with _meta information
type WorkflowNodeWithMeta = {
  class_type: string
  inputs: Record<string, unknown>
  _meta?: {
    title?: string
  }
  [key: string]: unknown
}

export interface UseFieldLabelingResult {
  getEnhancedFieldLabel: (
    field: { nodeId: string; inputKey: string; label: string; defaultValue?: unknown },
    allFields: Array<{ nodeId: string; inputKey: string; label: string; defaultValue?: unknown }>
  ) => string
}

export function useFieldLabeling(workflow: ExportApiWorkflow | null): UseFieldLabelingResult {
  // Smart labeling function that creates user-friendly, distinctive labels
  const getEnhancedFieldLabel = useCallback(
    (
      field: { nodeId: string; inputKey: string; label: string; defaultValue?: unknown },
      allFields: Array<{ nodeId: string; inputKey: string; label: string; defaultValue?: unknown }>
    ): string => {
      if (!workflow || !workflow[field.nodeId]) {
        return field.label
      }

      const node = workflow[field.nodeId] as WorkflowNodeWithMeta
      const metaTitle = node._meta?.title

      // If the node has a _meta.title, use it to enhance the field label
      if (metaTitle) {
        // Handle text/prompt fields with specific context
        if (field.inputKey === 'text' && field.label === 'text') {
          // Check if this is likely a negative prompt based on context clues
          const isNegativePrompt =
            metaTitle.toLowerCase().includes('negative') ||
            metaTitle.toLowerCase().includes('bad') ||
            metaTitle.toLowerCase().includes('avoid') ||
            (typeof field.defaultValue === 'string' && field.defaultValue.toLowerCase().includes('worst quality'))

          if (isNegativePrompt) {
            return 'Negative Prompt'
          } else {
            return 'Positive Prompt'
          }
        }

        // For other fields, combine meta title with field context
        if (field.label !== field.inputKey) {
          return `${metaTitle} - ${field.label}`
        } else {
          return `${metaTitle} - ${field.inputKey}`
        }
      }

      // Fallback enhancement for common field patterns
      if (field.inputKey === 'text' && field.label === 'text') {
        // Look for duplicate text fields to differentiate them
        const textFields = allFields.filter(f => f.inputKey === 'text' && f.label === 'text')
        if (textFields.length > 1) {
          const index = textFields.findIndex(f => f.nodeId === field.nodeId)
          if (index === 0) {
            return 'Main Prompt'
          } else {
            return `Text Input ${index + 1}`
          }
        }
      }

      // Handle seed fields
      if (field.inputKey === 'seed' || field.label.toLowerCase().includes('seed')) {
        return 'Random Seed'
      }

      // Handle steps/iterations
      if (field.inputKey === 'steps' || field.label.toLowerCase().includes('steps')) {
        return 'Sampling Steps'
      }

      // Handle CFG scale
      if (field.inputKey === 'cfg' || field.label.toLowerCase().includes('cfg')) {
        return 'CFG Scale'
      }

      // Handle dimensions
      if (field.inputKey === 'width' || field.label.toLowerCase().includes('width')) {
        return 'Image Width'
      }
      if (field.inputKey === 'height' || field.label.toLowerCase().includes('height')) {
        return 'Image Height'
      }

      // Handle batch size
      if (field.inputKey === 'batch_size' || field.label.toLowerCase().includes('batch')) {
        return 'Batch Size'
      }

      // Default to original label
      return field.label
    },
    [workflow]
  )

  return {
    getEnhancedFieldLabel
  }
}
