export type RunStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface RunpodInput {
  workflow: Record<string, unknown>
}

const apiBase = 'https://api.runpod.ai/v2'

export async function runSync(input: RunpodInput) {
  const res = await fetch(`${apiBase}/${process.env.RUNPOD_ENDPOINT_ID}/runsync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.RUNPOD_API_KEY}`
    },
    body: JSON.stringify({ input })
  })
  if (!res.ok) throw new Error(`runsync failed: ${res.status}`)
  return res.json()
}

export async function runAsync(input: RunpodInput): Promise<{ id: string }> {
  const res = await fetch(`${apiBase}/${process.env.RUNPOD_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.RUNPOD_API_KEY}`
    },
    body: JSON.stringify({ input })
  })
  if (!res.ok) throw new Error(`run failed: ${res.status}`)
  return res.json()
}

export async function getStatus(id: string) {
  const res = await fetch(`${apiBase}/${process.env.RUNPOD_ENDPOINT_ID}/status/${id}`, {
    headers: { authorization: `Bearer ${process.env.RUNPOD_API_KEY}` }
  })
  if (!res.ok) throw new Error(`status failed: ${res.status}`)
  return res.json()
}
