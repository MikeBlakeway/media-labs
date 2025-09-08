'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useParams } from 'next/navigation'
import { TemplateMetaSchema, type TemplateMeta } from '@/lib/templates.schema'
import type { ExportApiWorkflow } from '@/lib/workflow.infer'
import { WorkflowResults } from '@/components/WorkflowResults'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { ResultHistory } from '@/components/ResultHistory'

// Import RunPod utilities for job state management
type RunPodJobState = 'IN_QUEUE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT'

// Helper function to check if job is complete
function isJobComplete(status: RunPodJobState | string): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED' || status === 'TIMED_OUT'
}

// Map RunPod job states to client-friendly status strings
function mapJobStatusToClientStatus(status: RunPodJobState | string): string {
  switch (status) {
    case 'IN_QUEUE':
      return 'queued'
    case 'RUNNING':
      return 'running'
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'CANCELLED':
      return 'cancelled'
    case 'TIMED_OUT':
      return 'timed-out'
    // Legacy status mapping
    case 'QUEUED':
      return 'queued'
    case 'IN_PROGRESS':
      return 'running'
    default:
      return typeof status === 'string' ? status.toLowerCase() : 'unknown'
  }
}

/** Schemas for API responses/requests used on this page */
const UploadResponseSchema = z.object({
  key: z.string(),
  workerPath: z.string(),
  jobId: z.string(),
  filename: z.string(),
  size: z.number(),
  contentType: z.string()
})

const PatchSpecSchema = z.object({
  nodeId: z.string(),
  inputKey: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()])
})

const RunReqSchema = z.object({
  slug: z.string(),
  patches: z.array(PatchSpecSchema),
  mode: z.enum(['auto', 'sync', 'async']).optional()
})

/** RunPod Job State Schema - Official 6 states */
const RunPodJobStateSchema = z.enum([
  'IN_QUEUE', // Job waiting for available worker
  'RUNNING', // Worker actively processing job
  'COMPLETED', // Job finished successfully
  'FAILED', // Job encountered error during execution
  'CANCELLED', // Job manually cancelled via /cancel/job_id
  'TIMED_OUT' // Job expired or worker failed to report back
])

const RunAsyncRespSchema = z.object({
  id: z.string(),
  status: z.union([RunPodJobStateSchema, z.string()]) // Allow unknown states
})

const RunSyncRespSchema = z.object({
  status: z.union([
    z.enum(['COMPLETED', 'FAILED']), // Legacy sync states
    RunPodJobStateSchema
  ]),
  output: z.unknown().optional()
})

const StatusRespSchema = z.object({
  status: z.union([RunPodJobStateSchema, z.string()]), // Support all states + unknown
  output: z.unknown().optional()
})

/** Preflight result schema (matches /api/workflows/preflight) */
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
type PreflightResp = z.infer<typeof PreflightRespSchema>
type PreflightItem = PreflightResp['results'][number]

/** Local value type for form state */
type ValueUnion = string | number | boolean | File | null

// Type for workflow node with _meta information
type WorkflowNodeWithMeta = {
  class_type: string
  inputs: Record<string, unknown>
  _meta?: {
    title?: string
  }
  [key: string]: unknown
}

// Status display component with enhanced job state information
function StatusDisplay({ status, jobId }: { status: string; jobId: string }) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'idle':
        return { color: 'text-gray-600', icon: '⚪', label: 'Ready' }
      case 'submitting':
        return { color: 'text-blue-600', icon: '📤', label: 'Submitting...' }
      case 'queued':
        return { color: 'text-yellow-600', icon: '⏳', label: 'Queued' }
      case 'running':
        return { color: 'text-blue-600', icon: '⚡', label: 'Running' }
      case 'completed':
        return { color: 'text-green-600', icon: '✅', label: 'Completed' }
      case 'failed':
        return { color: 'text-red-600', icon: '❌', label: 'Failed' }
      case 'cancelled':
        return { color: 'text-orange-600', icon: '🚫', label: 'Cancelled' }
      case 'timed-out':
        return { color: 'text-red-600', icon: '⏰', label: 'Timed Out' }
      case 'error':
        return { color: 'text-red-600', icon: '💥', label: 'Error' }
      default:
        return { color: 'text-gray-600', icon: '❓', label: status }
    }
  }

  const info = getStatusInfo(status)

  return (
    <div className={`text-sm ${info.color} flex items-center gap-2`}>
      <span>{info.icon}</span>
      <span className='font-medium'>{info.label}</span>
      {jobId && <span className='opacity-70 font-mono text-xs'>({jobId.slice(0, 8)}...)</span>}
    </div>
  )
}

