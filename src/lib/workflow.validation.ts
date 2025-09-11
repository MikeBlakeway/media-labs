import { z } from 'zod'
import { ExportApiWorkflowSchema, type ExportApiWorkflow, type ExportApiNode } from './workflow.infer'

/**
 * RunPod API input format validation
 * Based on: https://github.com/runpod-workers/runpod-worker-comfy
 */
export const RunPodInputImageSchema = z.object({
  name: z.string().describe('The name of the image file'),
  image: z.string().describe('Base64 encoded image data')
})

export const RunPodInputSchema = z.object({
  input: z.object({
    workflow: ExportApiWorkflowSchema.describe('ComfyUI workflow in API format'),
    images: z.array(RunPodInputImageSchema).optional().describe('Optional input images')
  })
})

export type RunPodInput = z.infer<typeof RunPodInputSchema>
export type RunPodInputImage = z.infer<typeof RunPodInputImageSchema>

/**
 * Raw ComfyUI workflow validation (what gets exported from ComfyUI)
 */
export const ComfyUIWorkflowSchema = ExportApiWorkflowSchema

/**
 * Validation result types
 */
export interface WorkflowValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  format: 'runpod' | 'comfyui' | 'unknown'
  workflow?: ExportApiWorkflow
}

/**
 * Known ComfyUI node types that should be validated
 */
const KNOWN_NODE_TYPES = [
  // Loaders
  'CheckpointLoaderSimple',
  'LoraLoader',
  'VAELoader',
  'CLIPLoader',

  // Encoders
  'CLIPTextEncode',
  'VAEEncode',
  'VAEDecode',

  // Samplers
  'KSampler',
  'KSamplerAdvanced',

  // Image operations
  'LoadImage',
  'LoadImageFromPath',
  'SaveImage',
  'PreviewImage',

  // Latent operations
  'EmptyLatentImage',
  'EmptySD3LatentImage',
  'LatentUpscale',

  // FLUX-specific
  'FluxGuidance',

  // Common utility nodes
  'Note',
  'Reroute'
] as const

/**
 * Validates a ComfyUI workflow for common issues
 */
export function validateComfyUIWorkflow(workflow: ExportApiWorkflow): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if workflow is empty
  if (Object.keys(workflow).length === 0) {
    errors.push('Workflow is empty')
    return { errors, warnings }
  }

  // Validate each node
  for (const [nodeId, node] of Object.entries(workflow)) {
    // Check node ID format (should be numeric string or valid identifier)
    if (!nodeId || !/^[a-zA-Z0-9_-]+$/.test(nodeId)) {
      errors.push(`Invalid node ID: ${nodeId}`)
    }

    // Check required node properties
    if (!node.class_type) {
      errors.push(`Node ${nodeId}: Missing class_type`)
      continue
    }

    if (!node.inputs || typeof node.inputs !== 'object') {
      errors.push(`Node ${nodeId}: Missing or invalid inputs object`)
      continue
    }

    // Warn about unknown node types (might be custom nodes)
    if (!KNOWN_NODE_TYPES.includes(node.class_type as (typeof KNOWN_NODE_TYPES)[number])) {
      warnings.push(`Node ${nodeId}: Unknown class_type '${node.class_type}' (might be a custom node)`)
    }

    // Validate common node types
    validateSpecificNodeType(nodeId, node, errors, warnings)

    // Check input references
    validateInputReferences(nodeId, node, workflow, errors)
  }

  return { errors, warnings }
}

/**
 * Validates specific node types for common configuration issues
 */
