/**
 * ImageViewer Component
 *
 * Displays a full-size image with navigation controls and download capability.
 */

'use client'

import { DynamicImage } from './DynamicImage'
import type { ProcessedImage } from '@/hooks/useOutputProcessor'

interface ImageViewerProps {
  image: ProcessedImage
  currentIndex: number
  totalImages: number
  canNavigatePrev: boolean
  canNavigateNext: boolean
  onNavigatePrev: () => void
  onNavigateNext: () => void
  className?: string
}

export function ImageViewer({
  image,
  currentIndex,
  totalImages,
  canNavigatePrev,
  canNavigateNext,
  onNavigatePrev,
  onNavigateNext,
  className = ''
}: ImageViewerProps) {
  return (
    <div className={`border rounded-lg p-4 bg-white ${className}`}>
      {/* Header with navigation */}
      <div className='flex justify-between items-center mb-3'>
        <h4 className='font-medium'>
          Image {currentIndex + 1} of {totalImages}
        </h4>
        <div className='flex gap-2'>
          <button
            onClick={onNavigatePrev}
            disabled={!canNavigatePrev}
            className='px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-50'
          >
            ← Prev
          </button>
          <button
            onClick={onNavigateNext}
            disabled={!canNavigateNext}
            className='px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-50'
          >
            Next →
          </button>
        </div>
      </div>

      {/* Image display */}
      {image.displaySrc ? (
        <DynamicImage
          src={image.displaySrc}
          alt={`Result ${currentIndex + 1}`}
          className='max-w-full h-auto rounded border'
        />
      ) : (
        <div className='w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500'>
          No image data available
        </div>
      )}

      {/* Download button */}
      {image.downloadable && image.displaySrc && (
        <div className='mt-3'>
          <a
            href={image.displaySrc}
            download={image.filename}
            className='inline-block px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700'
          >
            📥 Download
          </a>
        </div>
      )}
    </div>
  )
}
