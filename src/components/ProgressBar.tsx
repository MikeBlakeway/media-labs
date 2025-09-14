/**
 * ProgressBar Component
 *
 * Displays a progress bar with status-based coloring.
 */

'use client'

interface ProgressBarProps {
  progress: number
  status: string
  showPercentage?: boolean
  className?: string
}

export function ProgressBar({ progress, status, showPercentage = true, className = '' }: ProgressBarProps) {
  const getProgressColor = () => {
    if (['failed', 'cancelled', 'timed-out'].includes(status)) return 'bg-red-500'
    if (status === 'completed') return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className={className}>
      {showPercentage && (
        <div className='flex justify-between text-xs text-gray-600 mb-1'>
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className='w-full bg-gray-200 rounded-full h-2'>
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.max(2, progress)}%` }}
        />
      </div>
    </div>
  )
}
