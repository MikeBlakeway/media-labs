/**
 * useOutputProcessor Hook
 *
 * Processes and normalizes workflow output data from different formats.
 * Handles image/video processing and metadata extraction.
 */

import { useMemo } from 'react'
import { isValidS3Url } from '@/lib/s3.utils'

export interface ProcessedImage {
  id: string
  base64?: string
  url?: string
  filename?: string
  displaySrc: string
  downloadable: boolean
}

export interface ProcessedOutput {
  images: ProcessedImage[]
  videos: string[]
  errors: string[]
  hasImages: boolean
  hasVideos: boolean
  hasErrors: boolean
  imageCount: number
  videoCount: number
}

interface RunpodOutputImage {
  base64?: string
  url?: string
  filename?: string
  // RunPod format support
  data?: string
  type?: 'base64' | 's3_url'
}

interface WorkflowOutput {
  images?: RunpodOutputImage[]
  videos?: string[]
  errors?: string[]
  [key: string]: unknown
}

export interface UseOutputProcessorResult {
  processedOutput: ProcessedOutput
  isCompleted: boolean
  isFailed: boolean
  shouldShowResults: boolean
}

export function useOutputProcessor(output: WorkflowOutput | null, status: string): UseOutputProcessorResult {
  const processedOutput = useMemo((): ProcessedOutput => {
    if (!output) {
      return {
        images: [],
        videos: [],
        errors: [],
        hasImages: false,
        hasVideos: false,
        hasErrors: false,
        imageCount: 0,
        videoCount: 0
      }
    }

    // Process images
    const processedImages: ProcessedImage[] = (output.images || []).map((img, index) => {
      const base64Data = img.base64 || (img.type === 'base64' ? img.data : undefined)
      const imageUrl = img.url || (img.type === 's3_url' ? img.data : undefined)
      const filename = img.filename || `result-${index + 1}.png`

      let displaySrc: string
      let downloadable = false

      if (base64Data) {
        displaySrc = `data:image/png;base64,${base64Data}`
        downloadable = true
      } else if (imageUrl && isValidS3Url(imageUrl)) {
        displaySrc = imageUrl
        downloadable = true // S3 URLs are downloadable
      } else if (imageUrl) {
        displaySrc = imageUrl
        downloadable = false // Other external URLs typically not downloadable
      } else {
        displaySrc = '' // Will be handled by fallback UI
        downloadable = false
      }

      return {
        id: `image-${index}`,
        base64: base64Data,
        url: imageUrl,
        filename,
        displaySrc,
        downloadable
      }
    })

    // Process videos
    const processedVideos = output.videos || []

    // Process errors
    const processedErrors = output.errors || []

    return {
      images: processedImages,
      videos: processedVideos,
      errors: processedErrors,
      hasImages: processedImages.length > 0,
      hasVideos: processedVideos.length > 0,
      hasErrors: processedErrors.length > 0,
      imageCount: processedImages.length,
      videoCount: processedVideos.length
    }
  }, [output])

  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const shouldShowResults = isCompleted && output !== null

  return {
    processedOutput,
    isCompleted,
    isFailed,
    shouldShowResults
  }
}
