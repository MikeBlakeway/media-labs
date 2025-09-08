import { NextRequest, NextResponse } from 'next/server'
import { cancelJob } from '@/lib/runpod'

export const runtime = 'nodejs'

type Params = { id: string }

export async function POST(_req: NextRequest, context: { params: Promise<Params> }) {
  try {
    const { id } = await context.params
    const result = await cancelJob(id)

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 })
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
