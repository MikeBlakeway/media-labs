/**
 * ProgressHeader Component
 *
 * Displays the header section of progress indicator with timing and job info.
 */

'use client'

interface ProgressHeaderProps {
  isTerminalState: boolean
  formattedElapsed: string
  formattedRemaining?: string
  jobId?: string
  className?: string
}

export function ProgressHeader({
  isTerminalState,
  formattedElapsed,
  formattedRemaining,
  jobId,
  className = ''
}: ProgressHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h3 className='font-medium text-text-primary'>{isTerminalState ? 'Workflow Complete' : 'Workflow Progress'}</h3>

      <div className='text-sm text-text-muted flex items-center gap-4'>
        <span>⏱️ {formattedElapsed}</span>

        {!isTerminalState && formattedRemaining && (
          <span className='text-xs'>{`~${formattedRemaining} remaining`}</span>
        )}

        {jobId && (
          <span className='font-mono text-xs bg-panel px-2 py-1 rounded text-text-secondary'>
            {jobId.slice(0, 8)}...
          </span>
        )}
      </div>
    </div>
  )
}
