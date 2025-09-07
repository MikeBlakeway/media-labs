const SAFE = /[^a-zA-Z0-9._-]/g

export function sanitizeFilename(name: string): string {
  const base = name.replaceAll('\\', '/').split('/').pop() || 'file'
  const cleaned = base.replace(SAFE, '_')
  return cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned
}

export function ensureEnv(name: string, val: string | undefined): string {
  if (!val) throw new Error(`Missing env var: ${name}`)
  return val
}

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024 // 200MB default cap; adjust as needed

export function isAllowedMime(type: string): boolean {
  // Extend as needed
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'].includes(
    type
  )
}
