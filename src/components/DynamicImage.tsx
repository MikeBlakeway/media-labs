/**
 * Dynamic Image Component
 *
 * For displaying dynamically generated images (base64, blob URLs, etc.)
 * where Next.js Image optimization isn't suitable
 */

'use client'

import Image from 'next/image'
import { isValidS3Url } from '@/lib/s3.utils'

interface DynamicImageProps {
  src: string
  alt: string
  className?: string
  onClick?: () => void
}

// Helper function to validate data URL, blob URL, or S3 URL
function isValidDynamicImageSrc(src: string): boolean {
  // Data URL: data:[<mediatype>][;base64],<data>
  // Data URL: Only allow valid image types and strict base64 encoding
  const dataUrlPattern =
    /^data:image\/(png|jpeg|jpg|gif|webp|bmp|svg\+xml);base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
  // Blob URL: Only allow blob URLs with valid origin and UUID
  const blobUrlPattern = /^blob:(https?:\/\/[a-zA-Z0-9\-\.]+(:[0-9]+)?(\/[^\s]*)?)\/[a-f0-9\-]{36,}$/i
  // S3 URL: Check if it's a valid S3 URL
  return dataUrlPattern.test(src) || blobUrlPattern.test(src) || isValidS3Url(src)
}

export function DynamicImage({ src, alt, className, onClick }: DynamicImageProps) {
  // Validate the image source
  if (!isValidDynamicImageSrc(src)) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`} aria-label={alt}>
        <span className='text-gray-500 text-sm'>Invalid image source</span>
      </div>
    )
  }

  // For S3 URLs, we can use Next.js Image with unoptimized flag
  if (isValidS3Url(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        onClick={onClick}
        width={800} // Default dimensions - adjust as needed
        height={600}
        unoptimized // Disable optimization for external S3 URLs
      />
    )
  }

  // For data URLs and blob URLs, use regular img tag
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onClick={onClick} />
}
