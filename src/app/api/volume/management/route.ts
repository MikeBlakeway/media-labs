import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { volumeManagement } from '@/lib/volume-management'

export const runtime = 'nodejs'

// Schema for volume management requests
const VolumeManagementRequestSchema = z.union([
  z.object({
    action: z.literal('get-stats')
  }),
  z.object({
    action: z.literal('record-usage'),
    modelPath: z.string(),
    modelType: z.string(),
    sizeBytes: z.number()
  }),
  z.object({
    action: z.literal('check-cleanup')
  }),
  z.object({
    action: z.literal('force-cleanup')
  }),
  z.object({
    action: z.literal('get-analytics')
  }),
  z.object({
    action: z.literal('protect-model'),
    modelPath: z.string()
  }),
  z.object({
    action: z.literal('unprotect-model'),
    modelPath: z.string()
  })
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = VolumeManagementRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { action } = parsed.data

    switch (action) {
      case 'get-stats': {
        const stats = await volumeManagement.getVolumeStats()
        return NextResponse.json({ stats })
      }

      case 'record-usage': {
        const { modelPath, modelType, sizeBytes } = parsed.data
        await volumeManagement.recordModelUsage(modelPath, modelType, sizeBytes)
        return NextResponse.json({ success: true })
      }

      case 'check-cleanup': {
        const result = await volumeManagement.checkAndCleanup()
        return NextResponse.json({ cleanup: result })
      }

      case 'force-cleanup': {
        const result = await volumeManagement.forceCleanup()
        return NextResponse.json({ cleanup: result })
      }

      case 'get-analytics': {
        const analytics = volumeManagement.getUsageAnalytics()
        return NextResponse.json({ analytics })
      }

      case 'protect-model': {
        const { modelPath } = parsed.data
        volumeManagement.protectModel(modelPath)
        return NextResponse.json({ success: true })
      }

      case 'unprotect-model': {
        const { modelPath } = parsed.data
        volumeManagement.unprotectModel(modelPath)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[VolumeManagement API] Error:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Default GET request returns current stats
    const stats = await volumeManagement.getVolumeStats()
    const analytics = volumeManagement.getUsageAnalytics()

    return NextResponse.json({
      stats,
      analytics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[VolumeManagement API] Error:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
