import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface VolumeStats {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usagePercent: number
}

interface VolumeHistoryEntry {
  timestamp: Date
  stats: VolumeStats
}

export const runtime = 'nodejs'

// In-memory storage for volume history
// In production, this would be replaced with a persistent database
let volumeHistory: VolumeHistoryEntry[] = []

/**
 * Get volume usage history
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hours = parseInt(searchParams.get('hours') ?? '24')
    const resolution = searchParams.get('resolution') ?? 'hourly' // hourly, daily

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Filter history to requested time range
    let filteredHistory = volumeHistory.filter(entry => entry.timestamp > cutoffTime)

    // Apply resolution aggregation
    if (resolution === 'hourly' && filteredHistory.length > 100) {
      // Group by hour for large datasets
      const hourlyData = new Map<string, VolumeHistoryEntry[]>()

      filteredHistory.forEach(entry => {
        const hourKey = new Date(entry.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH
        if (!hourlyData.has(hourKey)) {
          hourlyData.set(hourKey, [])
        }
        hourlyData.get(hourKey)!.push(entry)
      })

      // Average the values for each hour
      filteredHistory = Array.from(hourlyData.entries())
        .map(([hourKey, entries]) => {
          const avgStats = {
            totalBytes: entries[0].stats.totalBytes, // These don't change
            usedBytes: Math.round(entries.reduce((sum, e) => sum + e.stats.usedBytes, 0) / entries.length),
            freeBytes: Math.round(entries.reduce((sum, e) => sum + e.stats.freeBytes, 0) / entries.length),
            usagePercent: entries.reduce((sum, e) => sum + e.stats.usagePercent, 0) / entries.length
          }
          return {
            timestamp: new Date(hourKey + ':00:00.000Z'),
            stats: avgStats
          }
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    }

    // Calculate trends
    const trends = {
      usageTrend: 'stable',
      averageUsage: 0,
      peakUsage: 0,
      growthRate: 0
    }

    if (filteredHistory.length >= 2) {
      const recent = filteredHistory.slice(-10) // Last 10 data points
      const older = filteredHistory.slice(0, 10) // First 10 data points

      const recentAvg = recent.reduce((sum, entry) => sum + entry.stats.usagePercent, 0) / recent.length
      const olderAvg = older.reduce((sum, entry) => sum + entry.stats.usagePercent, 0) / older.length

      trends.averageUsage = recentAvg
      trends.peakUsage = Math.max(...filteredHistory.map(entry => entry.stats.usagePercent))
      trends.growthRate = ((recentAvg - olderAvg) / olderAvg) * 100

      if (trends.growthRate > 5) {
        trends.usageTrend = 'increasing'
      } else if (trends.growthRate < -5) {
        trends.usageTrend = 'decreasing'
      }
    }

    // Calculate statistics
    const statistics = {
      dataPoints: filteredHistory.length,
      timeRange: {
        start: filteredHistory.length > 0 ? filteredHistory[0].timestamp : null,
        end: filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1].timestamp : null,
        hours
      },
      current: filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1].stats : null
    }

    return NextResponse.json({
      success: true,
      history: filteredHistory,
      trends,
      statistics,
      resolution
    })
  } catch (err) {
    console.error('[volume-history] Failed to get volume history:', err)
    const message = err instanceof Error ? err.message : 'Failed to get volume history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Add volume stats to history (used internally by cache system)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const VolumeStatsSchema = z.object({
      totalBytes: z.number(),
      usedBytes: z.number(),
      freeBytes: z.number(),
      usagePercent: z.number()
    })

    const parsed = VolumeStatsSchema.safeParse(body.stats)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid volume stats format',
          details: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    const entry = {
      timestamp: new Date(),
      stats: parsed.data
    }

    volumeHistory.push(entry)

    // Keep only last 7 days of data (assuming hourly updates)
    const maxEntries = 7 * 24
    if (volumeHistory.length > maxEntries) {
      volumeHistory = volumeHistory.slice(-maxEntries)
    }

    console.log(`[volume-history] Added entry: ${parsed.data.usagePercent.toFixed(1)}% usage`)

    return NextResponse.json({
      success: true,
      entry,
      totalEntries: volumeHistory.length
    })
  } catch (err) {
    console.error('[volume-history] Failed to add volume history:', err)
    const message = err instanceof Error ? err.message : 'Failed to add volume history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Clear volume history (admin function)
 */
export async function DELETE() {
  try {
    const previousLength = volumeHistory.length
    volumeHistory = []

    console.log(`[volume-history] Cleared ${previousLength} history entries`)

    return NextResponse.json({
      success: true,
      message: `Cleared ${previousLength} history entries`
    })
  } catch (err) {
    console.error('[volume-history] Failed to clear history:', err)
    const message = err instanceof Error ? err.message : 'Failed to clear volume history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
