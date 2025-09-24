/**
 * VideoPlayer Component
 *
 * A comprehensive video player component with custom controls, keyboard navigation,
 * signed URL refresh handling, and full accessibility support.
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSignedUrl } from '@/hooks/useSignedUrl'

interface VideoPlayerProps {
  src: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  poster?: string
  alt?: string
  onError?: (error: string) => void
  enableSignedUrlRefresh?: boolean
}

export function VideoPlayer({
  src,
  className = '',
  autoPlay = false,
  loop = false,
  muted = true,
  poster,
  alt = 'Generated video content',
  onError,
  enableSignedUrlRefresh = true
}: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [urlRefreshAttempted, setUrlRefreshAttempted] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if this is a signed URL that might need refresh
  const isSignedUrl = src.includes('X-Amz-Credential') || src.includes('Signature')

  // Use signed URL refresh for expired URLs (only if enabled and is a signed URL)
  const { signedUrl, refresh: refreshSignedUrl } = useSignedUrl(enableSignedUrlRefresh && isSignedUrl ? src : null, {
    autoRefresh: true
  })

  // Use refreshed URL if available, otherwise original src
  const videoSrc = enableSignedUrlRefresh && signedUrl ? signedUrl : src

  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
    setHasError(false)
  }, [])

  const handleLoadedData = useCallback(() => {
    setIsLoading(false)
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [])

  const handleError = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    // If this is a signed URL and we haven't tried refreshing yet, attempt refresh
    if (enableSignedUrlRefresh && isSignedUrl && !urlRefreshAttempted) {
      setUrlRefreshAttempted(true)
      try {
        refreshSignedUrl()
        return // Don't set error state yet, wait for refresh
      } catch (error) {
        console.error('Failed to refresh signed URL:', error)
      }
    }

    setIsLoading(false)
    setHasError(true)
    const errorMessage = `Failed to load video: ${video.error?.message || 'Unknown error'}`
    onError?.(errorMessage)
  }, [enableSignedUrlRefresh, isSignedUrl, urlRefreshAttempted, refreshSignedUrl, onError])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  const handlePlay = useCallback(() => setIsPlaying(true), [])
  const handlePause = useCallback(() => setIsPlaying(false), [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    setCurrentTime(time)
  }, [])

  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = newVolume
    setVolume(newVolume)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }, [])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }, [isPlaying])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const video = videoRef.current
      if (!video) return

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          handleSeek(Math.max(0, currentTime - 5))
          break
        case 'ArrowRight':
          event.preventDefault()
          handleSeek(Math.min(duration, currentTime + 5))
          break
        case 'ArrowUp':
          event.preventDefault()
          handleVolumeChange(Math.min(1, volume + 0.1))
          break
        case 'ArrowDown':
          event.preventDefault()
          handleVolumeChange(Math.max(0, volume - 0.1))
          break
        case 'f':
        case 'F':
          event.preventDefault()
          toggleFullscreen()
          break
        case 'm':
        case 'M':
          event.preventDefault()
          video.muted = !video.muted
          break
      }
    },
    [togglePlay, currentTime, duration, handleSeek, volume, handleVolumeChange, toggleFullscreen]
  )

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Format time for display
  const formatTime = useCallback((time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-panel rounded-lg min-h-[200px] border border-default ${className}`}
      >
        <div className='text-center p-4'>
          <div className='text-text-secondary mb-4'>
            <svg
              className='w-12 h-12 mx-auto mb-3 text-text-muted'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <p className='text-text-primary font-medium'>Failed to load video</p>
            <p className='text-text-muted text-sm mt-1'>The video could not be played</p>
          </div>
          <div className='flex gap-2 justify-center'>
            <button
              onClick={() => {
                setHasError(false)
                setUrlRefreshAttempted(false)
                videoRef.current?.load()
              }}
              className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-hover transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
            >
              Retry
            </button>
            <a
              href={src}
              target='_blank'
              rel='noopener noreferrer'
              className='px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/80 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
            >
              Download
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-lg overflow-hidden ${className}`}
      onMouseEnter={showControlsTemporarily}
      onMouseMove={showControlsTemporarily}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role='application'
      aria-label={`Video player: ${alt}`}
    >
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-panel/90 backdrop-blur-sm z-20'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3'></div>
            <div className='text-text-primary text-sm font-medium'>Loading video...</div>
            <div className='text-text-muted text-xs mt-1'>Please wait</div>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={videoSrc}
        controls={false} // We use custom controls
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        poster={poster}
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        className='w-full h-auto'
        aria-label={alt}
        onClick={togglePlay}
      >
        Your browser does not support the video tag.
        <a href={videoSrc} target='_blank' rel='noopener noreferrer'>
          Download video
        </a>
      </video>

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className='p-4 space-y-3'>
          {/* Progress Bar */}
          <div className='flex items-center gap-3'>
            <span className='text-white text-sm font-mono min-w-[40px]'>{formatTime(currentTime)}</span>
            <div
              className='flex-1 h-2 bg-white/30 rounded-full cursor-pointer'
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                handleSeek(percent * duration)
              }}
            >
              <div
                className='h-full bg-primary rounded-full relative'
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className='absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm'></div>
              </div>
            </div>
            <span className='text-white text-sm font-mono min-w-[40px]'>{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                className='flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50'
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? (
                  <svg className='w-5 h-5 text-white' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M6 4h4v16H6V4zm8 0h4v16h-4V4z' />
                  </svg>
                ) : (
                  <svg className='w-5 h-5 text-white ml-0.5' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M8 5v14l11-7z' />
                  </svg>
                )}
              </button>

              {/* Volume Control */}
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => {
                    const video = videoRef.current
                    if (video) {
                      video.muted = !video.muted
                    }
                  }}
                  className='flex items-center justify-center w-8 h-8 bg-white/20 hover:bg-white/30 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50'
                  aria-label={muted ? 'Unmute video' : 'Mute video'}
                >
                  <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 24 24'>
                    {volume === 0 || muted ? (
                      <path d='M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z' />
                    ) : (
                      <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' />
                    )}
                  </svg>
                </button>
                <input
                  type='range'
                  min='0'
                  max='1'
                  step='0.1'
                  value={volume}
                  onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                  className='w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50'
                  style={{
                    background: `linear-gradient(to right, #ffffff ${volume * 100}%, rgba(255,255,255,0.3) ${
                      volume * 100
                    }%)`
                  }}
                  aria-label='Volume'
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className='flex items-center gap-2'>
              <button
                onClick={toggleFullscreen}
                className='flex items-center justify-center w-8 h-8 bg-white/20 hover:bg-white/30 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50'
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 24 24'>
                  {isFullscreen ? (
                    <path d='M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z' />
                  ) : (
                    <path d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hints (show on focus) */}
      <div className='sr-only'>Press Space to play/pause, arrow keys to seek, F for fullscreen, M to mute</div>
    </div>
  )
}
