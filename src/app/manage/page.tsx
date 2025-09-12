'use client'

import Link from 'next/link'
import { useWorkflowsList } from '@/hooks'

export default function ManageWorkflowsPage() {
  const { items, error } = useWorkflowsList()

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-2xl font-semibold'>Manage Workflows</h1>
      {error && <div className='mt-3 text-sm text-red-600'>{error}</div>}
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
        {items.length === 0 && !error && (
          <div className='rounded-xl border p-3 text-sm opacity-70'>No workflows yet.</div>
        )}
      </div>
    </main>
  )
}
