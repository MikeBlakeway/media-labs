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

import { useState } from 'react'
import Image from 'next/image'
import { useResultHistory, type HistoryItem } from '@/hooks/useResultHistory'

interface ResultHistoryProps {
  currentSlug: string
  onSelectResult?: (result: HistoryItem) => void
}

export function ResultHistory({ currentSlug, onSelectResult }: ResultHistoryProps) {
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null)

  // Use our history hook for all data management
  const history = useResultHistory(currentSlug)

  // Utility functions
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

  const handleResultClick = (item: HistoryItem) => {
    setSelectedResult(item)
    onSelectResult?.(item)
  }

  const closeModal = () => {
    setSelectedResult(null)
  }

  return (
    <div className='mt-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='font-medium text-gray-800'>Result History</h3>
        <div className='flex gap-2'>
          <button
            onClick={() => history.setFilter('current')}
            className={`px-3 py-1 text-sm rounded ${
              history.filter === 'current' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => history.setFilter('all')}
            className={`px-3 py-1 text-sm rounded ${
              history.filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={history.loadHistory}
            className='px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded'
            disabled={history.loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {history.loading && (
        <div className='flex items-center justify-center py-8'>
          <div className='w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
          <span className='ml-2 text-gray-600'>Loading history...</span>
        </div>
      )}

      {history.error && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-4'>
          <p className='text-red-700 text-sm'>{history.error}</p>
          <button onClick={history.loadHistory} className='mt-2 text-red-600 hover:text-red-800 text-sm underline'>
            Try again
          </button>
        </div>
      )}

      {!history.loading && !history.error && history.history.length === 0 && (
        <div className='text-center py-8 text-gray-500'>
          <p>No workflow results yet.</p>
          <p className='text-sm mt-1'>Results will appear here after running workflows.</p>
        </div>
      )}

      {!history.loading && history.history.length > 0 && (
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {history.history.map((item, index) => {
            const thumbnail = history.getThumbnail(item)
            const statusColorClass = getStatusColor(item.status)

            return (
              <div
                key={`${item.jobId}-${index}`}
                className='relative group rounded-lg border border-gray-200 bg-white p-3 hover:shadow-md transition-shadow cursor-pointer'
                onClick={() => handleResultClick(item)}
              >
                {/* Thumbnail */}
                <div className='aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden'>
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={`Result ${index + 1}`}
                      width={200}
                      height={200}
                      className='w-full h-full object-cover hover:scale-105 transition-transform'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center text-gray-400'>
                      {item.status === 'COMPLETED' ? '🖼️' : '❌'}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className={`inline-block px-2 py-1 text-xs rounded ${statusColorClass} mb-2`}>{item.status}</div>

                {/* Metadata */}
                <div className='text-xs text-gray-600 space-y-1'>
                  <div>{formatTimeAgo(item.timestamp)}</div>
                  {item.slug && history.filter === 'all' && (
                    <div className='font-mono text-xs bg-gray-100 px-1 rounded'>{item.slug}</div>
                  )}
                  {item.duration && <div>⏱️ {Math.round(item.duration / 1000)}s</div>}
                  {item.output?.images && (
                    <div>
                      🖼️ {item.output.images.length} image{item.output.images.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Download Button */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    history.downloadResult(item)
                  }}
                  className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-md hover:bg-gray-50'
                  title='Download result'
                >
                  ⬇️
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Result Detail Modal */}
      {selectedResult && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-medium text-lg'>Result Details</h3>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl'>
                ✕
              </button>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className='font-medium'>Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedResult.status)}`}>
                    {selectedResult.status}
                  </span>
                </div>
                <div>
                  <span className='font-medium'>Time:</span>
                  <span className='ml-2'>{formatTimeAgo(selectedResult.timestamp)}</span>
                </div>
                <div>
                  <span className='font-medium'>Job ID:</span>
                  <span className='ml-2 font-mono text-xs'>{selectedResult.jobId}</span>
                </div>
                {selectedResult.duration && (
                  <div>
                    <span className='font-medium'>Duration:</span>
                    <span className='ml-2'>{Math.round(selectedResult.duration / 1000)}s</span>
                  </div>
                )}
              </div>

              {/* Images Grid */}
              {selectedResult.output?.images && selectedResult.output.images.length > 0 && (
                <div>
                  <h4 className='font-medium mb-2'>Generated Images</h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {selectedResult.output.images.map((img, imgIndex) => {
                      const base64Data = img.base64 || img.data
                      const imageUrl = img.url

                      return (
                        <div key={imgIndex} className='space-y-2'>
                          {base64Data ? (
                            <Image
                              src={`data:image/png;base64,${base64Data}`}
                              alt={`Result ${imgIndex + 1}`}
                              width={400}
                              height={400}
                              className='w-full rounded-lg border'
                            />
                          ) : imageUrl ? (
                            <a
                              href={imageUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='block text-blue-600 hover:underline'
                            >
                              🔗 {img.filename || `Image ${imgIndex + 1}`}
                            </a>
                          ) : (
                            <div className='w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500'>
                              No preview available
                            </div>
                          )}

                          <div className='flex gap-2'>
                            <button
                              onClick={() => history.downloadResult(selectedResult, imgIndex)}
                              className='px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200'
                            >
                              ⬇️ Download
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Errors */}
              {selectedResult.output?.errors && selectedResult.output.errors.length > 0 && (
                <div>
                  <h4 className='font-medium mb-2 text-red-700'>Errors</h4>
                  <div className='space-y-2'>
                    {selectedResult.output.errors.map((error, errorIndex) => (
                      <div
                        key={errorIndex}
                        className='bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 font-mono'
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
