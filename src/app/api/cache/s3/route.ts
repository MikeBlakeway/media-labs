import { NextRequest, NextResponse } from 'next/server'
import { clearS3Cache, getS3CacheStats } from '@/lib/s3.enhanced'

export const runtime = 'nodejs'

/**
 * S3 Cache Management Endpoint
 *
 * GET - Returns cache statistics
 * DELETE - Clears cache (optionally with pattern)
 */

export async function GET() {
  try {
    const stats = getS3CacheStats()

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        oldestEntryAgeMs: stats.oldestEntry,
        newestEntryAgeMs: stats.newestEntry,
        cacheTtlMs: 5 * 60 * 1000 // 5 minutes
      }
    })
  } catch (error) {
    console.error('Error getting S3 cache stats:', error)
    return NextResponse.json({ success: false, error: 'Failed to get cache stats' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pattern = searchParams.get('pattern')

    if (pattern) {
      clearS3Cache(pattern)
      return NextResponse.json({
        success: true,
        message: `Cache entries matching "${pattern}" cleared`
      })
    } else {
      clearS3Cache()
      return NextResponse.json({
        success: true,
        message: 'All cache entries cleared'
      })
    }
  } catch (error) {
    console.error('Error clearing S3 cache:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear cache' }, { status: 500 })
  }
}
