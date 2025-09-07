export type RunStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

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
  status: string
  output?: {
    images?: RunpodOutputImage[]
    errors?: string[]
  }
  delayTime?: number
  executionTime?: number
}

export interface RunpodAsyncResponse {
  id: string
  status: string
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

export async function runSync(input: RunpodInput): Promise<RunpodSyncResponse> {
  const apiBase = getApiBase()
  const headers = getHeaders()
  const path = getEndpointPath('runsync')

  const res = await fetch(`${apiBase}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ input })
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`runsync failed: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function runAsync(input: RunpodInput): Promise<RunpodAsyncResponse> {
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
}

export async function getStatus(id: string) {
  const apiBase = getApiBase()
  const headers = getHeaders()
  const path = getEndpointPath(`status/${id}`)

  const res = await fetch(`${apiBase}/${path}`, { headers })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`status failed: ${res.status} ${errorText}`)
  }
  return res.json()
}
