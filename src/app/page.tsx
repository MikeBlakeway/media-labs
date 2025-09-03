'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { TemplatesListSchema, type TemplatesList } from '@/lib/templates.schema'

export default function Home() {
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
        setErr(e instanceof Error ? e.message : 'Failed to load workflows')
        setItems([])
      }
    })()
  }, [])

  return (
    <main className='mx-auto max-w-2xl p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Media Labs</h1>
        <nav className='flex gap-2'>
          <Link href='/manage' className='rounded-xl border px-3 py-2 text-sm hover:bg-gray-50'>
            Manage
          </Link>
          <Link href='/register' className='rounded-xl border px-3 py-2 text-sm hover:bg-gray-50'>
            Register workflow
          </Link>
        </nav>
      </div>

      <p className='mt-2 text-sm opacity-70'>Choose a registered workflow</p>

      {err && <div className='mt-3 text-sm text-red-600'>{err}</div>}

      <div className='mt-4 grid gap-2'>
        {items.map(i => (
          <Link key={i.slug} href={`/w/${i.slug}`} className='rounded-xl border p-3 hover:bg-gray-50'>
            {i.name} <span className='opacity-60 text-xs'>/w/{i.slug}</span>
          </Link>
        ))}
        {items.length === 0 && !err && (
          <div className='rounded-xl border p-3 text-sm opacity-70'>
            No workflows yet.{' '}
            <Link href='/register' className='underline'>
              Register one
            </Link>
            .
          </div>
        )}
      </div>
    </main>
  )
}
