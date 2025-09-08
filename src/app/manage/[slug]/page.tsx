'use client'

import { use } from 'react'
import Link from 'next/link'
import { useWorkflowManagement } from '@/hooks/useWorkflowManagement'
import { useWorkflowEditor } from '@/hooks/useWorkflowEditor'
import { useManualPreflight } from '@/hooks/useManualPreflight'

export default function EditWorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  // Use hooks for business logic
  const management = useWorkflowManagement(slug)
  const editor = useWorkflowEditor(management.initialName, management.initialJson)
  const preflight = useManualPreflight()

  // Combined loading state
  const isLoading = management.loading
  const isBusy = management.saving || management.deleting || preflight.running

  // Handle save workflow
  const handleSave = async () => {
    const success = await management.save(editor.name, editor.rawJson)
    if (success) {
      // Optional: could show success message
    }
  }

  // Handle delete workflow
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      const success = await management.remove()
      if (success) {
        window.location.href = '/manage'
      }
    }
  }

  // Handle preflight check
  const handlePreflight = async () => {
    await preflight.runPreflight(editor.rawJson)
  }

  // Show loading state
  if (isLoading) {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <div className='text-center'>Loading workflow...</div>
      </main>
    )
  }

  // Show error if workflow couldn't be loaded
  if (management.error && !management.meta) {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <div className='rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{management.error}</div>
      </main>
    )
  }

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Edit Workflow</h1>
        <Link href='/manage' className='rounded border px-3 py-1 text-sm hover:bg-gray-50'>
          Back
        </Link>
      </div>

      {/* Error Messages */}
      {management.error && (
        <div className='mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{management.error}</div>
      )}

      {preflight.error && (
        <div className='mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{preflight.error}</div>
      )}

      {management.meta && (
        <>
          {/* Form Fields */}
          <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
            <label className='text-sm'>
              Slug
              <input disabled value={slug} className='mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-50' />
            </label>
            <label className='text-sm'>
              Name
              <input
                value={editor.name}
                onChange={e => editor.setName(e.target.value)}
                className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                disabled={isBusy}
              />
            </label>
          </div>

          {/* Workflow JSON Editor */}
          <div className='mt-4'>
            <label className='text-sm font-medium'>
              Workflow JSON (Export API)
              {!editor.isValidJson && <span className='ml-2 text-red-600 text-xs'>Invalid JSON format</span>}
            </label>
            <textarea
              className={`mt-2 h-72 w-full rounded-md border px-3 py-2 text-sm font-mono ${
                !editor.isValidJson ? 'border-red-300 bg-red-50' : ''
              }`}
              value={editor.rawJson}
              onChange={e => editor.setRawJson(e.target.value)}
              disabled={isBusy}
            />
          </div>

          {/* Action Buttons */}
          <div className='mt-4 flex flex-wrap gap-2'>
            <button
              onClick={handleSave}
              disabled={isBusy || !editor.isValidJson}
              className='rounded bg-black px-4 py-2 text-white disabled:opacity-50'
            >
              {management.saving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handlePreflight}
              disabled={isBusy || !editor.isValidJson || editor.rawJson.trim().length === 0}
              className='rounded border px-4 py-2 disabled:opacity-50'
            >
              {preflight.running ? 'Checking...' : 'Preflight'}
            </button>

            <button
              onClick={handleDelete}
              disabled={isBusy}
              className='rounded border border-red-400 px-4 py-2 text-red-600 disabled:opacity-50'
            >
              {management.deleting ? 'Deleting...' : 'Delete'}
            </button>

            {editor.isDirty && (
              <button
                onClick={editor.reset}
                disabled={isBusy}
                className='rounded border border-gray-400 px-4 py-2 text-gray-600 disabled:opacity-50'
              >
                Reset
              </button>
            )}
          </div>

          {/* Preflight Results */}
          {preflight.hasResults && (
            <div className='mt-6'>
              <h2 className='text-lg font-semibold'>Preflight Results</h2>

              {/* Summary */}
              <div className='mt-2 text-sm'>
                {preflight.allModelsPresent ? (
                  <div className='text-green-700 font-medium'>✓ All models are present</div>
                ) : (
                  <div className='text-red-700 font-medium'>⚠ {preflight.missingModels.length} model(s) missing</div>
                )}
              </div>

              {/* Detailed Results */}
              <ul className='mt-3 space-y-2'>
                {preflight.results.map((result, index) => (
                  <li key={`${result.nodeId}-${index}`} className='rounded-xl border p-3 text-sm'>
                    <div className='font-medium'>
                      {result.type}: <code>{result.name}</code>
                    </div>
                    <div className='opacity-70'>
                      node {result.nodeId} • {result.classType}
                    </div>
                    <div className='opacity-70'>
                      S3 key: <code>{result.s3Key}</code>
                    </div>
                    <div className={result.present ? 'text-green-700' : 'text-red-700'}>
                      {result.present ? 'Present' : 'Missing'} at <code>{result.workerPath}</code>
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
