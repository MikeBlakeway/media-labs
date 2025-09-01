import { z } from 'zod'

// Resolution mapping for common video resolutions
export const RESOLUTION_MAP = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
} as const

export type Resolution = keyof typeof RESOLUTION_MAP

// Schema for video parameters that need to be injected into workflow
export const VideoParametersSchema = z.object({
  frames: z.number().int().min(4).max(240).optional(),
  fps: z.number().min(1).max(60).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
})

export type VideoParameters = z.infer<typeof VideoParametersSchema>

/**
 * Convert resolution label to width/height dimensions
 * @param resolution Resolution label like "720p" or "1080p"
 * @returns Object with width and height properties
 */
export function translateResolution(resolution?: string): { width: number; height: number } {
  if (!resolution || !(resolution in RESOLUTION_MAP)) {
    // Default to 720p if resolution is not provided or invalid
    return RESOLUTION_MAP['720p']
  }
  
  return RESOLUTION_MAP[resolution as Resolution]
}

/**
 * Inject video parameters into ComfyUI workflow nodes
 * Based on the issue description:
 * - Node 83: length, width, height
 * - Node 91: fps
 * 
 * @param workflow Original workflow JSON
 * @param params Video parameters to inject
 * @param resolution Resolution label to translate
 * @returns Modified workflow with injected parameters
 */
export function injectWorkflowParameters(
  workflow: object,
  params: VideoParameters,
  resolution?: string
): object {
  // Deep clone the workflow to avoid mutations
  const modifiedWorkflow = JSON.parse(JSON.stringify(workflow))
  
  // Get resolution dimensions
  const { width, height } = translateResolution(resolution)
  
  // Use provided dimensions or fall back to resolution defaults
  const finalWidth = params.width ?? width
  const finalHeight = params.height ?? height
  const finalFrames = params.frames ?? 16 // Default from schema
  const finalFps = params.fps ?? 8 // Default from schema
  
  // Inject parameters into Node 83 (length, width, height)
  if (modifiedWorkflow['83']) {
    if (modifiedWorkflow['83'].inputs) {
      modifiedWorkflow['83'].inputs.length = finalFrames
      modifiedWorkflow['83'].inputs.width = finalWidth
      modifiedWorkflow['83'].inputs.height = finalHeight
    }
  }
  
  // Inject parameters into Node 91 (fps)
  if (modifiedWorkflow['91']) {
    if (modifiedWorkflow['91'].inputs) {
      modifiedWorkflow['91'].inputs.fps = finalFps
    }
  }
  
  return modifiedWorkflow
}

/**
 * Download an image from URL and convert to base64
 * @param imageUrl URL of the image to download
 * @returns Base64 encoded image data
 * @throws Error if download or conversion fails
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    return base64
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to download and encode image from ${imageUrl}: ${errorMessage}`)
  }
}

/**
 * Convert file buffer to base64
 * @param buffer File buffer
 * @returns Base64 encoded string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64')
}