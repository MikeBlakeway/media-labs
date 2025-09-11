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

// Helper function to validate data URL or blob URL
function isValidDynamicImageSrc(src: string): boolean {
  // Data URL: data:[<mediatype>][;base64],<data>
  const dataUrlPattern = /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+$/;
  // Blob URL: blob:<origin>/<uuid>
  const blobUrlPattern = /^blob:(https?:\/\/)?[^\s]+$/;
  return dataUrlPattern.test(src) || blobUrlPattern.test(src);
}

export function DynamicImage({ src, alt, className, onClick }: DynamicImageProps) {
  // Suppress ESLint warning for this specific use case of dynamic images
  // eslint-disable-next-line @next/next/no-img-element
  if (!isValidDynamicImageSrc(src)) {
    // Optionally, render a placeholder or nothing if src is invalid
    return <span className={className} aria-label={alt}>Invalid image source</span>;
  }
  return <img src={src} alt={alt} className={className} onClick={onClick} />
}
