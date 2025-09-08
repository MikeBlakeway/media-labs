/**
 * ErrorDisplay Component
 *
 * Displays workflow error states and error details.
 */

'use client'

interface ErrorDisplayProps {
  error?: string
  errors?: string[]
  className?: string
}

export function ErrorDisplay({ error, errors, className = '' }: ErrorDisplayProps) {
  return (
    <div className={`rounded-xl border border-red-300 bg-red-50 p-4 ${className}`}>
      <h3 className='font-medium text-red-800 mb-2'>❌ Workflow Failed</h3>

      {error && <p className='text-sm text-red-700'>{error}</p>}

      {errors && errors.length > 0 && (
        <div className='mt-3'>
          <h4 className='text-sm font-medium text-red-800'>Error Details:</h4>
          <ul className='mt-1 text-xs text-red-700 space-y-1'>
            {errors.map((err, i) => (
              <li key={i} className='font-mono bg-red-100 p-2 rounded'>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
