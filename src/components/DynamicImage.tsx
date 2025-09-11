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
  // Data URL: Only allow valid image types and strict base64 encoding
  const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|bmp|svg\+xml);base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  // Blob URL: Only allow blob URLs with valid origin and UUID
  const blobUrlPattern = /^blob:(https?:\/\/[a-zA-Z0-9\-\.]+(:[0-9]+)?(\/[^\s]*)?)\/[a-f0-9\-]{36,}$/i;
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
