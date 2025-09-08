/**
 * VideoDisplay Component
 *
 * Displays video outputs from workflow results.
 */

'use client'

interface VideoDisplayProps {
  videos: string[]
  className?: string
}

export function VideoDisplay({ videos, className = '' }: VideoDisplayProps) {
  if (videos.length === 0) return null

  return (
    <div className={className}>
      <h4 className='font-medium text-green-800 mb-2'>Videos</h4>
      <div className='space-y-2'>
        {videos.map((video, index) => (
          <video key={index} controls className='max-w-full rounded border'>
            <source src={video} />
            Your browser does not support video playback.
          </video>
        ))}
      </div>
    </div>
  )
}
