import { safeStringify, formatDuration } from '@/lib/workflow.utils'
import type { UseJobManagementResult } from '@/hooks/useJobManagement'

interface JobStatusDisplayProps {
  job: UseJobManagementResult
}

export function JobStatusDisplay({ job }: JobStatusDisplayProps) {
  // Don't render if job is idle
  if (job.status === 'idle') {
    return null
  }

  // Test - create local variables to see types
  const errorValue = job.jobError
  const resultsValue = job.jobResults

  // Convert unknown values to strings for display
  const errorText: string | null = errorValue ? String(errorValue) : null
  const hasResults: boolean = Boolean(resultsValue)
  const resultsText: string = resultsValue ? safeStringify(resultsValue) : ''

  return (
    <div className='self-center'>
      <div className='bg-panel rounded-lg border border-default p-4'>
        <h3 className='font-medium text-primary mb-2'>Job Status</h3>

        <div className='text-sm text-secondary space-y-1'>
          <div>
            Status: <span className='font-mono text-primary'>{job.status}</span>
          </div>

          {job.jobId && (
            <div>
              Job ID: <span className='font-mono text-muted'>{job.jobId}</span>
            </div>
          )}

          {job.duration && <div>Duration: {formatDuration(job.duration)}</div>}

          {job.pollAttempts > 0 && <div>Poll attempts: {job.pollAttempts}</div>}
        </div>

        {/* Error Display */}
        {errorText && <div className='mt-2 text-red-600 dark:text-red-400 text-sm'>{errorText}</div>}

        {/* Results Display */}
        {hasResults && (
          <div className='mt-2'>
            <div className='text-green-600 dark:text-green-400 text-sm'>✅ Job completed successfully!</div>
            <details className='mt-2'>
              <summary className='text-xs text-gray-600 cursor-pointer'>View raw results</summary>
              <pre className='mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40'>{resultsText}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Job Action Buttons Component
 */
interface JobActionButtonsProps {
  job: UseJobManagementResult
}

export function JobActionButtons({ job }: JobActionButtonsProps) {
  if (!job.jobId) return null

  return (
    <div className='flex gap-2'>
      <button onClick={job.forceCheckStatus} className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'>
        Check Status
      </button>

      {!job.isTerminal && (
        <button
          onClick={job.cancelJob}
          className='px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50'
        >
          Cancel
        </button>
      )}
    </div>
  )
}
