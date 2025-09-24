'use client'

import Link from 'next/link'
import { useWorkflowsList } from '@/hooks'

export default function Home() {
  const { items, error } = useWorkflowsList()

  return (
    <div className='mx-auto max-w-2xl'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold text-primary'>AI-Powered Media Generation</h1>
        <nav className='flex gap-2'>
          <Link
            href='/manage'
            className='rounded-xl border border-default bg-card px-3 py-2 text-sm text-secondary hover:bg-panel transition-colors'
          >
            Manage
          </Link>
          <Link
            href='/register'
            className='rounded-xl border border-default bg-card px-3 py-2 text-sm text-secondary hover:bg-panel transition-colors'
          >
            Register workflow
          </Link>
        </nav>
      </div>

      <p className='mt-2 text-sm text-muted'>Choose a registered workflow</p>

      {error && <div className='mt-3 text-sm text-red-600 dark:text-red-400'>{error}</div>}

      <div className='mt-4 grid gap-2'>
        {items.map(i => (
          <Link
            key={i.slug}
            href={`/w/${i.slug}`}
            className='rounded-xl border border-default bg-card p-3 hover:bg-panel transition-colors'
          >
            <span className='text-primary'>{i.name}</span> <span className='text-muted text-xs'>/w/{i.slug}</span>
          </Link>
        ))}
        {items.length === 0 && !error && (
          <div className='rounded-xl border p-3 text-sm opacity-70'>
            No workflows yet.{' '}
            <Link href='/register' className='underline'>
              Register one
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  )
}
