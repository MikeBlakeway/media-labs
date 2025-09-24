/**
 * Preflight Status Component
 *
 * Displays model availability status and provides upload commands.
 * Enhanced with intelligent model preloading capabilities.
 * Extracted from WorkflowContainer for better organization.
 */

import type { UseWorkflowPreflightResult } from '@/hooks/useWorkflowPreflight'

interface PreflightStatusProps {
  preflight: UseWorkflowPreflightResult
}

export function PreflightStatus({ preflight }: PreflightStatusProps) {
  const availableCount = preflight.preflight.length - preflight.missing.length
  const totalCount = preflight.preflight.length
  const allModelsPresent = preflight.missing.length === 0

  return (
    <div className='rounded-xl border border-default bg-card p-4 shadow-sm'>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='font-medium text-primary'>Model Requirements</h3>
        <div className='flex items-center gap-2'>
          {/* Refresh button for cache busting */}
          <button
            onClick={() => preflight.runPreflight(true)}
            disabled={preflight.preflightBusy}
            className='px-2 py-1 text-xs bg-panel hover:bg-input text-secondary rounded transition-colors disabled:opacity-50 dark:hover:bg-slate-700'
            title='Force refresh (clears cache)'
          >
            🔄
          </button>

          {!preflight.preflightBusy && !preflight.preflightErr && totalCount > 0 && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                allModelsPresent
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
              }`}
            >
              {allModelsPresent ? (
                <>
                  <span className='w-1.5 h-1.5 bg-green-500 rounded-full'></span>
                  All models available
                </>
              ) : (
                <>
                  <span className='w-1.5 h-1.5 bg-orange-500 rounded-full'></span>
                  {preflight.missing.length} missing
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {preflight.preflightBusy ? (
        <div className='flex items-center gap-3 py-2'>
          <div className='w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin dark:border-blue-700 dark:border-t-blue-400' />
          <span className='text-sm text-secondary'>Checking model availability...</span>
        </div>
      ) : preflight.preflightErr ? (
        <div className='rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-900/20 dark:border-red-800'>
          <div className='flex items-center gap-2'>
            <span className='text-red-500 dark:text-red-400'>⚠️</span>
            <span className='text-sm text-red-700 dark:text-red-300 font-medium'>Preflight Check Failed</span>
          </div>
          <div className='text-sm text-red-600 dark:text-red-400 mt-1'>{preflight.preflightErr}</div>
        </div>
      ) : totalCount > 0 ? (
        <div className='space-y-3'>
          <div className='flex items-center gap-2 text-sm'>
            <span
              className={`font-medium ${allModelsPresent ? 'text-green-700 dark:text-green-300' : 'text-secondary'}`}
            >
              {availableCount} of {totalCount} models available
            </span>
            {!allModelsPresent && (
              <span className='text-orange-600 dark:text-orange-400'>• {preflight.missing.length} missing</span>
            )}
          </div>

          {preflight.missing.length > 0 && (
            <div className='flex gap-2 items-center'>
              {/* Intelligent preloading action (when available) */}
              {preflight.canStartPreloading && (
                <button
                  onClick={preflight.startPreloading}
                  className='px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors'
                  title='Start intelligent preloading for missing models'
                >
                  🚀 Start Preloading
                </button>
              )}

              {/* Manual upload commands */}
              <button
                onClick={preflight.copyCommands}
                className='px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                title='Copy manual upload commands'
              >
                📋 Copy Upload Commands
              </button>

              <div className='text-xs text-gray-500'>Upload missing models to continue</div>
            </div>
          )}
        </div>
      ) : (
        <div className='text-sm text-gray-500 py-1'>No model requirements detected</div>
      )}
    </div>
  )
}