function validateSpecificNodeType(nodeId: string, node: ExportApiNode, errors: string[]): void {
  const { class_type, inputs } = node

  switch (class_type) {
    case 'CheckpointLoaderSimple':
      if (!inputs.ckpt_name || typeof inputs.ckpt_name !== 'string') {
        errors.push(`Node ${nodeId}: CheckpointLoaderSimple requires string ckpt_name`)
      }
      break

    case 'CLIPTextEncode':
      if (!('text' in inputs)) {
        errors.push(`Node ${nodeId}: CLIPTextEncode requires text input`)
      }
      if (!('clip' in inputs)) {
        errors.push(`Node ${nodeId}: CLIPTextEncode requires clip input`)
      }
      break

    case 'KSampler':
      const requiredKSamplerInputs = [
        'seed',
        'steps',
        'cfg',
        'sampler_name',
        'scheduler',
        'denoise',
        'model',
        'positive',
        'negative',
        'latent_image'
      ]
      for (const input of requiredKSamplerInputs) {
        if (!(input in inputs)) {
          errors.push(`Node ${nodeId}: KSampler missing required input: ${input}`)
        }
      }
      break

    case 'SaveImage':
      if (!('images' in inputs)) {
        errors.push(`Node ${nodeId}: SaveImage requires images input`)
      }
      break

    case 'EmptyLatentImage':
    case 'EmptySD3LatentImage':
      if (!inputs.width || !inputs.height) {
        errors.push(`Node ${nodeId}: ${class_type} requires width and height`)
      }
      break
  }
}

/**
 * Validates that input references point to valid nodes and outputs
 */
function validateInputReferences(
  nodeId: string,
  node: ExportApiNode,
  workflow: ExportApiWorkflow,
  errors: string[]
): void {
  const { inputs } = node

  for (const [inputKey, inputValue] of Object.entries(inputs)) {
    // Check if input is a node reference [nodeId, outputIndex]
    if (Array.isArray(inputValue) && inputValue.length === 2) {
      const [refNodeId, outputIndex] = inputValue

      if (typeof refNodeId === 'string' && typeof outputIndex === 'number') {
        // Check if referenced node exists
        if (!workflow[refNodeId]) {
          errors.push(`Node ${nodeId}: Input '${inputKey}' references non-existent node '${refNodeId}'`)
        }

        // Validate output index
        if (outputIndex < 0) {
          errors.push(`Node ${nodeId}: Input '${inputKey}' has invalid output index ${outputIndex}`)
        }
      }
    }
  }
}

/**
 * Attempts to validate and parse a workflow from various formats
 */
export function validateWorkflow(data: unknown): WorkflowValidationResult {
  const result: WorkflowValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    format: 'unknown'
  }

  // Try to parse as RunPod format first
  const runpodResult = RunPodInputSchema.safeParse(data)
  if (runpodResult.success) {
    result.format = 'runpod'
    result.workflow = runpodResult.data.input.workflow

    // Validate the extracted workflow
    const validation = validateComfyUIWorkflow(result.workflow)
    result.errors = validation.errors
    result.warnings = validation.warnings
    result.isValid = validation.errors.length === 0

    return result
  }

  // Try to parse as raw ComfyUI workflow
  const comfyResult = ComfyUIWorkflowSchema.safeParse(data)
  if (comfyResult.success) {
    result.format = 'comfyui'
    result.workflow = comfyResult.data

    // Validate the workflow
    const validation = validateComfyUIWorkflow(result.workflow)
    result.errors = validation.errors
    result.warnings = validation.warnings
    result.isValid = validation.errors.length === 0

    return result
  }

  // Neither format worked
  result.errors.push('Unable to parse as RunPod input or ComfyUI workflow format')
  if (runpodResult.error) {
    result.errors.push(`RunPod format validation: ${runpodResult.error.message}`)
  }
  if (comfyResult.error) {
    result.errors.push(`ComfyUI format validation: ${comfyResult.error.message}`)
  }

  return result
}

/**
 * Extracts a ComfyUI workflow from various input formats
 */
export function extractWorkflow(data: unknown): ExportApiWorkflow | null {
  const validation = validateWorkflow(data)
  return validation.workflow || null
}

/**
 * Type guard to check if data is a valid RunPod input
 */
export function isRunPodInput(data: unknown): data is RunPodInput {
  return RunPodInputSchema.safeParse(data).success
}

/**
 * Type guard to check if data is a valid ComfyUI workflow
 */
export function isComfyUIWorkflow(data: unknown): data is ExportApiWorkflow {
  return ComfyUIWorkflowSchema.safeParse(data).success
}
