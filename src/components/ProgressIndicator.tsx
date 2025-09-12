/**
 * Progress Indicator Component (Refactored)
 *
 * Shows real-time progress during workflow generation using hooks-based architecture.
 * Separated concerns for timer, calculations, and presentation.
 */

'use client'

import { useProgressTimer } from '@/hooks/useProgressTimer'
import { useProgressCalculation } from '@/hooks/useProgressCalculation'
import { HIDDEN_STATUSES } from '@/lib/progress.config'
import { ProgressHeader } from './ProgressHeader'
import { ProgressBar } from './ProgressBar'
import { ProgressStages } from './ProgressStages'
import { ProgressAlerts } from './ProgressAlerts'

interface ProgressIndicatorProps {
  status: string
  jobId?: string
  startTime?: number
  attempts?: number
}

export function ProgressIndicator({ status, jobId, startTime, attempts = 0 }: ProgressIndicatorProps) {
  // Use hooks for business logic
  const timer = useProgressTimer(startTime, status)
  const { calculation } = useProgressCalculation(status, timer.elapsedSeconds)

  // Don't show for certain states
  if (HIDDEN_STATUSES.includes(status)) {
    return null
  }

  return (
    <div className='mt-6 p-4 bg-gray-50 rounded-xl border'>
      {/* Header with timing and job info */}
      <ProgressHeader
        isTerminalState={calculation.isTerminalState}
        formattedElapsed={timer.formattedElapsed}
        formattedRemaining={
          !calculation.isTerminalState && calculation.estimatedRemaining > 0
            ? calculation.formattedRemaining
            : undefined
        }
        jobId={jobId}
        className='mb-4'
      />

      {/* Overall progress bar */}
      <ProgressBar progress={calculation.progress} status={status} className='mb-4' />

      {/* Stage indicators */}
      <ProgressStages currentStageIndex={calculation.currentStageIndex} isTerminalState={calculation.isTerminalState} />

      {/* Additional alerts and warnings */}
      <ProgressAlerts status={status} attempts={attempts} className='mt-3' />
    </div>
  )
}
