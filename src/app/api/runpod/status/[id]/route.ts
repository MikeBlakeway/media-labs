import { NextRequest, NextResponse } from 'next/server'
import { getStatus } from '@/lib/runpod'

export const runtime = 'nodejs'

type Params = { id: string }

export async function GET(_req: NextRequest, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params
    const out = await getStatus(id)
    return NextResponse.json(out, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
