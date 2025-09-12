/**
 * Preflight Status Component
 *
 * Displays model availability status and provides upload commands.
 * Extracted from WorkflowContainer for better organization.
 */

import type { UseWorkflowPreflightResult } from '@/hooks/useWorkflowPreflight'

interface PreflightStatusProps {
  preflight: UseWorkflowPreflightResult
}

export function PreflightStatus({ preflight }: PreflightStatusProps) {
  return (
    <div className='bg-gray-50 rounded-lg p-4'>
      <h3 className='font-medium text-gray-800 mb-2'>Model Requirements</h3>

      {preflight.preflightBusy ? (
        <div className='flex items-center gap-2 text-gray-600'>
          <div className='w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
          <span>Checking model availability...</span>
        </div>
      ) : preflight.preflightErr ? (
        <div className='text-red-600 text-sm'>{preflight.preflightErr}</div>
      ) : (
        <div className='space-y-2'>
          <div className='text-sm'>
            ✅ {preflight.preflight.length - preflight.missing.length} models available
            {preflight.missing.length > 0 && (
              <span className='text-red-600'> • {preflight.missing.length} missing</span>
            )}
          </div>

          {preflight.missing.length > 0 && (
            <button
              onClick={preflight.copyCommands}
              className='px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700'
            >
              Copy Upload Commands
            </button>
          )}
        </div>
      )}
    </div>
  )
}
