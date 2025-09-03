'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import Link from 'next/link'
import { ExportApiWorkflowSchema, type ExportApiWorkflow } from '@/lib/workflow.infer'
import { TemplateMetaSchema, type TemplateMeta } from '@/lib/templates.schema'

const RawSchema = z.object({
  slug: z.string(),
  name: z.string(),
  workflow: ExportApiWorkflowSchema
})

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

export default function EditWorkflowPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const [meta, setMeta] = useState<TemplateMeta | null>(null)
  const [rawJson, setRawJson] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [err, setErr] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'deleting' | 'checking'>('idle')
  const [preflight, setPreflight] = useState<PreflightResp['results']>([])

  useEffect(() => {
    ;(async () => {
      try {
        const metaRes = await fetch(`/api/workflows/${slug}`)
        const metaRaw = await metaRes.json()
        const metaParsed = TemplateMetaSchema.safeParse(metaRaw)
        if (!metaRes.ok || !metaParsed.success) throw new Error('Invalid template meta')
        setMeta(metaParsed.data)
        setName(metaParsed.data.name)

        const rawRes = await fetch(`/api/workflows/${slug}/raw`)
        const raw = await rawRes.json()
        const rawParsed = RawSchema.safeParse(raw)
        if (!rawRes.ok || !rawParsed.success) throw new Error('Invalid raw workflow')
        setRawJson(JSON.stringify(rawParsed.data.workflow, null, 2))
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
  }, [slug])

  const save = async () => {
    setStatus('saving')
    setErr('')
    let wf: ExportApiWorkflow | undefined
    try {
      if (rawJson.trim().length > 0) {
        const obj = JSON.parse(rawJson)
        const v = ExportApiWorkflowSchema.parse(obj)
        wf = v
      }
    } catch {
      setStatus('idle')
      setErr('Workflow JSON is invalid (must be Export API format)')
      return
    }

    const res = await fetch(`/api/workflows/${slug}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, workflow: wf })
    })
    const raw = await res.json()
    const parsed = TemplateMetaSchema.safeParse(raw)
    if (!res.ok || !parsed.success) {
      setStatus('idle')
      setErr('Update failed')
      return
    }
    setMeta(parsed.data)
    setStatus('idle')
  }

  const remove = async () => {
    setStatus('deleting')
    setErr('')
    const res = await fetch(`/api/workflows/${slug}`, { method: 'DELETE' })
    const ok = res.ok
    setStatus('idle')
    if (!ok) {
      setErr('Delete failed')
      return
    }
    window.location.href = '/manage'
  }

  const runPreflight = async () => {
    setStatus('checking')
    setErr('')
    let payload: unknown
    try {
      payload = { kind: 'workflow', workflow: ExportApiWorkflowSchema.parse(JSON.parse(rawJson)) }
    } catch {
      setStatus('idle')
      setErr('Invalid workflow JSON for preflight')
      return
    }
    const res = await fetch('/api/workflows/preflight', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const raw = await res.json()
    const parsed = PreflightRespSchema.safeParse(raw)
    setStatus('idle')
    if (!res.ok || !parsed.success) {
      setErr('Preflight failed')
      return
    }
    setPreflight(parsed.data.results)
  }

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Edit Workflow</h1>
        <Link href='/manage' className='rounded border px-3 py-1 text-sm hover:bg-gray-50'>
          Back
        </Link>
      </div>

      {err && <div className='mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{err}</div>}

      {meta && (
        <>
          <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
            <label className='text-sm'>
              Slug
              <input disabled value={slug} className='mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-50' />
            </label>
            <label className='text-sm'>
              Name
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
              />
            </label>
          </div>

          <div className='mt-4'>
            <label className='text-sm font-medium'>Workflow JSON (Export API)</label>
            <textarea
              className='mt-2 h-72 w-full rounded-md border px-3 py-2 text-sm font-mono'
              value={rawJson}
              onChange={e => setRawJson(e.target.value)}
            />
          </div>

          <div className='mt-4 flex flex-wrap gap-2'>
            <button
              onClick={save}
              disabled={status !== 'idle'}
              className='rounded bg-black px-4 py-2 text-white disabled:opacity-50'
            >
              Save
            </button>
            <button
              onClick={runPreflight}
              disabled={status !== 'idle'}
              className='rounded border px-4 py-2 disabled:opacity-50'
            >
              Preflight
            </button>
            <button
              onClick={remove}
              disabled={status !== 'idle'}
              className='rounded border border-red-400 px-4 py-2 text-red-600 disabled:opacity-50'
            >
              Delete
            </button>
          </div>

          {preflight.length > 0 && (
            <div className='mt-6'>
              <h2 className='text-lg font-semibold'>Preflight Results</h2>
              <ul className='mt-2 space-y-2'>
                {preflight.map((r, i) => (
                  <li key={`${r.nodeId}-${i}`} className='rounded-xl border p-3 text-sm'>
                    <div className='font-medium'>
                      {r.type}: <code>{r.name}</code>
                    </div>
                    <div className='opacity-70'>
                      node {r.nodeId} • {r.classType}
                    </div>
                    <div className='opacity-70'>
                      S3 key: <code>{r.s3Key}</code>
                    </div>
                    <div className={r.present ? 'text-green-700' : 'text-red-700'}>
                      {r.present ? 'Present' : 'Missing'} at <code>{r.workerPath}</code>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  )
}
