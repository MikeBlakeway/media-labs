import { useEffect, useState } from 'react'
import { TemplatesListSchema, type TemplatesList } from '@/lib/templates.schema'

/**
 * Custom hook for fetching and managing the workflows list
 * Handles loading state, error handling, and Zod validation
 */
export function useWorkflowsList() {
  const [items, setItems] = useState<TemplatesList>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/workflows/list')
      const raw = await res.json()
      const parsed = TemplatesListSchema.safeParse(raw)

      if (!res.ok || !parsed.success) {
        throw new Error('Invalid list response')
      }

      setItems(parsed.data)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load workflows'
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  return {
    items,
    error,
    loading,
    refetch: fetchWorkflows
  }
}
