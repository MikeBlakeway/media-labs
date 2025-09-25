'use client'

import { useState, useEffect } from 'react'

interface S3CacheStats {
  totalEntries: number
  hitRate: number
  totalHits: number
  totalMisses: number
  oldestEntryAgeMs: number
  newestEntryAgeMs: number
  cacheTtlMs: number
}

interface CacheApiResponse {
  success: boolean
  stats?: S3CacheStats
  message?: string
  error?: string
}

export default function S3CacheManager() {
  const [stats, setStats] = useState<S3CacheStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cache/s3')
      const data: CacheApiResponse = await response.json()

      if (data.success && data.stats) {
        setStats(data.stats)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch stats')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async (pattern?: string) => {
    setLoading(true)
    setError(null)

    try {
      const url = pattern ? `/api/cache/s3?pattern=${encodeURIComponent(pattern)}` : '/api/cache/s3'
      const response = await fetch(url, { method: 'DELETE' })
      const data: CacheApiResponse = await response.json()

      if (data.success) {
        // Refresh stats after clearing
        await fetchStats()
      } else {
        setError(data.error || 'Failed to clear cache')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatAge = (ageMs: number) => {
    const seconds = Math.floor(ageMs / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatHitRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  return (
    <div className='p-6 max-w-4xl mx-auto space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>S3 Cache Manager</h1>
        <button
          onClick={fetchStats}
          disabled={loading}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700'
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'>
          <strong>Error:</strong> {error}
        </div>
      )}

      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          <div className='p-4 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm'>
            <h3 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Cache Size</h3>
            <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>{stats.totalEntries}</div>
            <div className='text-sm text-gray-500 dark:text-gray-400'>Total entries</div>
          </div>

          <div className='p-4 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm'>
            <h3 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Hit Rate</h3>
            <div className='text-2xl font-bold text-green-600 dark:text-green-400'>{formatHitRate(stats.hitRate)}</div>
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              {stats.totalHits} hits / {stats.totalMisses} misses
            </div>
          </div>

          <div className='p-4 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm'>
            <h3 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Cache Age</h3>
            <div className='text-sm text-gray-700 dark:text-gray-300 space-y-1'>
              <div>
                Oldest: <span className='font-medium'>{formatAge(stats.oldestEntryAgeMs)}</span>
              </div>
              <div>
                Newest: <span className='font-medium'>{formatAge(stats.newestEntryAgeMs)}</span>
              </div>
              <div className='text-gray-500 dark:text-gray-400'>TTL: {formatAge(stats.cacheTtlMs)}</div>
            </div>
          </div>
        </div>
      )}

      <div className='bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm p-6'>
        <h3 className='font-semibold text-gray-700 dark:text-gray-300 mb-4'>Cache Management</h3>

        <div className='space-y-4'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => clearCache()}
              disabled={loading}
              className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700'
            >
              Clear All Cache
            </button>

            <button
              onClick={() => clearCache('models/')}
              disabled={loading}
              className='px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-700'
            >
              Clear Model Cache
            </button>
          </div>

          <div className='text-sm text-gray-600 dark:text-gray-400 space-y-2'>
            <p>
              <strong>Clear All:</strong> Removes all cached S3 existence checks. Use when experiencing widespread cache
              issues.
            </p>
            <p>
              <strong>Clear Model Cache:</strong> Removes only model-related cache entries. Use when models have been
              updated or added to storage.
            </p>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className='text-sm text-gray-500 dark:text-gray-400 text-center'>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
        <h4 className='font-semibold text-blue-800 dark:text-blue-300 mb-2'>About S3 Cache</h4>
        <div className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
          <p>The S3 cache stores model existence checks to improve performance and reliability.</p>
          <p>Cache entries expire after 5 minutes to ensure fresh data while reducing S3 API calls.</p>
          <p>The retry mechanism with exponential backoff helps handle temporary S3 connectivity issues.</p>
        </div>
      </div>
    </div>
  )
}
