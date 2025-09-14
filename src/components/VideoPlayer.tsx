/**
 * VideoPlayer Component
 *
 * A robust video player component with loading states, error handling,
 * and accessibility features following the Media Labs hooks-based architecture.
 */

'use client'

import { useState, useRef } from 'react'

interface VideoPlayerProps {
  src: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  poster?: string
  alt?: string
}

export function VideoPlayer({
  src,
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = true,
  poster,
  alt = 'Generated video content'
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleLoadStart = () => {
    setIsLoading(true)
    setHasError(false)
  }

  const handleLoadedData = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg min-h-[200px] ${className}`}>
        <div className='text-center p-4'>
          <div className='text-gray-600 mb-2'>
            <svg className='w-8 h-8 mx-auto mb-2 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            Failed to load video
          </div>
          <a
            href={src}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline text-sm'
          >
            Download video instead
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2'></div>
            <div className='text-gray-600 text-sm'>Loading video...</div>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        poster={poster}
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onError={handleError}
        className={`w-full h-auto rounded-lg ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-200`}
        aria-label={alt}
      >
        Your browser does not support the video tag.
        <a href={src} target='_blank' rel='noopener noreferrer'>
          Download video
        </a>
      </video>
    </div>
  )
}
