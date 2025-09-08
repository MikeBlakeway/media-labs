/**
 * useWorkflowForm Hook
 *
 * Manages form state, validation, and field operations.
 * Extracts form-related logic from the main workflow component.
 */

import { useCallback, useEffect, useState } from 'react'
import type { TemplateMeta } from '@/lib/templates.schema'

// Local value type for form state (matches the original component)
export type ValueUnion = string | number | boolean | File | null

export interface UseWorkflowFormResult {
  // Form state
  formData: Record<string, ValueUnion>
  errors: string[]
  isDirty: boolean

  // Actions
  updateField: (fieldId: string, value: ValueUnion) => void
  validateForm: () => boolean
  resetForm: () => void
  setInitialValues: (values: Record<string, ValueUnion>) => void

  // Computed values
  isValid: boolean
  hasFileUploads: boolean

  // Form submission data preparation
  getSubmissionPatches: () => Array<{
    nodeId: string
    inputKey: string
    value: string | number | boolean | File
  }>
}

export function useWorkflowForm(meta: TemplateMeta | null): UseWorkflowFormResult {
  const [formData, setFormData] = useState<Record<string, ValueUnion>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [initialValues, setInitialValuesState] = useState<Record<string, ValueUnion>>({})

  // Initialize form with default values when meta changes
  useEffect(() => {
    if (!meta) return

    const defaultValues: Record<string, ValueUnion> = {}

    for (const field of meta.fields) {
      if (field.type === 'boolean') {
        defaultValues[field.id] = Boolean(field.defaultValue ?? false)
      } else if (field.type === 'integer' || field.type === 'number') {
        defaultValues[field.id] = Number(field.defaultValue ?? 0)
      } else {
        defaultValues[field.id] = String(field.defaultValue ?? '')
      }
    }

    setFormData(defaultValues)
    setInitialValuesState(defaultValues)
    setIsDirty(false)
    setErrors([])
  }, [meta])

  // Update field value
  const updateField = useCallback((fieldId: string, value: ValueUnion) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    setIsDirty(true)

    // Clear field-specific errors when user starts typing
    setErrors(prev => prev.filter(error => !error.includes(fieldId)))
  }, [])

  // Validate form data
  const validateForm = useCallback((): boolean => {
    if (!meta) return false

    const newErrors: string[] = []

    for (const field of meta.fields) {
      const value = formData[field.id]

      // Check required fields
      if (field.required && field.type === 'file' && !(value instanceof File)) {
        newErrors.push(`${field.label} is required`)
        continue
      }

      // Validate select options
      if (field.type === 'select' && field.options && value !== null && value !== undefined) {
        const stringValue = String(value)
        if (!field.options.includes(stringValue)) {
          newErrors.push(`${field.label} must be one of: ${field.options.join(', ')}`)
        }
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }, [meta, formData])

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initialValues)
    setIsDirty(false)
    setErrors([])
  }, [initialValues])

  // Set initial values (for when form is pre-populated)
  const setInitialValues = useCallback((values: Record<string, ValueUnion>) => {
    setFormData(values)
    setInitialValuesState(values)
    setIsDirty(false)
    setErrors([])
  }, [])

  // Coerce patch value to match field type (matches original logic)
  const coercePatchValue = useCallback(
    (
      fieldType: 'string' | 'text' | 'select' | 'integer' | 'number' | 'boolean',
      value: ValueUnion
    ): string | number | boolean => {
      switch (fieldType) {
        case 'boolean':
          return typeof value === 'boolean' ? value : Boolean(value)
        case 'integer': {
          if (typeof value === 'number' && Number.isInteger(value)) return value
          if (typeof value === 'number') return Math.trunc(value)
          if (typeof value === 'string') {
            const n = parseInt(value, 10)
            return Number.isNaN(n) ? 0 : n
          }
          return 0
        }
        case 'number': {
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const n = parseFloat(value)
            return Number.isNaN(n) ? 0 : n
          }
          return 0
        }
        case 'string':
        case 'text':
        case 'select':
        default:
          return typeof value === 'string' ? value : String(value ?? '')
      }
    },
    []
  )

  // Prepare form data for submission
  const getSubmissionPatches = useCallback(() => {
    if (!meta) return []

    const patches: Array<{
      nodeId: string
      inputKey: string
      value: string | number | boolean | File
    }> = []

    for (const field of meta.fields) {
      const value = formData[field.id]

      if (field.type === 'file') {
        if (value instanceof File) {
          patches.push({
            nodeId: field.nodeId,
            inputKey: field.inputKey,
            value: value
          })
        }
      } else {
        const coercedValue = coercePatchValue(field.type, value)
        patches.push({
          nodeId: field.nodeId,
          inputKey: field.inputKey,
          value: coercedValue
        })
      }
    }

    return patches
  }, [meta, formData, coercePatchValue])

  // Computed values
  const isValid = errors.length === 0
  const hasFileUploads = meta?.fields.some(field => field.type === 'file') ?? false

  return {
    formData,
    errors,
    isDirty,
    updateField,
    validateForm,
    resetForm,
    setInitialValues,
    isValid,
    hasFileUploads,
    getSubmissionPatches
  }
}
