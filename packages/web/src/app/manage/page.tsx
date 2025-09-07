'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TemplatesListSchema, type TemplatesList } from '@/lib/templates.schema'

export default function ManageWorkflowsPage() {
  const [items, setItems] = useState<TemplatesList>([])
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/workflows/list')
        const raw = await res.json()
        const parsed = TemplatesListSchema.safeParse(raw)
        if (!res.ok || !parsed.success) throw new Error('Invalid list response')
        setItems(parsed.data)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load')
        setItems([])
      }
    })()
  }, [])

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-2xl font-semibold'>Manage Workflows</h1>
      {err && <div className='mt-3 text-sm text-red-600'>{err}</div>}
      <div className='mt-4 grid gap-2'>
        {items.map(i => (
          <div key={i.slug} className='flex items-center justify-between rounded-xl border p-3'>
            <div>
              <div className='font-medium'>{i.name}</div>
              <div className='text-xs opacity-60'>/w/{i.slug}</div>
            </div>
            <div className='flex gap-2'>
              <Link className='rounded border px-3 py-1 text-sm hover:bg-gray-50' href={`/w/${i.slug}`}>
                Open
              </Link>
              <Link className='rounded border px-3 py-1 text-sm hover:bg-gray-50' href={`/manage/${i.slug}`}>
                Edit
              </Link>
            </div>
          </div>
        ))}
        {items.length === 0 && !err && (
          <div className='rounded-xl border p-3 text-sm opacity-70'>No workflows yet.</div>
        )}
      </div>
    </main>
  )
}
