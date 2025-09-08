/**
 * useWorkflowTemplate Hook
 *
 * Manages workflow template loading, validation, and caching.
 * Extracts template-related logic from the main workflow component.
 */

import { useCallback, useEffect, useState } from 'react'
import { TemplateMetaSchema, type TemplateMeta } from '@/lib/templates.schema'
import type { ExportApiWorkflow } from '@/lib/workflow.infer'

export interface UseWorkflowTemplateResult {
  // Template data
  meta: TemplateMeta | null
  workflow: ExportApiWorkflow | null

  // Loading states
  loading: boolean
  error: string

  // Actions
  refetch: () => Promise<void>

  // Computed values
  isReady: boolean
}

export function useWorkflowTemplate(slug: string): UseWorkflowTemplateResult {
  const [meta, setMeta] = useState<TemplateMeta | null>(null)
  const [workflow, setWorkflow] = useState<ExportApiWorkflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const loadTemplate = useCallback(async (): Promise<void> => {
    if (!slug) {
      setError('No workflow slug provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      // Load template metadata and workflow definition
      const [metaResponse, workflowResponse] = await Promise.all([
        fetch(`/api/workflows/${slug}`),
        fetch(`/api/workflows/${slug}/raw`)
      ])

      if (!metaResponse.ok) {
        throw new Error(`Failed to load template metadata: ${metaResponse.status}`)
      }

      if (!workflowResponse.ok) {
        throw new Error(`Failed to load workflow definition: ${workflowResponse.status}`)
      }

      const [metaData, workflowData] = await Promise.all([metaResponse.json(), workflowResponse.json()])

      // Validate template metadata
      const metaValidation = TemplateMetaSchema.safeParse(metaData)
      if (!metaValidation.success) {
        console.error('Template metadata validation failed:', metaValidation.error)
        throw new Error('Invalid template metadata format')
      }

      // Store validated data
      setMeta(metaValidation.data)
      setWorkflow(workflowData as ExportApiWorkflow)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load template'
      console.error('Template loading error:', err)
      setError(errorMessage)
      setMeta(null)
      setWorkflow(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  // Load template on mount and slug change
  useEffect(() => {
    void loadTemplate()
  }, [loadTemplate])

  // Computed values
  const isReady = Boolean(meta && workflow && !loading && !error)

  return {
    meta,
    workflow,
    loading,
    error,
    refetch: loadTemplate,
    isReady
  }
}
