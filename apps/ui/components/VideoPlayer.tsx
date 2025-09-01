'use client'

import { useRef, useState } from 'react'

export interface VideoPlayerProps {
  /** URL of the video to play */
  videoUrl: string
  /** Optional download URL (will use videoUrl if not provided) */
  downloadUrl?: string
  /** Optional poster image URL */
  posterUrl?: string
  /** Additional CSS classes */
  className?: string
  /** Video title for accessibility */
  title?: string
}

/**
 * Video player component with download functionality
 * Optimized for MP4 video playback with user-friendly controls
 */
export function VideoPlayer({
  videoUrl,
  downloadUrl,
  posterUrl,
  className = '',
  title = 'Generated Video'
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  /**
   * Handle video download
   * Uses the download URL if provided, otherwise falls back to video URL
   */
  const handleDownload = async (): Promise<void> => {
    const urlToDownload = downloadUrl || videoUrl
    setIsDownloading(true)
    setDownloadError(null)

    try {
      // Fetch the video blob
      const response = await fetch(urlToDownload)
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const blob = await response.blob()
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename from URL or use default
      const urlPath = new URL(urlToDownload).pathname
      const filename = urlPath.split('/').pop() || 'video.mp4'
      link.download = filename
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up blob URL
      URL.revokeObjectURL(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      setDownloadError(errorMessage)
      console.error('Video download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  /**
   * Handle video fullscreen toggle
   */
  const handleFullscreen = (): void => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Video Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>

      {/* Video Player */}
      <div className="relative">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          controls
          preload="metadata"
          className="w-full h-auto max-h-96 bg-black"
          aria-label={title}
        >
          Your browser does not support the video tag.
        </video>

        {/* Fullscreen Button (overlay) */}
        <button
          onClick={handleFullscreen}
          className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-md transition-all opacity-0 hover:opacity-100 focus:opacity-100"
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Download Section */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Ready to download • MP4 format
          </div>
          
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download Video</span>
              </>
            )}
          </button>
        </div>

        {/* Download Error */}
        {downloadError && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Download failed: {downloadError}
          </div>
        )}
      </div>
    </div>
  )
}