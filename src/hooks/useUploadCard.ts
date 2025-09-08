import { useState, useCallback } from 'react'
import { z } from 'zod'

// Upload response schema (matches the UploadCard component)
const UploadResponseSchema = z.object({
  key: z.string(),
  workerPath: z.string(),
  jobId: z.string(),
  filename: z.string(),
  size: z.number(),
  contentType: z.string()
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>

export interface UseUploadCardResult {
  // State
  file: File | null
  jobId: string
  result: UploadResponse | null
  error: string
  uploading: boolean

  // Actions
  setFile: (file: File | null) => void
  setJobId: (jobId: string) => void
  uploadFile: () => Promise<void>
  clearResult: () => void

  // Computed
  canUpload: boolean
}

/**
 * Hook for managing upload card functionality.
 * Simplified version focused on single file uploads with optional jobId.
 */
export function useUploadCard(): UseUploadCardResult {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string>('')
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [uploading, setUploading] = useState<boolean>(false)

  const uploadFile = useCallback(async () => {
    setError('')
    setResult(null)

    if (!file) {
      setError('Pick a file first')
      return
    }

    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      if (jobId.trim()) {
        fd.append('jobId', jobId.trim())
      }

      const res = await fetch('/api/volume/upload', {
        method: 'POST',
        body: fd
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed')
      }

      // Validate response format
      const parsed = UploadResponseSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Upload response validation failed:', parsed.error)
        throw new Error('Invalid upload response format')
      }

      setResult(parsed.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }, [file, jobId])

  const clearResult = useCallback(() => {
    setResult(null)
    setError('')
  }, [])

  // Computed values
  const canUpload = Boolean(file && !uploading)

  return {
    // State
    file,
    jobId,
    result,
    error,
    uploading,

    // Actions
    setFile,
    setJobId,
    uploadFile,
    clearResult,

    // Computed
    canUpload
  }
}
