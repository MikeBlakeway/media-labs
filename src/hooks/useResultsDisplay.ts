/**
 * useResultsDisplay Hook
 *
 * Manages display state for workflow results including image selection and navigation.
 * Handles gallery navigation and selection logic.
 */

import { useCallback, useState } from 'react'
import type { ProcessedImage } from './useOutputProcessor'

export interface UseResultsDisplayResult {
  // Selection state
  selectedImageIndex: number
  selectedImage: ProcessedImage | null

  // Navigation
  canNavigatePrev: boolean
  canNavigateNext: boolean

  // Actions
  selectImage: (index: number) => void
  navigatePrev: () => void
  navigateNext: () => void
  resetSelection: () => void
}

export function useResultsDisplay(images: ProcessedImage[]): UseResultsDisplayResult {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)

  // Get currently selected image
  const selectedImage = images.length > 0 ? images[selectedImageIndex] || null : null

  // Navigation state
  const canNavigatePrev = selectedImageIndex > 0
  const canNavigateNext = selectedImageIndex < images.length - 1

  // Select specific image by index
  const selectImage = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        setSelectedImageIndex(index)
      }
    },
    [images.length]
  )

  // Navigate to previous image
  const navigatePrev = useCallback(() => {
    setSelectedImageIndex(prev => Math.max(0, prev - 1))
  }, [])

  // Navigate to next image
  const navigateNext = useCallback(() => {
    setSelectedImageIndex(prev => Math.min(images.length - 1, prev + 1))
  }, [images.length])

  // Reset selection to first image
  const resetSelection = useCallback(() => {
    setSelectedImageIndex(0)
  }, [])

  return {
    // Selection state
    selectedImageIndex,
    selectedImage,

    // Navigation
    canNavigatePrev,
    canNavigateNext,

    // Actions
    selectImage,
    navigatePrev,
    navigateNext,
    resetSelection
  }
}
