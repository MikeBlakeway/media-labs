import { z } from 'zod'
import { loadRunPodConfig } from '../config/runpod'
import { downloadImageAsBase64, bufferToBase64, injectWorkflowParameters, VideoParameters } from './workflow-utils'

// RunPod API Types
export interface RunPodImage {
  name: string
  url: string
}

// ComfyUI Serverless Image Format (with base64)
export interface ComfyUIImage {
  name: string
  image: string // base64 encoded
}

// Extended RunPod Image interface for local development
export interface RunPodImageWithBuffer extends RunPodImage {
  buffer?: Buffer // For local development with file buffers
}

export interface SubmitToRunPodParams {
  jobId: string
  workflow: object
  images: RunPodImageWithBuffer[]
  outputPutUrl: string
  callbackUrl: string
  videoParams?: VideoParameters
  resolution?: string
}

// ComfyUI Serverless Input Schema
export const ComfyUIInputSchema = z.object({
  workflow: z.record(z.string(), z.unknown()), // Allow any workflow structure
  images: z.array(z.object({
    name: z.string(),
    image: z.string(), // base64 encoded
  })),
  output_put_url: z.string().url().optional(),
  callback_url: z.string().url().optional(),
})

export type ComfyUIInput = z.infer<typeof ComfyUIInputSchema>

// RunPod Serverless Job Input (with top-level input field)
export interface RunPodJobInput {
  input: ComfyUIInput
}

// Legacy interface for backward compatibility
export interface LegacyRunPodJobInput {
  workflow: object
  images: RunPodImage[]
  output_put_url: string
  callback_url: string
}

export interface RunPodApiResponse {
  id: string
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
}

export interface RunPodErrorResponse {
  error: string
  message?: string
}

export class RunPodError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public requestId?: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'RunPodError'
  }
}

/**
 * Convert RunPod images to ComfyUI format with base64 encoding
 * @param images Array of RunPod images with URLs or buffers
 * @returns Array of ComfyUI images with base64 data
 */
async function convertImagesToComfyUIFormat(images: RunPodImageWithBuffer[]): Promise<ComfyUIImage[]> {
  const comfyUIImages: ComfyUIImage[] = []
  
  for (const image of images) {
    try {
      let base64Data: string
      
      if (image.buffer) {
        // Use local buffer (for local fake mode with actual files)
        base64Data = bufferToBase64(image.buffer)
        console.log(`✅ Converted local image ${image.name} from buffer to base64 (${Math.round(base64Data.length / 1024)}KB)`)
      } else {
        // Download image from URL and convert to base64
        base64Data = await downloadImageAsBase64(image.url)
        console.log(`✅ Downloaded and converted image ${image.name} to base64 (${Math.round(base64Data.length / 1024)}KB)`)
      }
      
      comfyUIImages.push({
        name: image.name,
        image: base64Data
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to convert image ${image.name}:`, errorMessage)
      throw new RunPodError(`Failed to convert image ${image.name} to base64: ${errorMessage}`)
    }
  }
  
  return comfyUIImages
}

/**
 * Submit a job to RunPod serverless endpoint
 * @param params Job submission parameters
 * @returns Promise with RunPod job response
 * @throws RunPodError on API errors
 */
export async function submitToRunPod(params: SubmitToRunPodParams): Promise<RunPodApiResponse> {
  const config = loadRunPodConfig()
  
  if (!config) {
    throw new RunPodError('RunPod configuration not available - ensure VIDEO_RUN_MODE=cloud and config is set')
  }

  const { jobId, workflow, images, outputPutUrl, callbackUrl, videoParams, resolution } = params

  // Inject video parameters into workflow if provided
  const processedWorkflow = videoParams 
    ? injectWorkflowParameters(workflow, videoParams, resolution)
    : workflow

  // Convert images to ComfyUI format with base64 encoding
  const comfyUIImages = await convertImagesToComfyUIFormat(images)

  // Create ComfyUI input object
  const comfyUIInput: ComfyUIInput = {
    workflow: processedWorkflow as Record<string, unknown>,
    images: comfyUIImages,
    output_put_url: outputPutUrl,
    callback_url: callbackUrl,
  }

  // Validate the input structure
  try {
    ComfyUIInputSchema.parse(comfyUIInput)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      throw new RunPodError(`ComfyUI input validation failed: ${validationErrors}`)
    }
    throw error
  }

  // Prepare the request payload according to RunPod Serverless API spec
  const payload: RunPodJobInput = {
    input: comfyUIInput
  }

  const url = `https://api.runpod.ai/v2/${config.endpointId}/run`
  const requestId = `${jobId}-${Date.now()}`

  // Log payload structure for debugging (keys only, not full base64 data)
  if (process.env.NODE_ENV === 'development') {
    const debugPayload = {
      input: {
        workflow: Object.keys(comfyUIInput.workflow).length > 0 ? `{${Object.keys(comfyUIInput.workflow).slice(0, 3).join(', ')}...}` : '{}',
        images: comfyUIInput.images.map(img => ({
          name: img.name,
          imageSize: `${Math.round(img.image.length / 1024)}KB`
        })),
        output_put_url: comfyUIInput.output_put_url ? '[REDACTED]' : undefined,
        callback_url: comfyUIInput.callback_url ? '[REDACTED]' : undefined,
      }
    }
    console.log(`🔍 ComfyUI payload structure [request: ${requestId}]:`, JSON.stringify(debugPayload, null, 2))
  }

  console.log(`🚀 Submitting job to RunPod [request: ${requestId}]`, {
    endpoint: config.endpointId,
    region: config.region,
    jobId,
    imagesCount: images.length,
    workflowNodes: Object.keys(processedWorkflow).length,
    payloadSize: `${Math.round(JSON.stringify(payload).length / 1024)}KB`,
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    
    // Log the response for debugging
    console.log(`📡 RunPod API response [request: ${requestId}]`, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      bodyLength: responseText.length,
    })

    if (!response.ok) {
      let errorMessage = `RunPod API error: ${response.status} ${response.statusText}`
      
      try {
        const errorData: RunPodErrorResponse = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If we can't parse error response, use the raw text
        errorMessage = responseText || errorMessage
      }

      throw new RunPodError(errorMessage, response.status, requestId, responseText)
    }

    const data: RunPodApiResponse = JSON.parse(responseText)
    
    console.log(`✅ RunPod job submitted successfully [request: ${requestId}]`, {
      runPodJobId: data.id,
      status: data.status,
    })

    return data
  } catch (error) {
    if (error instanceof RunPodError) {
      throw error
    }

    // Handle network and other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`❌ RunPod submission failed [request: ${requestId}]`, {
      error: errorMessage,
      originalError: error,
    })

    throw new RunPodError(`Failed to submit job to RunPod: ${errorMessage}`, undefined, requestId, error)
  }
}