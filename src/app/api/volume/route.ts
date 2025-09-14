import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

// Schema for volume operation requests
const VolumeRequestSchema = z.object({
  op: z.enum([
    'seed',
    'verify',
    'ls',
    'stat',
    'mkdir',
    'rm',
    'mv',
    'checksum',
    'df',
    'gc_cache',
    'ping',
    'status',
    'logs',
    'b2_download'
  ]),
  args: z.record(z.string(), z.unknown()).optional(),
  endpointId: z.string().optional()
})

// Environment configuration
function getVolumeWorkerConfig() {
  // Check if we should use local worker
  const useLocal = process.env.USE_LOCAL_WORKER === 'true'
  const localUrl = process.env.LOCAL_WORKER_URL || 'http://localhost:8000'

  if (useLocal) {
    return { useLocal: true as const, localUrl }
  }

  const endpointId = process.env.RUNPOD_VOLUME_WORKER_ENDPOINT_ID
  const apiKey = process.env.RUNPOD_API_KEY

  if (!endpointId || !apiKey) {
    throw new Error('Missing RUNPOD_VOLUME_WORKER_ENDPOINT_ID or RUNPOD_API_KEY')
  }

  return { useLocal: false as const, endpointId, apiKey }
}

// Forward request to RunPod volume worker endpoint or local worker
async function callVolumeWorkerEndpoint(op: string, args: Record<string, unknown>, endpointId?: string) {
  const config = getVolumeWorkerConfig()

  const payload = {
    input: {
      op,
      args: args || {}
    }
  }

  // Use local worker if configured
  if (config.useLocal) {
    const response = await fetch(config.localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Local worker error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  // Use RunPod endpoint
  const targetEndpointId = endpointId || config.endpointId

  const response = await fetch(`https://api.runpod.ai/v2/${targetEndpointId}/runsync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`RunPod API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  // Handle RunPod response format
  if (result.status === 'COMPLETED' && result.output) {
    return result.output
  } else if (result.status === 'FAILED') {
    throw new Error(result.error || 'RunPod execution failed')
  } else {
    throw new Error(`Unexpected RunPod status: ${result.status}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = VolumeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request format', details: parsed.error.flatten() }, { status: 400 })
    }

    const { op, args, endpointId } = parsed.data

    console.log(`[volume] Executing operation: ${op}`, args ? Object.keys(args) : 'no args')

    const result = await callVolumeWorkerEndpoint(op, args || {}, endpointId)

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error('[volume] Operation failed:', err)

    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: 'Volume operation failed', details: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Health check - ping the volume worker endpoint
    const result = await callVolumeWorkerEndpoint('ping', {})

    return NextResponse.json(
      {
        status: 'healthy',
        volume_worker: result
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[volume] Health check failed:', err)

    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: 'Volume worker endpoint unavailable', details: message }, { status: 503 })
  }
}
