import { loadRunPodConfig } from '../config/runpod'

// RunPod API Types
export interface RunPodImage {
  name: string
  url: string
}

export interface SubmitToRunPodParams {
  jobId: string
  workflow: object
  images: RunPodImage[]
  outputPutUrl: string
  callbackUrl: string
}

export interface RunPodJobInput {
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

  // Prepare the request payload according to RunPod API spec
  const payload: RunPodJobInput = {
    workflow,
    images,
    output_put_url: outputPutUrl,
    callback_url: callbackUrl,
  }

  const url = `https://api.runpod.ai/v2/${config.endpointId}/run`
  const requestId = `${jobId}-${Date.now()}`

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