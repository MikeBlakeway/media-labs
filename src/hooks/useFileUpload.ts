/**
 * useFileUpload Hook
 *
 * Manages file uploads with progress tracking and validation.
 * Extracts file upload logic from the main workflow component.
 */

import { useCallback, useState } from 'react'
import { z } from 'zod'

// Upload response schema (matches the original component)
const UploadResponseSchema = z.object({
  key: z.string(),
  workerPath: z.string(),
  jobId: z.string(),
  filename: z.string(),
  size: z.number(),
  contentType: z.string()
})

export interface UploadState {
  file: File
  fieldId: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  workerPath?: string
  error?: string
}

export interface UseFileUploadResult {
  // Upload state
  uploads: UploadState[]
  uploading: boolean

  // Actions
  uploadFile: (file: File, fieldId: string) => Promise<string | null>
  uploadFiles: (files: Array<{ file: File; fieldId: string }>) => Promise<Record<string, string>>
  removeUpload: (fieldId: string) => void
  clearUploads: () => void

  // Computed values
  hasUploads: boolean
  completedUploads: UploadState[]
  failedUploads: UploadState[]
}

export function useFileUpload(): UseFileUploadResult {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [uploading, setUploading] = useState(false)

  // Upload a single file
  const uploadFile = useCallback(async (file: File, fieldId: string): Promise<string | null> => {
    // Add to upload state
    const uploadState: UploadState = {
      file,
      fieldId,
      status: 'pending',
      progress: 0
    }

    setUploads(prev => [...prev.filter(u => u.fieldId !== fieldId), uploadState])
    setUploading(true)

    try {
      // Update status to uploading
      setUploads(prev =>
        prev.map(u => (u.fieldId === fieldId ? { ...u, status: 'uploading' as const, progress: 0 } : u))
      )

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/volume/upload', {
        method: 'POST',
        body: formData
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const uploadResult = UploadResponseSchema.safeParse(responseData)
      if (!uploadResult.success) {
        console.error('Upload response validation failed:', uploadResult.error)
        throw new Error('Invalid upload response format')
      }

      // Update status to completed
      setUploads(prev =>
        prev.map(u =>
          u.fieldId === fieldId
            ? {
                ...u,
                status: 'completed' as const,
                progress: 100,
                workerPath: uploadResult.data.workerPath
              }
            : u
        )
      )

      return uploadResult.data.workerPath
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'

      // Update status to failed
      setUploads(prev =>
        prev.map(u => (u.fieldId === fieldId ? { ...u, status: 'failed' as const, error: errorMessage } : u))
      )

      console.error('File upload error:', error)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  // Upload multiple files
  const uploadFiles = useCallback(
    async (files: Array<{ file: File; fieldId: string }>): Promise<Record<string, string>> => {
      setUploading(true)
      const results: Record<string, string> = {}

      try {
        // Upload files sequentially to avoid overwhelming the server
        for (const { file, fieldId } of files) {
          const workerPath = await uploadFile(file, fieldId)
          if (workerPath) {
            results[fieldId] = workerPath
          }
        }

        return results
      } finally {
        setUploading(false)
      }
    },
    [uploadFile]
  )

  // Remove upload by field ID
  const removeUpload = useCallback((fieldId: string) => {
    setUploads(prev => prev.filter(u => u.fieldId !== fieldId))
  }, [])

  // Clear all uploads
  const clearUploads = useCallback(() => {
    setUploads([])
  }, [])

  // Computed values
  const hasUploads = uploads.length > 0
  const completedUploads = uploads.filter(u => u.status === 'completed')
  const failedUploads = uploads.filter(u => u.status === 'failed')

  return {
    uploads,
    uploading,
    uploadFile,
    uploadFiles,
    removeUpload,
    clearUploads,
    hasUploads,
    completedUploads,
    failedUploads
  }
}
