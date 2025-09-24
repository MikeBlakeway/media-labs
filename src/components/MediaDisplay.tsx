/**
 * MediaDisplay Component
 *
 * Unified media display component that automatically selects between
 * image and video display based on workflow output type.
 * Handles both public URLs and private S3 URLs with signed URL generation.
 */

'use client'

import Image from 'next/image'
import { VideoPlayer } from './VideoPlayer'
import { useWorkflowOutputTypeSimple } from '@/hooks/useWorkflowOutputType'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import type { TemplateMeta } from '@/lib/templates.schema'
import type { WorkflowTemplate } from '@/lib/templates.types'

interface MediaDisplayProps {
  src: string
  workflowMeta: TemplateMeta | WorkflowTemplate | null
  alt?: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

/**
 * Check if a URL is a private S3 URL that needs signed URL generation
 */
function isPrivateS3Url(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // Check if it's a Backblaze B2 S3 endpoint
    return urlObj.hostname.includes('backblazeb2.com') && urlObj.pathname.includes('/media-labs/')
  } catch {
    return false
  }
}

export function MediaDisplay({
  src,
  workflowMeta,
  alt = 'Generated content',
  className = '',
  width = 512,
  height = 512,
  priority = false
}: MediaDisplayProps) {
  const outputType = useWorkflowOutputTypeSimple(workflowMeta)

  // Use signed URL for private S3 files
  const needsSignedUrl = isPrivateS3Url(src)
  const { signedUrl, loading, error } = useSignedUrl(needsSignedUrl ? src : null)

  // Use signed URL if available, otherwise use original src
  const displaySrc = needsSignedUrl ? signedUrl : src

  // Show loading state for signed URL generation
  if (needsSignedUrl && loading) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-gray-100 ${className}`} style={{ width, height }}>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto'></div>
          <p className='text-sm text-gray-600 mt-2'>Loading secure {outputType}...</p>
        </div>
      </div>
    )
  }

  // Show error state for signed URL generation
  if (needsSignedUrl && error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-red-50 border border-red-200 ${className}`}
        style={{ width, height }}
      >
        <div className='text-center p-4'>
          <p className='text-red-600 text-sm'>Failed to load secure {outputType}</p>
          <p className='text-red-500 text-xs mt-1'>{error}</p>
        </div>
      </div>
    )
  }

  // Don't render if we need a signed URL but don't have one yet
  if (needsSignedUrl && !displaySrc) {
    return null
  }

  if (outputType === 'video') {
    return (
      <VideoPlayer
        src={displaySrc!}
        className={className}
        muted={true}
        loop={false}
        alt={alt}
        enableSignedUrlRefresh={needsSignedUrl}
        onError={error => console.error('Video playback error:', error)}
      />
    )
  }

  return (
    <Image
      src={displaySrc!}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={`rounded-lg ${className}`}
      style={{ objectFit: 'contain' }}
    />
  )
}

/**
 * MediaGallery Component
 *
 * Displays multiple media items in a grid layout, automatically
 * handling both images and videos based on workflow output type.
 */
interface MediaGalleryProps {
  items: Array<{
    src: string
    filename?: string
    type?: string
  }>
  workflowMeta: TemplateMeta | WorkflowTemplate | null
  className?: string
  gridCols?: number
}

export function MediaGallery({ items, workflowMeta, className = '', gridCols = 2 }: MediaGalleryProps) {
  const outputType = useWorkflowOutputTypeSimple(workflowMeta)

  if (items.length === 0) {
    return <div className='text-center p-8 text-gray-500'>No {outputType} results available</div>
  }

  const gridClass =
    gridCols === 1
      ? 'grid-cols-1'
      : gridCols === 3
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2'

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className='text-lg font-semibold capitalize'>
        {outputType} Results ({items.length})
      </h3>
      <div className={`grid ${gridClass} gap-4`}>
        {items.map((item, index) => (
          <div key={index} className='border rounded-lg p-4 bg-white'>
            <MediaDisplay
              src={item.src}
              workflowMeta={workflowMeta}
              alt={`Generated ${outputType} ${index + 1}`}
              className='w-full'
              priority={index === 0}
            />
            {item.filename && (
              <p className='text-sm text-gray-600 mt-2 truncate' title={item.filename}>
                {item.filename}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
