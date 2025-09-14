/**
 * VideoDisplay Component
 *
 * Displays video outputs from workflow results.
 * Enhanced for V2V workflows with input/output comparison support.
 */

'use client'

import { useState, useEffect } from 'react'

interface VideoDisplayProps {
  videos: string[]
  className?: string
  inputVideo?: string // For V2V input/output comparison
  comparisonMode?: boolean // Enable side-by-side comparison
}

export function VideoDisplay({ videos, className = '', inputVideo, comparisonMode = false }: VideoDisplayProps) {
  const [selectedVideo, setSelectedVideo] = useState(0)
  // Initialize to false; keep in sync with props via useEffect so changes to
  // `comparisonMode` or `inputVideo` after mount update the state.
  const [showComparison, setShowComparison] = useState<boolean>(false)

  useEffect(() => {
    setShowComparison(Boolean(comparisonMode && inputVideo))
  }, [comparisonMode, inputVideo])

  // Ensure selectedVideo stays within bounds if the videos array changes.
  useEffect(() => {
    setSelectedVideo(prev => {
      if (videos.length === 0) return 0
      return prev >= videos.length ? 0 : prev
    })
  }, [videos])

  if (videos.length === 0) return null

  // Safe fallback in case selectedVideo is out of bounds for any reason.
  const currentVideo = videos[selectedVideo] ?? videos[0]

  return (
    <div className={className}>
      <div className='flex items-center justify-between mb-2'>
        <h4 className='font-medium text-green-800'>
          Videos {videos.length > 1 && `(${selectedVideo + 1}/${videos.length})`}
        </h4>
        {inputVideo && (
          <button
            onClick={() => setShowComparison(!showComparison)}
            className='text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors'
          >
            {showComparison ? 'Hide Comparison' : 'Compare with Input'}
          </button>
        )}
      </div>

      {showComparison && inputVideo ? (
        // Side-by-side comparison mode
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <h5 className='text-sm font-medium text-gray-700 mb-1'>Input Video</h5>
            <video controls className='w-full rounded border'>
              <source src={inputVideo} />
              Your browser does not support video playback.
            </video>
          </div>
          <div>
            <h5 className='text-sm font-medium text-gray-700 mb-1'>Processed Video</h5>
            <video controls className='w-full rounded border'>
              <source src={currentVideo} />
              Your browser does not support video playback.
            </video>
          </div>
        </div>
      ) : (
        // Standard display mode
        <div className='space-y-2'>
          <video controls className='max-w-full rounded border'>
            <source src={currentVideo} />
            Your browser does not support video playback.
          </video>
        </div>
      )}

      {/* Video selector for multiple outputs */}
      {videos.length > 1 && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedVideo(index)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                index === selectedVideo ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Video {index + 1}
            </button>
          ))}
        </div>
      )}

      {/* Download controls */}
      <div className='mt-3 flex gap-2'>
        <a
          href={currentVideo}
          download
          className='text-xs bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded transition-colors'
        >
          Download Current Video
        </a>
        {showComparison && inputVideo && (
          <a
            href={inputVideo}
            download
            className='text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded transition-colors'
          >
            Download Input Video
          </a>
        )}
      </div>
    </div>
  )
}
