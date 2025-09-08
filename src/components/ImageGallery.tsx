/**
 * ImageGallery Component
 *
 * Displays a grid of image thumbnails with selection capability.
 */

'use client'

import { DynamicImage } from './DynamicImage'
import type { ProcessedImage } from '@/hooks/useOutputProcessor'

interface ImageGalleryProps {
  images: ProcessedImage[]
  selectedIndex: number
  onSelect: (index: number) => void
  className?: string
}

export function ImageGallery({ images, selectedIndex, onSelect, className = '' }: ImageGalleryProps) {
  if (images.length === 0) return null

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${className}`}>
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`relative cursor-pointer hover:ring-2 hover:ring-green-400 rounded-lg overflow-hidden ${
            index === selectedIndex ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => onSelect(index)}
        >
          {image.displaySrc ? (
            <DynamicImage src={image.displaySrc} alt={`Result ${index + 1}`} className='w-full h-32 object-cover' />
          ) : (
            <div className='w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500'>
              {image.filename || `Image ${index + 1}`}
            </div>
          )}
          <div className='absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded'>
            {index + 1}
          </div>
        </div>
      ))}
    </div>
  )
}
