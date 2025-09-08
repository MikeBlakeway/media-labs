/**
 * Workflow Utilities
 *
 * Helper functions for workflow form processing, file handling, and display logic.
 * Extracted from WorkflowContainer to improve maintainability and reusability.
 */

import type { UseFileUploadResult } from '@/hooks/useFileUpload'

// Types for patch processing
export interface FormPatch {
  nodeId: string
  inputKey: string
  value: string | number | boolean | File | null
}

export interface ProcessedPatch {
  nodeId: string
  inputKey: string
  value: string | number | boolean
}

/**
 * Safely stringify unknown values for display
 */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Process form patches by uploading files and converting to worker paths
 */
export async function processFormPatches(
  patches: FormPatch[],
  uploadFile: UseFileUploadResult['uploadFile']
): Promise<ProcessedPatch[] | null> {
  const processedPatches: ProcessedPatch[] = []

  for (const patch of patches) {
    if (patch.value instanceof File) {
      // Upload file and get worker path
      const workerPath = await uploadFile(patch.value, `${patch.nodeId}_${patch.inputKey}`)
      if (!workerPath) {
        console.error('File upload failed for:', patch)
        return null // Return null to indicate failure
      }
      processedPatches.push({
        nodeId: patch.nodeId,
        inputKey: patch.inputKey,
        value: workerPath
      })
    } else if (patch.value !== null) {
      processedPatches.push({
        nodeId: patch.nodeId,
        inputKey: patch.inputKey,
        value: patch.value
      })
    }
  }

  return processedPatches
}

/**
 * Validate form submission prerequisites
 */
export function validateSubmissionPrerequisites(
  hasTemplate: boolean,
  allModelsPresent: boolean,
  formIsValid: boolean
): { isValid: boolean; errorMessage?: string } {
  if (!hasTemplate) {
    return {
      isValid: false,
      errorMessage: 'Workflow template not loaded'
    }
  }

  if (!allModelsPresent) {
    return {
      isValid: false,
      errorMessage: 'Required models are missing. Please upload them and click Recheck.'
    }
  }

  if (!formIsValid) {
    return {
      isValid: false,
      errorMessage: 'Form validation failed. Please check your inputs.'
    }
  }

  return { isValid: true }
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Get appropriate button text based on current state
 */
export function getSubmitButtonText(isSubmitting: boolean, isUploading: boolean): string {
  if (isSubmitting) return 'Submitting...'
  if (isUploading) return 'Uploading...'
  return 'Generate'
}

/**
 * Determine if submit button should be disabled
 */
export function shouldDisableSubmit(
  isSubmitting: boolean,
  isUploading: boolean,
  allModelsPresent: boolean,
  formIsValid: boolean
): boolean {
  return isSubmitting || isUploading || !allModelsPresent || !formIsValid
}
