'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useParams } from 'next/navigation'
import { TemplateMetaSchema, type TemplateMeta } from '@/lib/templates.schema'

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

const RunAsyncRespSchema = z.object({
  id: z.string(),
  status: z.string()
})
const RunSyncRespSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
  output: z.unknown().optional()
})

const StatusRespSchema = z.object({
  status: z.enum(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
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

export default function WorkflowPage() {
  // ✅ Use useParams() in Client Components
  const routeParams = useParams<{ slug: string }>()
  const slug = routeParams.slug

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const [meta, setMeta] = useState<TemplateMeta | null>(null)
  const [values, setValues] = useState<Record<string, ValueUnion>>({})

  const [status, setStatus] = useState<string>('idle')
  const [jobId, setJobId] = useState<string>('')

  const [preflightBusy, setPreflightBusy] = useState<boolean>(true)
  const [preflightErr, setPreflightErr] = useState<string>('')
  const [preflight, setPreflight] = useState<PreflightItem[]>([])

  const pollRef = useRef<number | null>(null)

  // Load template meta, init form values
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/workflows/${slug}`)
        const raw = await res.json()
        const parsed = TemplateMetaSchema.safeParse(raw)
        if (!res.ok || !parsed.success) throw new Error('Template not found or invalid response')

        setMeta(parsed.data)

        const init: Record<string, ValueUnion> = {}
        for (const f of parsed.data.fields) {
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
  const allPresent = missing.length === 0 && preflight.length > 0

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

    setStatus('submitting')
    setError('')
    setJobId('')

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

    const maybeSync = RunSyncRespSchema.safeParse(runRaw)
    if (maybeSync.success) {
      setStatus(maybeSync.data.status.toLowerCase())
      return
    }

    const maybeAsync = RunAsyncRespSchema.safeParse(runRaw)
    if (maybeAsync.success) {
      setStatus('queued')
      setJobId(maybeAsync.data.id)

      const poll = async (): Promise<void> => {
        const sRes = await fetch(`/api/runpod/status/${maybeAsync.data.id}`)
        const sRaw = await sRes.json()
        const s = StatusRespSchema.safeParse(sRaw)
        if (!s.success) {
          setStatus('error')
          setError('Invalid status response')
          return
        }
        if (s.data.status === 'COMPLETED') {
          setStatus('completed')
        } else if (s.data.status === 'FAILED') {
          setStatus('failed')
        } else {
          pollRef.current = window.setTimeout(() => {
            void poll()
          }, 2000)
        }
      }
      await poll()
      return
    }

    setStatus('error')
    setError('Unexpected run response')
  }, [allPresent, coercePatchValue, meta, slug, values])

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
                {f.label}
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
  }, [meta, values])

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
  }, [copyCommands, missing, preflightBusy, preflightErr, runPreflight])

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
          disabled={!allPresent || status === 'submitting'}
          className='rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50'
          title={allPresent ? 'Run workflow' : 'Missing models — upload and Recheck'}
        >
          Run
        </button>
        <div className='self-center text-sm opacity-70'>
          Status: {status}
          {jobId ? ` — ${jobId}` : ''}
        </div>
      </div>
    </main>
  )
}
