/**
 * Job Results Storage API
 *
 * Stores workflow results for later viewing
 * Supports result caching and history
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

// Simple in-memory storage (use Redis/DB in production)
const resultStore = new Map<
  string,
  {
    jobId: string
    status: string
    output: unknown
    timestamp: number
    slug: string
  }
>()

const StoreResultSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  output: z.unknown(),
  slug: z.string()
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = StoreResultSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { jobId, status, output, slug } = parsed.data

    // Store result
    resultStore.set(jobId, {
      jobId,
      status,
      output,
      slug,
      timestamp: Date.now()
    })

    // Cleanup old results (keep last 100)
    if (resultStore.size > 100) {
      const entries = Array.from(resultStore.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, -100).forEach(([key]) => resultStore.delete(key))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storage failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const slug = searchParams.get('slug')

    if (jobId) {
      // Get specific result
      const result = resultStore.get(jobId)
      if (!result) {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 })
      }
      return NextResponse.json(result)
    }

    if (slug) {
      // Get recent results for workflow
      const results = Array.from(resultStore.values())
        .filter(r => r.slug === slug)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10) // Last 10 results

      return NextResponse.json({ results })
    }

    // Get all recent results
    const allResults = Array.from(resultStore.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)

    return NextResponse.json({ results: allResults })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Retrieval failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
