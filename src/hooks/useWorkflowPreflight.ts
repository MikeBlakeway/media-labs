/**
 * useWorkflowPreflight Hook
 *
 * Manages workflow preflight checks for model availability.
 * Extracts preflight logic from the main workflow component.
 */

import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'

// Preflight result schema (matches original component)
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

export interface UseWorkflowPreflightResult {
  // Preflight state
  preflightBusy: boolean
  preflightErr: string
  preflight: PreflightItem[]

  // Actions
  runPreflight: () => Promise<void>

  // Computed values
  missing: PreflightItem[]
  allPresent: boolean

  // Utility functions
  buildS3CpCommands: (items: PreflightItem[]) => string
  copyCommands: () => Promise<void>
}

export function useWorkflowPreflight(slug: string): UseWorkflowPreflightResult {
  const [preflightBusy, setPreflightBusy] = useState<boolean>(true)
  const [preflightErr, setPreflightErr] = useState<string>('')
  const [preflight, setPreflight] = useState<PreflightItem[]>([])

  // Run preflight check
  const runPreflight = useCallback(async () => {
    if (!slug) {
      setPreflightErr('No workflow slug provided')
      setPreflightBusy(false)
      return
    }

    setPreflightBusy(true)
    setPreflightErr('')

    try {
      const res = await fetch('/api/workflows/preflight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'slug', slug })
      })

      const raw = await res.json()
      const parsed = PreflightRespSchema.safeParse(raw)

      if (!res.ok || !parsed.success) {
        console.error('Preflight response validation failed:', parsed.success ? 'Response not ok' : parsed.error)
        throw new Error('Invalid preflight response')
      }

      setPreflight(parsed.data.results)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Preflight failed'
      console.error('Preflight error:', e)
      setPreflightErr(errorMessage)
      setPreflight([])
    } finally {
      setPreflightBusy(false)
    }
  }, [slug])

  // Auto-run preflight when slug changes
  useEffect(() => {
    if (slug) {
      void runPreflight()
    }
  }, [slug, runPreflight])

  // Build S3 copy commands for missing models
  const buildS3CpCommands = useCallback((items: PreflightItem[]): string => {
    return items
      .map(
        r =>
          `aws s3 cp --endpoint-url "$RUNPOD_S3_ENDPOINT" "$LOCAL_MODELS_DIR/${r.name}" "s3://$RUNPOD_VOLUME_ID/${r.s3Key}"`
      )
      .join('\n')
  }, [])

  // Copy commands to clipboard
  const copyCommands = useCallback(async () => {
    const missingItems = preflight.filter(p => !p.present)
    const text = buildS3CpCommands(missingItems)

    try {
      await navigator.clipboard.writeText(text)
      alert('Upload commands copied to clipboard.')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)

      // Fallback: show commands in a dialog
      prompt('Copy these commands:', text)
    }
  }, [buildS3CpCommands, preflight])

  // Computed values
  const missing = preflight.filter(p => !p.present)
  const allPresent = missing.length === 0

  return {
    preflightBusy,
    preflightErr,
    preflight,
    runPreflight,
    missing,
    allPresent,
    buildS3CpCommands,
    copyCommands
  }
}
