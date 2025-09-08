/**
 * Dynamic Image Component
 *
 * For displaying dynamically generated images (base64, blob URLs, etc.)
 * where Next.js Image optimization isn't suitable
 */

'use client'

interface DynamicImageProps {
  src: string
  alt: string
  className?: string
  onClick?: () => void
}

export function DynamicImage({ src, alt, className, onClick }: DynamicImageProps) {
  // Suppress ESLint warning for this specific use case of dynamic images
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onClick={onClick} />
}