export default function WorkflowPage() {
  // ✅ Use useParams() in Client Components
  const routeParams = useParams<{ slug: string }>()
  const slug = routeParams.slug

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const [meta, setMeta] = useState<TemplateMeta | null>(null)
  const [workflow, setWorkflow] = useState<ExportApiWorkflow | null>(null)
  const [values, setValues] = useState<Record<string, ValueUnion>>({})

  const [status, setStatus] = useState<string>('idle')
  const [jobId, setJobId] = useState<string>('')
  const [jobResults, setJobResults] = useState<unknown>(null)
  const [jobError, setJobError] = useState<string>('')
  const [jobStartTime, setJobStartTime] = useState<number | undefined>(undefined)
  const [pollAttempts, setPollAttempts] = useState<number>(0)

  const [preflightBusy, setPreflightBusy] = useState<boolean>(true)
  const [preflightErr, setPreflightErr] = useState<string>('')
  const [preflight, setPreflight] = useState<PreflightItem[]>([])

  const pollRef = useRef<number | null>(null)

  // Smart labeling function that creates user-friendly, distinctive labels
  const getEnhancedFieldLabel = useCallback(
    (
      field: { nodeId: string; inputKey: string; label: string; defaultValue?: unknown },
      allFields: Array<{ nodeId: string; inputKey: string; label: string; defaultValue?: unknown }>
    ): string => {
      if (!workflow || !workflow[field.nodeId]) {
        return field.label
      }

      const node = workflow[field.nodeId] as WorkflowNodeWithMeta
      const metaTitle = node._meta?.title

      // Count how many fields have the same label to detect duplicates
      const duplicateCount = allFields.filter(f => f.label === field.label).length
      const hasDuplicates = duplicateCount > 1

      // Helper function to extract meaningful context from meta title
      const extractContext = (title: string): string => {
        const lower = title.toLowerCase()

        // Extract positive/negative context
        if (lower.includes('positive')) return 'Positive'
        if (lower.includes('negative')) return 'Negative'

        // Extract specific node purposes
        if (lower.includes('load') && lower.includes('checkpoint')) return 'Model'
        if (lower.includes('save') && lower.includes('image')) return 'Output'
        if (lower.includes('preview')) return 'Preview'
        if (lower.includes('vae') && lower.includes('decode')) return 'VAE'
        if (lower.includes('sampler')) return 'Sampling'
        if (lower.includes('guidance')) return 'Guidance'

        return ''
      }

      // If we have meta title, try to create a better label
      if (typeof metaTitle === 'string' && metaTitle.trim()) {
        const context = extractContext(metaTitle)

        // For prompt fields, use the context to distinguish
        if (field.label.toLowerCase().includes('prompt') && context) {
          return `${context} Prompt`
        }

        // For other duplicated fields, add context if available
        if (hasDuplicates && context && !field.label.toLowerCase().includes(context.toLowerCase())) {
          return `${field.label} (${context})`
        }

        // If the meta title is much more descriptive than the label, use it
        if (metaTitle.length > field.label.length + 5 && !metaTitle.includes('(') && !metaTitle.includes('Encode')) {
          return metaTitle
        }
      }

      // For duplicates without clear meta context, try to use other distinguishing factors
      if (hasDuplicates) {
        // Use default value patterns
        if (field.label.toLowerCase().includes('prompt')) {
          const defaultVal = field.defaultValue
          if (typeof defaultVal === 'string') {
            if (defaultVal.length > 50) {
              return 'Positive Prompt'
            } else if (defaultVal === '' || defaultVal.length === 0) {
              return 'Negative Prompt'
            }
          }
        }

        // Use node ID as last resort for duplicates
        return `${field.label} (Node ${field.nodeId})`
      }

      return field.label
    },
    [workflow]
  )

  // Load template meta, init form values
  useEffect(() => {
    ;(async () => {
      try {
        // Load both metadata and full workflow in parallel
        const [metaRes, workflowRes] = await Promise.all([
          fetch(`/api/workflows/${slug}`),
          fetch(`/api/workflows/${slug}/raw`)
        ])

        const [metaRaw, workflowRaw] = await Promise.all([metaRes.json(), workflowRes.json()])

        const metaParsed = TemplateMetaSchema.safeParse(metaRaw)
        if (!metaRes.ok || !metaParsed.success) {
          throw new Error('Template metadata not found or invalid response')
        }

        if (!workflowRes.ok) {
          console.warn('Could not load workflow data for enhanced labeling')
        } else {
          setWorkflow(workflowRaw.workflow)
        }

        setMeta(metaParsed.data)

        const init: Record<string, ValueUnion> = {}
        for (const f of metaParsed.data.fields) {
          if (f.defaultValue !== undefined) {
            init[f.id] = f.defaultValue
          } else if (f.type === 'boolean') {
            init[f.id] = false
          } else if (f.type === 'integer' || f.type === 'number') {
            init[f.id] = 0
          } else {
            init[f.id] = ''
          }
        }
        setValues(init)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load template')
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
  }, [slug])

  const onChange = (id: string, v: ValueUnion) => setValues(prev => ({ ...prev, [id]: v }))

  /** Ensure the patch value strictly matches the field type (no File/null allowed). */
  const coercePatchValue = useCallback(
    (
      fieldType: 'string' | 'text' | 'select' | 'integer' | 'number' | 'boolean',
      v: ValueUnion
    ): string | number | boolean => {
      switch (fieldType) {
        case 'boolean':
          return typeof v === 'boolean' ? v : Boolean(v)
        case 'integer': {
          if (typeof v === 'number' && Number.isInteger(v)) return v
          if (typeof v === 'number') return Math.trunc(v)
          if (typeof v === 'string') {
            const n = parseInt(v, 10)
            return Number.isNaN(n) ? 0 : n
          }
          return 0
        }
        case 'number': {
          if (typeof v === 'number') return v
          if (typeof v === 'string') {
            const n = parseFloat(v)
            return Number.isNaN(n) ? 0 : n
          }
          return 0
        }
        case 'string':
        case 'text':
        case 'select':
        default:
          return typeof v === 'string' ? v : String(v ?? '')
      }
    },
    []
  )

  /** Preflight (memoized) */
  const runPreflight = useCallback(async () => {
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
      if (!res.ok || !parsed.success) throw new Error('Invalid preflight response')
      setPreflight(parsed.data.results)
    } catch (e) {
      setPreflightErr(e instanceof Error ? e.message : 'Preflight failed')
      setPreflight([])
    } finally {
      setPreflightBusy(false)
    }
  }, [slug])

  // Auto preflight once meta is available
  useEffect(() => {
    if (!meta) return
    void runPreflight()
  }, [meta, runPreflight])

  const missing = useMemo(() => preflight.filter(p => !p.present), [preflight])
  const allPresent = missing.length === 0

  const buildS3CpCommands = useCallback((items: PreflightItem[]): string => {
    return items
      .map(
        r =>
          `aws s3 cp --endpoint-url "$RUNPOD_S3_ENDPOINT" "$LOCAL_MODELS_DIR/${r.name}" "s3://$RUNPOD_VOLUME_ID/${r.s3Key}"`
      )
      .join('\n')
  }, [])

  const copyCommands = useCallback(async () => {
    const text = buildS3CpCommands(missing)
    await navigator.clipboard.writeText(text)
    alert('Upload commands copied to clipboard.')
  }, [buildS3CpCommands, missing])

  const submit = useCallback(async () => {
    if (!meta) return
    if (!allPresent) {
      alert('Required models are missing. Please upload them and click Recheck.')
      return
    }

    // Clear previous results when starting new job
    setJobResults(null)
    setJobError('')
    setStatus('submitting')
    setError('')
    setJobId('')
    setJobStartTime(Date.now())
    setPollAttempts(0)

    const patches: Array<{ nodeId: string; inputKey: string; value: string | number | boolean }> = []

    for (const f of meta.fields) {
      const v = values[f.id]

      if (f.type === 'file') {
        if (!(v instanceof File)) {
          setStatus('error')
          setError(`Missing file for ${f.label}`)
          return
        }
        const fd = new FormData()
        fd.append('file', v)
        const upRes = await fetch('/api/volume/upload', { method: 'POST', body: fd })
        const upRaw = await upRes.json()
        const up = UploadResponseSchema.safeParse(upRaw)
        if (!upRes.ok || !up.success) {
          setStatus('error')
          setError('Upload failed')
          return
        }
        patches.push({ nodeId: f.nodeId, inputKey: f.inputKey, value: up.data.workerPath })
      } else {
        const coerced = coercePatchValue(f.type, v)
        patches.push({ nodeId: f.nodeId, inputKey: f.inputKey, value: coerced })
      }
    }

    const runBody = RunReqSchema.parse({ slug, patches, mode: 'auto' })
    const runRes = await fetch('/api/workflows/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(runBody)
    })
    const runRaw = await runRes.json()

    // Check ASYNC response first (more specific - requires both id and status)
    const maybeAsync = RunAsyncRespSchema.safeParse(runRaw)
    if (maybeAsync.success) {
      // Handle async response - start with initial status
      const initialStatus = mapJobStatusToClientStatus(maybeAsync.data.status)
      setStatus(initialStatus)
      setJobId(maybeAsync.data.id)

      const poll = async (): Promise<void> => {
        try {
          setPollAttempts(prev => prev + 1)

          const sRes = await fetch(`/api/runpod/status/${maybeAsync.data.id}`)

          if (!sRes.ok) {
            const errorText = await sRes.text()
            console.error(`Status API failed: ${sRes.status} ${sRes.statusText}`, errorText)
            throw new Error(`Status API failed: ${sRes.status} ${sRes.statusText}`)
          }

          const sRaw = await sRes.json()
          const s = StatusRespSchema.safeParse(sRaw)

          if (!s.success) {
            console.error('Status schema validation failed:', s.error)
            setStatus('error')
            setError('Invalid status response')
            return
          }

          const clientStatus = mapJobStatusToClientStatus(s.data.status)
          setStatus(clientStatus)

          // Check if job is complete (any terminal state)
          if (isJobComplete(s.data.status)) {
            // Job finished - stop polling and store results
            if (pollRef.current) {
              clearTimeout(pollRef.current)
              pollRef.current = null
            }

            const duration = jobStartTime ? Date.now() - jobStartTime : undefined

            // Store results for display
            if (s.data.status === 'COMPLETED') {
              setJobResults(s.data.output || null)
              setJobError('')
            } else if (s.data.status === 'FAILED') {
              setJobResults(s.data.output || null) // May contain error details
              setJobError('Workflow execution failed')
            } else if (s.data.status === 'TIMED_OUT') {
              setJobError('Workflow timed out')
            } else if (s.data.status === 'CANCELLED') {
              setJobError('Workflow was cancelled')
            }

            // Store result in history
            try {
              const historyResponse = await fetch('/api/workflows/results', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  jobId: maybeAsync.data.id,
                  status: s.data.status,
                  output: s.data.output,
                  slug,
                  duration
                })
              })

              if (!historyResponse.ok) {
                console.warn('Failed to store result in history:', historyResponse.status)
              }
            } catch (historyError) {
              console.warn('History storage error:', historyError)
            }
          } else {
            // Continue polling for non-terminal states
            pollRef.current = window.setTimeout(() => {
              void poll()
            }, 2000)
          }
        } catch (error) {
          console.error('Polling error:', error)
          setStatus('error')
          setError(error instanceof Error ? error.message : 'Polling failed')

          // Don't continue polling on error
          if (pollRef.current) {
            clearTimeout(pollRef.current)
            pollRef.current = null
          }
        }
      }

      await poll()
      return
    }

    // Check SYNC response second (less specific - only requires status)
    const maybeSync = RunSyncRespSchema.safeParse(runRaw)
    if (maybeSync.success) {
      // Handle sync response - map to consistent status
      const normalizedStatus = mapJobStatusToClientStatus(maybeSync.data.status)
      setStatus(normalizedStatus)
      return
    }

    // Neither schema matched
    console.error('Response matches neither async nor sync schema:', {
      rawResponse: runRaw,
      responseType: typeof runRaw,
      responseKeys: runRaw && typeof runRaw === 'object' ? Object.keys(runRaw) : 'not object'
    })

    setStatus('error')
    setError('Unexpected run response')
  }, [allPresent, coercePatchValue, meta, slug, values, jobStartTime])

  const forceCheckStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const sRes = await fetch(`/api/runpod/status/${jobId}`)

      if (!sRes.ok) {
        throw new Error(`Status API failed: ${sRes.status} ${sRes.statusText}`)
      }

      const sRaw = await sRes.json()
      const s = StatusRespSchema.safeParse(sRaw)

      if (!s.success) {
        console.error('Status schema validation failed:', s.error)
        setError('Invalid status response from force check')
        return
      }

      const clientStatus = mapJobStatusToClientStatus(s.data.status)
      setStatus(clientStatus)

      // If job is complete, process results immediately
      if (isJobComplete(s.data.status)) {
        // Stop any ongoing polling
        if (pollRef.current) {
          clearTimeout(pollRef.current)
          pollRef.current = null
        }

        const duration = jobStartTime ? Date.now() - jobStartTime : undefined

        // Store results for display
        if (s.data.status === 'COMPLETED') {
          setJobResults(s.data.output || null)
          setJobError('')
        } else if (s.data.status === 'FAILED') {
          setJobResults(s.data.output || null)
          setJobError('Workflow execution failed')
        } else if (s.data.status === 'TIMED_OUT') {
          setJobError('Workflow timed out')
        } else if (s.data.status === 'CANCELLED') {
          setJobError('Workflow was cancelled')
        }

        // Store result in history
        try {
          const historyResponse = await fetch('/api/workflows/results', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              jobId,
              status: s.data.status,
              output: s.data.output,
              slug,
              duration
            })
          })

          if (!historyResponse.ok) {
            console.warn('Failed to store result in history:', historyResponse.status)
          }
        } catch (historyError) {
          console.warn('History storage error:', historyError)
        }
      }
    } catch (error) {
      console.error('❌ Force check error:', error)
      setError(error instanceof Error ? error.message : 'Force check failed')
    }
  }, [jobId, slug, jobStartTime])

  // Cancel a running job
  const cancelJob = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/runpod/cancel/${jobId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Cancel failed: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        setStatus('cancelled')
        if (pollRef.current) {
          clearTimeout(pollRef.current)
          pollRef.current = null
        }
      } else {
        setError(result.message || 'Failed to cancel job')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Cancel request failed')
    }
  }, [jobId])

  // Check if current job can be cancelled
  const canCancelJob = useMemo(() => {
    return jobId && (status === 'queued' || status === 'running')
  }, [jobId, status])

  const form = useMemo(() => {
    if (!meta) return null
    return (
      <div className='space-y-4'>
        {meta.fields.map(f => {
          const val = values[f.id]
          const asString = typeof val === 'string' ? val : ''
          const asNumber = typeof val === 'number' ? val : 0
          const asBool = typeof val === 'boolean' ? val : false

          return (
            <div key={f.id} className='rounded-xl border p-3'>
              <label className='text-sm font-medium'>
                {getEnhancedFieldLabel(f, meta.fields)}
                {f.required ? ' *' : ''}
              </label>
              {f.help && <div className='text-xs opacity-70'>{f.help}</div>}
              <div className='mt-2'>
                {f.type === 'file' && <input type='file' onChange={e => onChange(f.id, e.target.files?.[0] ?? null)} />}

                {f.type === 'text' && (
                  <textarea
                    className='w-full rounded-md border px-3 py-2 text-sm'
                    rows={4}
                    value={asString}
                    onChange={e => onChange(f.id, e.target.value)}
                  />
                )}

                {f.type === 'string' && (
                  <input
                    className='w-full rounded-md border px-3 py-2 text-sm'
                    value={asString}
                    onChange={e => onChange(f.id, e.target.value)}
                  />
                )}

                {(f.type === 'integer' || f.type === 'number') && (
                  <input
                    className='w-full rounded-md border px-3 py-2 text-sm'
                    type='number'
                    step={f.type === 'integer' ? 1 : 'any'}
                    value={asNumber}
                    onChange={e =>
                      onChange(
                        f.id,
                        f.type === 'integer'
                          ? (() => {
                              const n = parseInt(e.target.value, 10)
                              return Number.isNaN(n) ? 0 : n
                            })()
                          : (() => {
                              const n = parseFloat(e.target.value)
                              return Number.isNaN(n) ? 0 : n
                            })()
                      )
                    }
                  />
                )}

                {f.type === 'select' && (
                  <select
                    className='w-full rounded-md border px-3 py-2 text-sm'
                    value={asString}
                    onChange={e => onChange(f.id, e.target.value)}
                  >
                    {(f.options ?? []).map(o => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                )}

                {f.type === 'boolean' && (
                  <input type='checkbox' checked={asBool} onChange={e => onChange(f.id, e.target.checked)} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [meta, values, getEnhancedFieldLabel])

  const preflightBanner = useMemo(() => {
    if (preflightBusy) {
      return <div className='mt-4 rounded-xl border bg-gray-50 p-3 text-sm'>Checking required models…</div>
    }
    if (preflightErr) {
      return (
        <div className='mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800'>
          Preflight error: {preflightErr}{' '}
          <button onClick={() => void runPreflight()} className='underline'>
            Recheck
          </button>
        </div>
      )
    }
    if (preflight.length === 0) {
      return (
        <div className='mt-4 rounded-xl border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800'>
          No models required for this workflow.
          <button onClick={() => void runPreflight()} className='ml-2 underline'>
            Recheck
          </button>
        </div>
      )
    }
    if (missing.length > 0) {
      return (
        <div className='mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800'>
          <div className='font-medium'>Missing models</div>
          <ul className='mt-2 list-disc pl-5'>
            {missing.map(m => (
              <li key={`${m.nodeId}-${m.name}`}>
                <code>{m.name}</code> • <span className='opacity-70'>{m.type}</span>{' '}
                <span className='opacity-70'>(dest: s3://$RUNPOD_VOLUME_ID/{m.s3Key})</span>
              </li>
            ))}
          </ul>
          <div className='mt-3 flex items-center gap-2'>
            <button onClick={() => void copyCommands()} className='rounded bg-black px-3 py-1 text-white'>
              Copy upload commands
            </button>
            <button onClick={() => void runPreflight()} className='rounded border px-3 py-1'>
              Recheck
            </button>
          </div>
          <div className='mt-2 text-xs opacity-70'>
            Requires env vars on your machine: <code>RUNPOD_S3_ENDPOINT</code>, <code>RUNPOD_VOLUME_ID</code>,{' '}
            <code>LOCAL_MODELS_DIR</code>.
          </div>
        </div>
      )
    }
    return (
      <div className='mt-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800'>
        All required models are present.
        <button onClick={() => void runPreflight()} className='ml-2 underline'>
          Recheck
        </button>
      </div>
    )
  }, [copyCommands, missing, preflightBusy, preflightErr, runPreflight, preflight.length])

  if (loading) return <main className='p-6'>Loading…</main>
  if (!meta) return <main className='p-6 text-red-600'>{error || 'Template not found'}</main>

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-2xl font-semibold'>{meta.name || slug}</h1>
      <p className='mt-2 text-sm opacity-70'>Fill the fields and run the workflow</p>

      {preflightBanner}

      <div className='mt-6'>{form}</div>

      <div className='mt-4 flex flex-wrap items-center gap-2'>
        <button
          onClick={() => void submit()}
          disabled={!allPresent || status === 'submitting' || status === 'queued' || status === 'running'}
          className='rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50'
          title={allPresent ? 'Run workflow' : 'Missing models — upload and Recheck'}
        >
          Run
        </button>

        {canCancelJob && (
          <button
            onClick={() => void cancelJob()}
            className='rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700'
            title='Cancel running job'
          >
            Cancel
          </button>
        )}

        {jobId && (
          <button
            onClick={() => void forceCheckStatus()}
            className='rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
            title='Force check job status'
          >
            🔍 Check Status
          </button>
        )}

        <div className='self-center'>
          <StatusDisplay status={status} jobId={jobId} />
        </div>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator status={status} jobId={jobId} startTime={jobStartTime} attempts={pollAttempts} />

      {/* Display workflow results */}
      <WorkflowResults
        output={
          jobResults as { images?: { base64?: string; url?: string; filename?: string }[]; errors?: string[] } | null
        }
        status={status}
        error={jobError || error}
      />

      {/* Result History */}
      <ResultHistory
        currentSlug={slug}
        onSelectResult={result => {
          // Optional: populate form with previous settings or show result
          console.log('Selected previous result:', result)
        }}
      />
    </main>
  )
}
