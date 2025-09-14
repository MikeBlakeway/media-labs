/**
 * useWorkflowOutputType Hook
 *
 * Detects and returns the output type of a workflow template.
 * Used for conditional rendering of video vs image components.
 */

import { useMemo } from 'react'
import type { TemplateMeta } from '@/lib/templates.schema'
import type { ExportApiWorkflow } from '@/lib/workflow.infer'

export type WorkflowOutputType = 'image' | 'video' | 'unknown'

export interface UseWorkflowOutputTypeResult {
  outputType: WorkflowOutputType
  isVideo: boolean
  isImage: boolean
  isUnknown: boolean
}

/**
 * Determines workflow output type from template metadata or workflow analysis
 */
export function useWorkflowOutputType(
  meta: TemplateMeta | null,
  workflow: ExportApiWorkflow | null
): UseWorkflowOutputTypeResult {
  const outputType = useMemo((): WorkflowOutputType => {
    // First check explicit outputType in metadata
    if (meta && 'outputType' in meta && meta.outputType) {
      return meta.outputType as WorkflowOutputType
    }

    // Fall back to workflow analysis
    if (workflow) {
      return detectOutputTypeFromWorkflow(workflow)
    }

    return 'unknown'
  }, [meta, workflow])

  return {
    outputType,
    isVideo: outputType === 'video',
    isImage: outputType === 'image',
    isUnknown: outputType === 'unknown'
  }
}

/**
 * Analyzes workflow nodes to detect output type
 */
function detectOutputTypeFromWorkflow(workflow: ExportApiWorkflow): WorkflowOutputType {
  const nodeTypes = Object.values(workflow).map(node => node.class_type)

  // Video indicators
  const videoNodes = [
    'SaveVideo',
    'CreateVideo',
    'StableVideoDiffusion_Sampler',
    'WanTextToVideo',
    'WanFirstLastFrameToVideo',
    'SVD_img2vid_Conditioning'
  ]

  // Check for video-specific nodes
  if (nodeTypes.some(type => videoNodes.includes(type))) {
    return 'video'
  }

  // Image indicators (most common)
  const imageNodes = ['SaveImage', 'PreviewImage']
  if (nodeTypes.some(type => imageNodes.includes(type))) {
    return 'image'
  }

  // Default to unknown if we can't determine
  return 'unknown'
}