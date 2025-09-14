// RunPod Job States - Official 6 states from RunPod documentation
export type RunPodJobState =
  | 'IN_QUEUE' // Job waiting for available worker
  | 'RUNNING' // Worker actively processing job
  | 'COMPLETED' // Job finished successfully
  | 'FAILED' // Job encountered error during execution
  | 'CANCELLED' // Job manually cancelled via /cancel/job_id
  | 'TIMED_OUT' // Job expired or worker failed to report back

// Import timeout and retry utilities
import { withRetryAndTimeout } from './runpod.retry'
import { getRetryConfig, getTimeout } from './runpod.config'

export interface RunpodInputImage {
  name: string
  image: string // base64 data URI or base64 string
}

export interface RunpodInput {
  workflow: Record<string, unknown>
  images?: RunpodInputImage[]
}

// Updated output interface to match worker-comfyui v5.0+ format
export interface RunpodOutputImage {
  filename: string
  type: 'base64' | 's3_url'
  data: string
}

export interface RunpodSyncResponse {
  id: string
  status: RunPodJobState | string // Allow string for unknown states
  output?: {
    images?: RunpodOutputImage[]
    errors?: string[]
  }
  delayTime?: number
  executionTime?: number
}

export interface RunpodAsyncResponse {
  id: string
  status: RunPodJobState | string // Allow string for unknown states
}

export interface RunpodStatusResponse {
  id: string
  status: RunPodJobState | string
  output?: {
    images?: RunpodOutputImage[]
    errors?: string[]
  }
  delayTime?: number
  executionTime?: number
}

// Support both local worker and RunPod endpoints
function getApiBase(): string {
  // Check if we should use local worker (for development/testing)
  if (process.env.USE_LOCAL_WORKER === 'true') {
    return process.env.LOCAL_WORKER_URL || 'http://localhost:8000'
  }
  return 'https://api.runpod.ai/v2'
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }

  // Only add auth for RunPod endpoints
  if (process.env.USE_LOCAL_WORKER !== 'true') {
    if (!process.env.RUNPOD_API_KEY) {
      throw new Error('RUNPOD_API_KEY environment variable is required')
    }
    headers.authorization = `Bearer ${process.env.RUNPOD_API_KEY}`
  }

  return headers
}

function getEndpointPath(endpoint: string): string {
  if (process.env.USE_LOCAL_WORKER === 'true') {
    return endpoint // Local worker serves endpoints directly
  }

  if (!process.env.RUNPOD_ENDPOINT_ID) {
    throw new Error('RUNPOD_ENDPOINT_ID environment variable is required for RunPod endpoints')
  }
  return `${process.env.RUNPOD_ENDPOINT_ID}/${endpoint}`
}

/**
 * Synchronous workflow execution - waits for completion
 * Enhanced with timeout and retry logic for production reliability
 */
export async function runSync(input: unknown): Promise<RunpodStatusResponse> {
  try {
    // Use timeout for sync operations
    const timeoutMs = getTimeout('sync')
    const retryConfig = getRetryConfig('sync')

    return await withRetryAndTimeout(
      async () => {
        const apiBase = getApiBase()
        const headers = getHeaders()
        const path = getEndpointPath('run')

        const res = await fetch(`${apiBase}/${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            input,
            sync: true // Force synchronous execution
          })
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`RunPod sync request failed: ${res.status} ${errorText}`)
        }

        const result = await res.json()

        // Validate sync response format
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid sync response format from RunPod')
        }

        // Check for execution errors
        if (result.status === 'FAILED' && result.error) {
          throw new Error(`RunPod execution failed: ${result.error}`)
        }

        return result as RunpodStatusResponse
      },
      retryConfig,
      timeoutMs,
      'RunPod sync execution'
    )
  } catch (error) {
    console.error('RunPod sync execution failed:', error)
    throw error
  }
}

/**
 * Asynchronous workflow execution - returns immediately with job ID
 * Enhanced with retry logic for API call failures
 */
export async function runAsync(input: RunpodInput): Promise<RunpodAsyncResponse> {
  const timeoutMs = getTimeout('async')
  const retryConfig = getRetryConfig('async')

  return await withRetryAndTimeout(
    async () => {
      const apiBase = getApiBase()
      const headers = getHeaders()
      const path = getEndpointPath('run')

      console.log('DEBUG runAsync:', {
        url: `${apiBase}/${path}`,
        headers,
        bodyPreview: JSON.stringify({ input }).slice(0, 200)
      })

      const res = await fetch(`${apiBase}/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ input })
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.log('DEBUG runAsync error:', { status: res.status, errorText })
        throw new Error(`run failed: ${res.status} ${errorText}`)
      }

      return res.json()
    },
    retryConfig,
    timeoutMs,
    'RunPod async execution'
  )
}

/**
 * Get job status with retry logic for API failures
 */
export async function getStatus(id: string): Promise<RunpodStatusResponse> {
  const timeoutMs = getTimeout('status')
  const retryConfig = getRetryConfig('status')

  return await withRetryAndTimeout(
    async () => {
      const apiBase = getApiBase()
      const headers = getHeaders()
      const path = getEndpointPath(`status/${id}`)

      const res = await fetch(`${apiBase}/${path}`, { headers })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`status failed: ${res.status} ${errorText}`)
      }

      return res.json()
    },
    retryConfig,
    timeoutMs,
    'RunPod status check'
  )
}

// Job state utilities
export function isJobComplete(status: RunPodJobState | string): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED' || status === 'TIMED_OUT'
}

export function isJobSuccessful(status: RunPodJobState | string): boolean {
  return status === 'COMPLETED'
}

export function isJobFailed(status: RunPodJobState | string): boolean {
  return status === 'FAILED' || status === 'TIMED_OUT'
}

export function isJobCancellable(status: RunPodJobState | string): boolean {
  return status === 'IN_QUEUE' || status === 'RUNNING'
}

export function shouldRetryJob(status: RunPodJobState | string): boolean {
  return status === 'FAILED' || status === 'TIMED_OUT'
}

/**
 * Cancel a running job with retry logic
 */
export async function cancelJob(id: string): Promise<{ success: boolean; message?: string }> {
  const timeoutMs = getTimeout('cancel')
  const retryConfig = getRetryConfig('cancel')

  try {
    await withRetryAndTimeout(
      async () => {
        const apiBase = getApiBase()
        const headers = getHeaders()
        const path = getEndpointPath(`cancel/${id}`)

        const res = await fetch(`${apiBase}/${path}`, {
          method: 'POST',
          headers
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Cancel failed: ${res.status} ${errorText}`)
        }

        return res.json()
      },
      retryConfig,
      timeoutMs,
      'RunPod job cancellation'
    )

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Cancel request failed: ${message}`
    }
  }
}
