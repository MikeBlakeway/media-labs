import { loadRunPodConfig } from '../config/runpod'
import { z } from 'zod'

// Validation schema for RunPod serverless payload
export const RunPodImageSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1) // base64 encoded image
})

export const RunPodServerlessPayloadSchema = z.object({
  input: z.object({
    workflow: z.object({}),
    images: z.array(RunPodImageSchema),
    output_put_url: z.string().url(),
    callback_url: z.string().url()
  })
})

// Resolution mapping utility
export function mapResolutionToPixels(resolution: '720p' | '1080p'): { width: number; height: number } {
  switch (resolution) {
    case '720p':
      return { width: 1280, height: 720 }
    case '1080p':
      return { width: 1920, height: 1080 }
    default:
      throw new Error(`Unsupported resolution: ${resolution}`)
  }
}

// Convert image URL or buffer to base64
export async function convertImageToBase64(source: string | Buffer): Promise<string> {
  if (Buffer.isBuffer(source)) {
    // If source is already a buffer, convert directly to base64
    return source.toString('base64')
  }

  // If source is a relative URL (starts with /), convert to absolute URL
  let imageUrl = source
  if (source.startsWith('/')) {
    // Check if we have a PUBLIC_BASE_URL configured
    const publicBaseUrl = process.env.PUBLIC_BASE_URL
    if (publicBaseUrl) {
      imageUrl = `${publicBaseUrl.replace(/\/$/, '')}${source}`
    } else {
      // Fallback to localhost for development
      const port = process.env.PORT || 4000
      imageUrl = `http://localhost:${port}${source}`
    }
    console.log(`🔗 Converting relative URL ${source} to absolute URL: ${imageUrl}`)
  }

  // If source is a URL, fetch and convert to base64
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Inject video parameters into ComfyUI workflow JSON
export function injectWorkflowParameters(
  workflow: any,
  params: {
    frames: number
    fps: number
    width: number
    height: number
  }
): object {
  // Deep clone to avoid mutating the original workflow
  const modifiedWorkflow = JSON.parse(JSON.stringify(workflow))

  // Inject parameters into specific nodes as per ComfyUI requirements
  if (modifiedWorkflow['83']) {
    modifiedWorkflow['83']['inputs'] = {
      ...modifiedWorkflow['83']['inputs'],
      length: params.frames,
      width: params.width,
      height: params.height
    }
  }

  if (modifiedWorkflow['91']) {
    modifiedWorkflow['91']['inputs'] = {
      ...modifiedWorkflow['91']['inputs'],
      fps: params.fps
    }
  }

  return modifiedWorkflow
}

// RunPod API Types - Updated for ComfyUI Serverless Requirements
export interface RunPodImage {
  name: string
  image: string // base64 encoded image data
}

export interface SubmitToRunPodParams {
  jobId: string
  workflow: object
  images: RunPodImage[]
  outputPutUrl: string
  callbackUrl: string
}

// ComfyUI Serverless requires top-level 'input' field
export interface RunPodJobInput {
  input: {
    workflow: object
    images: RunPodImage[]
    output_put_url: string
    callback_url: string
  }
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

  const { jobId, workflow, images, outputPutUrl, callbackUrl } = params

  // Prepare the request payload according to RunPod Serverless API spec
  // ComfyUI Serverless requires all parameters under top-level 'input' field
  const payload: RunPodJobInput = {
    input: {
      workflow,
      images,
      output_put_url: outputPutUrl,
      callback_url: callbackUrl,
    }
  }

  // Validate payload structure
  try {
    RunPodServerlessPayloadSchema.parse(payload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      throw new RunPodError(`Invalid payload structure: ${validationErrors}`)
    }
    throw new RunPodError('Payload validation failed')
  }

  const url = `https://api.runpod.ai/v2/${config.endpointId}/run`
  const requestId = `${jobId}-${Date.now()}`

  // Log payload structure for debugging (keys only, not full base64 data)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🐛 RunPod payload structure [request: ${requestId}]`, {
      input: {
        workflow: Object.keys(payload.input.workflow || {}),
        imagesCount: payload.input.images.length,
        imageNames: payload.input.images.map(img => img.name),
        output_put_url: 'present',
        callback_url: 'present'
      }
    })
  }

  console.log(`🚀 Submitting job to RunPod [request: ${requestId}]`, {
    endpoint: config.endpointId,
    region: config.region,
    jobId,
    imagesCount: images.length,
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