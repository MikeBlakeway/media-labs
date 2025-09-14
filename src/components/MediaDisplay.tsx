/**
 * MediaDisplay Component
 *
 * Unified media display component that automatically selects between
 * image and video display based on workflow output type.
 */

'use client'

import Image from 'next/image'
import { VideoPlayer } from './VideoPlayer'
import { useWorkflowOutputTypeSimple } from '@/hooks/useWorkflowOutputType'
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

  if (outputType === 'video') {
    return <VideoPlayer src={src} className={className} controls={true} muted={true} loop={false} alt={alt} />
  }

  return (
    <Image
      src={src}
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
