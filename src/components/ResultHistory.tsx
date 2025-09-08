/**
 * Result History Component
 *
 * Displays previous workflow results with:
 * - Thumbnail gallery of past generations
 * - Filtering by workflow type
 * - Quick result viewing and downloading
 * - Result sharing capabilities
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

interface HistoryItem {
  jobId: string
  status: string
  output: {
    images?: Array<{
      base64?: string
      url?: string
      filename?: string
      // RunPod format support
      data?: string
      type?: 'base64' | 's3_url'
    }>
    errors?: string[]
  } | null
  timestamp: number
  slug: string
  duration?: number
}

interface ResultHistoryProps {
  currentSlug: string
  onSelectResult?: (result: HistoryItem) => void
}

export function ResultHistory({ currentSlug, onSelectResult }: ResultHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'current'>('current')
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter === 'current') params.set('slug', currentSlug)

      const response = await fetch(`/api/workflows/results?${params}`)
      if (!response.ok) throw new Error('Failed to load history')

      const data = await response.json()
      setHistory(data.results || [])
      setError('')
    } catch (err) {
      console.error('Failed to load workflow history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [currentSlug, filter])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100'
      case 'FAILED':
        return 'text-red-600 bg-red-100'
      case 'CANCELLED':
        return 'text-orange-600 bg-orange-100'
      case 'TIMED_OUT':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getThumbnail = useCallback((item: HistoryItem) => {
    if (!item.output?.images?.[0]) {
      return null
    }

    const img = item.output.images[0]
    // Handle both our format and RunPod format
    const base64Data = img.base64 || img.data
    return base64Data ? `data:image/png;base64,${base64Data}` : img.url
  }, [])

  const downloadResult = useCallback((item: HistoryItem, imageIndex = 0) => {
    const image = item.output?.images?.[imageIndex]
    if (!image) return

    // Handle both our format and RunPod format
    const base64Data = image.base64 || image.data
    if (!base64Data) return

    const link = document.createElement('a')
    link.href = `data:image/png;base64,${base64Data}`
    link.download = image.filename || `result-${item.jobId.slice(0, 8)}-${imageIndex + 1}.png`
    link.click()
  }, [])

  const filteredHistory = history.filter(item => {
    if (filter === 'current') return item.slug === currentSlug
    return true
  })

  if (loading) {
    return (
      <div className='mt-6 p-4 bg-gray-50 rounded-xl border'>
        <div className='flex items-center gap-2 text-gray-600'>
          <div className='w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
          <span className='text-sm'>Loading history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='mt-6 p-4 bg-red-50 rounded-xl border border-red-200'>
        <div className='text-red-600 text-sm'>
          Failed to load history: {error}
          <button onClick={() => void loadHistory()} className='ml-2 underline hover:no-underline'>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (filteredHistory.length === 0) {
    return (
      <div className='mt-6 p-4 bg-gray-50 rounded-xl border'>
        <div className='text-center text-gray-600'>
          <span className='text-2xl mb-2 block'>📭</span>
          <p className='text-sm'>No previous results found</p>
          <p className='text-xs text-gray-500 mt-1'>
            {filter === 'current' ? 'Run a workflow to see results here' : 'No workflows have been completed yet'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='mt-6 space-y-4'>
      {/* Header with filters */}
      <div className='flex items-center justify-between'>
        <h3 className='font-medium text-gray-800'>Previous Results ({filteredHistory.length})</h3>
        <div className='flex gap-2'>
          <button
            onClick={() => setFilter('current')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'current' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            This Workflow
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Workflows
          </button>
          <button
            onClick={() => void loadHistory()}
            className='px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200'
            title='Refresh history'
          >
            🔄
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filteredHistory.map(item => (
          <div
            key={item.jobId}
            className='border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer'
            onClick={() => {
              setSelectedResult(item)
              onSelectResult?.(item)
            }}
          >
            {/* Thumbnail */}
            <div className='aspect-video bg-gray-100 relative'>
              {getThumbnail(item) ? (
                getThumbnail(item)!.startsWith('data:') ? (
                  // Use regular img tag for base64 data URLs with better scaling for tiny images
                  <Image
                    src={getThumbnail(item)!}
                    alt='Result thumbnail'
                    className='w-full h-full object-cover'
                    fill
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  // Use Next.js Image for external URLs
                  <Image
                    src={getThumbnail(item)!}
                    alt='Result thumbnail'
                    fill
                    className='object-cover'
                    sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                  />
                )
              ) : (
                <div className='w-full h-full flex items-center justify-center text-gray-400'>
                  {item.status === 'COMPLETED' ? '🖼️' : '❌'}
                </div>
              )}

              {/* Status badge */}
              <div
                className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                  item.status
                )}`}
              >
                {item.status}
              </div>

              {/* Image count */}
              {item.output?.images && item.output.images.length > 1 && (
                <div className='absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded'>
                  +{item.output.images.length - 1}
                </div>
              )}
            </div>

            {/* Details */}
            <div className='p-3'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-xs text-gray-500 font-mono'>{item.jobId.slice(0, 8)}...</span>
                <span className='text-xs text-gray-500'>{formatTimeAgo(item.timestamp)}</span>
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-700 truncate'>{item.slug}</span>
                {item.duration && <span className='text-xs text-gray-500'>{Math.round(item.duration / 1000)}s</span>}
              </div>

              {/* Quick actions */}
              <div className='flex gap-1 mt-2'>
                {item.output?.images?.map((_, index) => (
                  <button
                    key={index}
                    onClick={e => {
                      e.stopPropagation()
                      downloadResult(item, index)
                    }}
                    className='px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded'
                    title={`Download image ${index + 1}`}
                  >
                    📥
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Result Modal */}
      {selectedResult && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto'>
            <div className='p-4 border-b flex items-center justify-between'>
              <h3 className='font-medium'>Result: {selectedResult.jobId.slice(0, 8)}...</h3>
              <button onClick={() => setSelectedResult(null)} className='text-gray-500 hover:text-gray-700'>
                ✕
              </button>
            </div>

            <div className='p-4'>
              {selectedResult.output?.images?.map((img, index) => (
                <div key={index} className='mb-4'>
                  {img.base64 && (
                    <Image
                      src={`data:image/png;base64,${img.base64}`}
                      alt={`Result ${index + 1}`}
                      width={800}
                      height={600}
                      className='max-w-full h-auto rounded border'
                    />
                  )}
                  <div className='mt-2 flex gap-2'>
                    <button
                      onClick={() => downloadResult(selectedResult, index)}
                      className='px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700'
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
