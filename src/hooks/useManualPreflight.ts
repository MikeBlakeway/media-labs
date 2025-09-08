/**
 * useManualPreflight Hook
 *
 * Manages manual preflight checks for raw workflow JSON.
 * Different from useWorkflowPreflight which works with templates.
 */

import { useCallback, useState } from 'react'
import { z } from 'zod'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'

// Preflight result schema (matches existing component)
const PreflightRespSchema = z.object({
  ok: z.boolean(),
  results: z.array(
    z.object({
      nodeId: z.string(),
      classType: z.string(),
      type: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
      name: z.string(),
      present: z.boolean(),
      s3Key: z.string(),
      workerPath: z.string()
    })
  )
})

export type PreflightResp = z.infer<typeof PreflightRespSchema>
export type PreflightItem = PreflightResp['results'][number]

export interface UseManualPreflightResult {
  // State
  results: PreflightItem[]
  running: boolean
  error: string

  // Computed
  hasResults: boolean
  allModelsPresent: boolean
  missingModels: PreflightItem[]

  // Actions
  runPreflight: (workflowJson: string) => Promise<boolean>
  clearResults: () => void
  clearError: () => void
}

export function useManualPreflight(): UseManualPreflightResult {
  const [results, setResults] = useState<PreflightItem[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string>('')

  const runPreflight = useCallback(async (workflowJson: string): Promise<boolean> => {
    setRunning(true)
    setError('')
    setResults([])

    try {
      // Validate and parse workflow JSON
      let workflow
      try {
        const obj = JSON.parse(workflowJson)
        workflow = ExportApiWorkflowSchema.parse(obj)
      } catch {
        throw new Error('Invalid workflow JSON for preflight')
      }

      // Prepare preflight payload
      const payload = {
        kind: 'workflow',
        workflow
      }

      // Send preflight request
      const res = await fetch('/api/workflows/preflight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const raw = await res.json()
      const parsed = PreflightRespSchema.safeParse(raw)

      if (!res.ok || !parsed.success) {
        throw new Error('Preflight failed')
      }

      setResults(parsed.data.results)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preflight failed'
      setError(message)
      return false
    } finally {
      setRunning(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  // Computed values
  const hasResults = results.length > 0
  const allModelsPresent = results.length > 0 && results.every(r => r.present)
  const missingModels = results.filter(r => !r.present)

  return {
    // State
    results,
    running,
    error,

    // Computed
    hasResults,
    allModelsPresent,
    missingModels,

    // Actions
    runPreflight,
    clearResults,
    clearError
  }
}
