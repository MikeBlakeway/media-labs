'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { slugify } from '@/lib/slug'
import { ExportApiWorkflowSchema, inferFieldsFromExportApi } from '@/lib/workflow.infer'
import type { FieldSpec } from '@/lib/templates.types'
import { FieldSpecSchema } from '@/lib/templates.schema'

const RegisterResponseSchema = z.object({
  ok: z.boolean(),
  slug: z.string(),
  fields: z.array(FieldSpecSchema)
})

export default function RegisterWorkflowPage() {
  const [dragOver, setDragOver] = useState(false)
  const [rawJson, setRawJson] = useState<z.infer<typeof ExportApiWorkflowSchema> | null>(null)
  const [previewFields, setPreviewFields] = useState<FieldSpec[]>([])
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'registering' | 'registered'>('idle')
  const [resultSlug, setResultSlug] = useState<string>('')

  const parseWorkflow = useCallback(async (file: File) => {
    setError('')
    const text = await file.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      setError('Invalid JSON')
      setRawJson(null)
      setPreviewFields([])
      return
    }
    const parsed = ExportApiWorkflowSchema.safeParse(json)
    if (!parsed.success) {
      setError('This is not a ComfyUI Export (API) workflow. In ComfyUI: Workflow → Export (API).')
      setRawJson(null)
      setPreviewFields([])
      return
    }
    setRawJson(parsed.data)
    setSlug(s => (s ? s : slugify(file.name)))
    setName(n => (n ? n : 'Untitled Workflow'))
    setPreviewFields(inferFieldsFromExportApi(parsed.data))
  }, [])

  const onFileInput = async (f: File | null) => {
    if (f) await parseWorkflow(f)
  }

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0] ?? null
    if (f) await parseWorkflow(f)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)

  const canRegister = useMemo(() => rawJson !== null && slug.length >= 2 && name.length >= 2, [rawJson, slug, name])

  const register = async () => {
    if (!canRegister || rawJson === null) return
    setStatus('registering')
    setError('')
    const res = await fetch('/api/workflows/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, name, workflow: rawJson })
    })
    const dataUnknown = await res.json()
    const data = RegisterResponseSchema.safeParse(dataUnknown)
    if (!res.ok || !data.success || data.data.ok !== true) {
      setStatus('idle')
      setError(
        (data.success ? 'Registration failed' : 'Invalid server response') +
          (data.success ? '' : `: ${JSON.stringify(dataUnknown)}`)
      )
      return
    }
    setResultSlug(data.data.slug)
    setStatus('registered')
  }

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-2xl font-semibold'>Register Workflow</h1>
      <p className='mt-2 text-sm opacity-70'>
        Drop a ComfyUI <span className='font-medium'>Export (API)</span> JSON to create a page at{' '}
        <code>/w/&lt;slug&gt;</code>.
      </p>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition
          ${dragOver ? 'border-black bg-gray-50' : 'border-gray-300'}`}
      >
        <p className='mb-3 text-sm'>
          Drag & drop your <code>workflow.json</code> here
        </p>
        <input
          type='file'
          accept='application/json'
          onChange={e => onFileInput(e.target.files?.[0] ?? null)}
          className='mx-auto block'
        />
      </div>

      {error && <div className='mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{error}</div>}

      {rawJson && (
        <>
          <div className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-2'>
            <label className='text-sm'>
              Slug
              <input
                value={slug}
                onChange={e => setSlug(slugify(e.target.value))}
                className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                placeholder='text-to-image'
              />
              <span className='text-xs opacity-60'>URL: /w/{slug || '…'}</span>
            </label>

            <label className='text-sm'>
              Name
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                placeholder='Text to Image'
              />
            </label>
          </div>

          <div className='mt-6'>
            <h2 className='text-lg font-semibold'>Inferred Fields (preview)</h2>
            {previewFields.length === 0 && (
              <p className='mt-1 text-sm opacity-70'>No inputs inferred (that’s okay for some flows).</p>
            )}
            <ul className='mt-2 space-y-2'>
              {previewFields.map(f => (
                <li key={f.id} className='rounded-xl border p-3 text-sm'>
                  <div className='font-medium'>{f.label}</div>
                  <div className='opacity-70'>
                    <code>{f.type}</code> • node <code>{f.nodeId}</code> • input <code>{f.inputKey}</code>
                    {f.defaultValue !== undefined && (
                      <>
                        {' '}
                        • default <code>{String(f.defaultValue)}</code>
                      </>
                    )}
                    {f.required && ' • required'}
                  </div>
                  {f.help && <div className='mt-1 text-xs opacity-60'>{f.help}</div>}
                </li>
              ))}
            </ul>
          </div>

          <div className='mt-6 flex items-center gap-2'>
            <button
              onClick={register}
              disabled={!canRegister || status === 'registering'}
              className='rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50'
            >
              {status === 'registering' ? 'Registering…' : 'Register workflow'}
            </button>
            {status === 'registered' && resultSlug && (
              <Link href={`/w/${resultSlug}`} className='text-sm underline'>
                Open /w/{resultSlug}
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  )
}
