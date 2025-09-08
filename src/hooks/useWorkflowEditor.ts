/**
 * useWorkflowEditor Hook
 *
 * Manages form state for workflow editing including name and JSON content.
 * Provides validation and dirty state tracking.
 */

import { useCallback, useEffect, useState } from 'react'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'

export interface UseWorkflowEditorResult {
  // Form state
  name: string
  rawJson: string

  // Computed state
  isDirty: boolean
  isValidJson: boolean

  // Actions
  setName: (name: string) => void
  setRawJson: (json: string) => void
  reset: () => void
  validateJson: () => { valid: boolean; error?: string }
}

export function useWorkflowEditor(initialName: string = '', initialJson: string = ''): UseWorkflowEditorResult {
  const [name, setNameState] = useState<string>(initialName)
  const [rawJson, setRawJsonState] = useState<string>(initialJson)

  // Update local state when initial values change
  useEffect(() => {
    setNameState(initialName)
  }, [initialName])

  useEffect(() => {
    setRawJsonState(initialJson)
  }, [initialJson])

  // Check if form has unsaved changes
  const isDirty = name !== initialName || rawJson !== initialJson

  // Check if JSON is valid
  const isValidJson = (() => {
    if (rawJson.trim().length === 0) return true // Empty is valid

    try {
      const obj = JSON.parse(rawJson)
      ExportApiWorkflowSchema.parse(obj)
      return true
    } catch {
      return false
    }
  })()

  // Set name with validation
  const setName = useCallback((newName: string) => {
    setNameState(newName)
  }, [])

  // Set raw JSON with validation
  const setRawJson = useCallback((newJson: string) => {
    setRawJsonState(newJson)
  }, [])

  // Reset form to initial values
  const reset = useCallback(() => {
    setNameState(initialName)
    setRawJsonState(initialJson)
  }, [initialName, initialJson])

  // Validate JSON and return detailed result
  const validateJson = useCallback(() => {
    if (rawJson.trim().length === 0) {
      return { valid: true }
    }

    try {
      const obj = JSON.parse(rawJson)
      ExportApiWorkflowSchema.parse(obj)
      return { valid: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Invalid JSON format'
      return { valid: false, error }
    }
  }, [rawJson])

  return {
    // Form state
    name,
    rawJson,

    // Computed state
    isDirty,
    isValidJson,

    // Actions
    setName,
    setRawJson,
    reset,
    validateJson
  }
}
