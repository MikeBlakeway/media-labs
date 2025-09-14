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
      <h3 className='font-medium text-gray-800'>{isTerminalState ? 'Workflow Complete' : 'Workflow Progress'}</h3>

      <div className='text-sm text-gray-600 flex items-center gap-4'>
        <span>⏱️ {formattedElapsed}</span>

        {!isTerminalState && formattedRemaining && <span className='text-xs'>~{formattedRemaining} remaining</span>}

        {jobId && <span className='font-mono text-xs bg-gray-200 px-2 py-1 rounded'>{jobId.slice(0, 8)}...</span>}
      </div>
    </div>
  )
}
