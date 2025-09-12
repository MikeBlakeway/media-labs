/**
 * useWorkflowManagement Hook
 *
 * Manages workflow template CRUD operations including loading, saving, and deletion.
 * Extracts management logic from the management page component.
 */

import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { ExportApiWorkflowSchema, type ExportApiWorkflow } from '@/lib/workflow.infer'
import { TemplateMetaSchema, type TemplateMeta } from '@/lib/templates.schema'

const RawWorkflowSchema = z.object({
  slug: z.string(),
  name: z.string(),
  workflow: ExportApiWorkflowSchema
})

export interface UseWorkflowManagementResult {
  // Data state
  meta: TemplateMeta | null
  rawWorkflow: ExportApiWorkflow | null
  initialName: string
  initialJson: string

  // Loading states
  loading: boolean
  saving: boolean
  deleting: boolean

  // Error state
  error: string

  // Actions
  save: (name: string, workflowJson: string) => Promise<boolean>
  remove: () => Promise<boolean>
  refetch: () => Promise<void>
  clearError: () => void
}

export function useWorkflowManagement(slug: string): UseWorkflowManagementResult {
  const [meta, setMeta] = useState<TemplateMeta | null>(null)
  const [rawWorkflow, setRawWorkflow] = useState<ExportApiWorkflow | null>(null)
  const [initialName, setInitialName] = useState<string>('')
  const [initialJson, setInitialJson] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>('')

  // Load template metadata and raw workflow
  const loadWorkflow = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Load template metadata
      const metaRes = await fetch(`/api/workflows/${slug}`)
      const metaRaw = await metaRes.json()
      const metaParsed = TemplateMetaSchema.safeParse(metaRaw)

      if (!metaRes.ok || !metaParsed.success) {
        throw new Error('Invalid template metadata')
      }

      setMeta(metaParsed.data)
      setInitialName(metaParsed.data.name)

      // Load raw workflow
      const rawRes = await fetch(`/api/workflows/${slug}/raw`)
      const rawData = await rawRes.json()
      const rawParsed = RawWorkflowSchema.safeParse(rawData)

      if (!rawRes.ok || !rawParsed.success) {
        throw new Error('Invalid raw workflow')
      }

      const workflow = rawParsed.data.workflow
      setRawWorkflow(workflow)
      setInitialJson(JSON.stringify(workflow, null, 2))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workflow'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  // Save workflow changes
  const save = useCallback(
    async (name: string, workflowJson: string): Promise<boolean> => {
      setSaving(true)
      setError('')

      try {
        let workflow: ExportApiWorkflow | undefined

        // Parse and validate workflow JSON if provided
        if (workflowJson.trim().length > 0) {
          try {
            const obj = JSON.parse(workflowJson)
            workflow = ExportApiWorkflowSchema.parse(obj)
          } catch {
            throw new Error('Workflow JSON is invalid (must be Export API format)')
          }
        }

        // Send update request
        const res = await fetch(`/api/workflows/${slug}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, workflow })
        })

        const raw = await res.json()
        const parsed = TemplateMetaSchema.safeParse(raw)

        if (!res.ok || !parsed.success) {
          throw new Error('Update failed')
        }

        // Update local state with new metadata
        setMeta(parsed.data)
        setInitialName(parsed.data.name)

        if (workflow) {
          setRawWorkflow(workflow)
          setInitialJson(JSON.stringify(workflow, null, 2))
        }

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed'
        setError(message)
        return false
      } finally {
        setSaving(false)
      }
    },
    [slug]
  )

  // Delete workflow
  const remove = useCallback(async (): Promise<boolean> => {
    setDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/workflows/${slug}`, { method: 'DELETE' })

      if (!res.ok) {
        throw new Error('Delete failed')
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setError(message)
      return false
    } finally {
      setDeleting(false)
    }
  }, [slug])

  // Refetch workflow data
  const refetch = useCallback(async () => {
    await loadWorkflow()
  }, [loadWorkflow])

  // Clear error state
  const clearError = useCallback(() => {
    setError('')
  }, [])

  // Load workflow on mount and slug change
  useEffect(() => {
    loadWorkflow()
  }, [loadWorkflow])

  return {
    // Data state
    meta,
    rawWorkflow,
    initialName,
    initialJson,

    // Loading states
    loading,
    saving,
    deleting,

    // Error state
    error,

    // Actions
    save,
    remove,
    refetch,
    clearError
  }
}
