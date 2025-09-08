/**
 * Progress Indicator Component
 *
 * Shows real-time progress during workflow generation with:
 * - Animated progress bars
 * - Time elapsed display
 * - Estimated time remaining
 * - Step-by-step progress visualization
 */

'use client'

import { useEffect, useState } from 'react'

interface ProgressIndicatorProps {
  status: string
  jobId?: string
  startTime?: number
  attempts?: number
}

interface ProgressStage {
  id: string
  label: string
  duration: number // estimated duration in seconds
  icon: string
}

const WORKFLOW_STAGES: ProgressStage[] = [
  { id: 'queued', label: 'Waiting for worker', duration: 10, icon: '⏳' },
  { id: 'initializing', label: 'Loading models', duration: 15, icon: '🔄' },
  { id: 'processing', label: 'Generating content', duration: 60, icon: '⚡' },
  { id: 'finalizing', label: 'Processing results', duration: 5, icon: '✨' },
  { id: 'completed', label: 'Complete', duration: 0, icon: '✅' }
]

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function getCurrentStage(status: string, elapsedSeconds: number): { current: ProgressStage; progress: number } {
  const statusMap: Record<string, string> = {
    queued: 'queued',
    running: elapsedSeconds < 15 ? 'initializing' : elapsedSeconds < 75 ? 'processing' : 'finalizing',
    completed: 'completed',
    failed: 'completed',
    cancelled: 'completed',
    'timed-out': 'completed'
  }

  const stageId = statusMap[status] || 'queued'
  const currentStage = WORKFLOW_STAGES.find(s => s.id === stageId) || WORKFLOW_STAGES[0]

  // Calculate progress within current stage
  let progress = 0
  if (status === 'running') {
    if (stageId === 'initializing') {
      progress = Math.min(100, (elapsedSeconds / 15) * 100)
    } else if (stageId === 'processing') {
      const processingTime = elapsedSeconds - 15
      progress = Math.min(100, (processingTime / 60) * 100)
    } else if (stageId === 'finalizing') {
      const finalizingTime = elapsedSeconds - 75
      progress = Math.min(100, (finalizingTime / 5) * 100)
    }
  } else if (status === 'queued') {
    // Simulate progress for queued state
    progress = Math.min(100, (elapsedSeconds / 10) * 100)
  } else if (['completed', 'failed', 'cancelled', 'timed-out'].includes(status)) {
    progress = 100
  }

  return { current: currentStage, progress }
}

function ProgressBar({ progress, status }: { progress: number; status: string }) {
  const getProgressColor = () => {
    if (['failed', 'cancelled', 'timed-out'].includes(status)) return 'bg-red-500'
    if (status === 'completed') return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className='w-full bg-gray-200 rounded-full h-2'>
      <div
        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
        style={{ width: `${Math.max(2, progress)}%` }}
      />
    </div>
  )
}

function StageIndicator({
  stage,
  isActive,
  isCompleted
}: {
  stage: ProgressStage
  isActive: boolean
  isCompleted: boolean
}) {
  const getStageStatus = () => {
    if (isCompleted) return 'text-green-600 bg-green-100'
    if (isActive) return 'text-blue-600 bg-blue-100'
    return 'text-gray-400 bg-gray-100'
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStageStatus()}`}>
      <span className='text-sm'>{stage.icon}</span>
      <span className='text-sm font-medium'>{stage.label}</span>
      {isActive && (
        <div className='ml-auto'>
          <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
        </div>
      )}
      {isCompleted && <span className='ml-auto text-xs'>✓</span>}
    </div>
  )
}

export function ProgressIndicator({ status, jobId, startTime, attempts = 0 }: ProgressIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!startTime || ['completed', 'failed', 'cancelled', 'timed-out'].includes(status)) {
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, status])

  // Don't show for idle or error states
  if (['idle', 'submitting', 'error'].includes(status)) {
    return null
  }

  const { current: currentStage, progress } = getCurrentStage(status, elapsedSeconds)
  const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === currentStage.id)

  // Estimate remaining time
  const estimatedTotal = WORKFLOW_STAGES.reduce((sum, stage) => sum + stage.duration, 0)
  const estimatedRemaining = Math.max(0, estimatedTotal - elapsedSeconds)

  const isTerminalState = ['completed', 'failed', 'cancelled', 'timed-out'].includes(status)

  return (
    <div className='mt-6 p-4 bg-gray-50 rounded-xl border'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='font-medium text-gray-800'>{isTerminalState ? 'Workflow Complete' : 'Workflow Progress'}</h3>
        <div className='text-sm text-gray-600 flex items-center gap-4'>
          <span>⏱️ {formatDuration(elapsedSeconds)}</span>
          {!isTerminalState && estimatedRemaining > 0 && (
            <span className='text-xs'>~{formatDuration(estimatedRemaining)} remaining</span>
          )}
          {jobId && <span className='font-mono text-xs bg-gray-200 px-2 py-1 rounded'>{jobId.slice(0, 8)}...</span>}
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className='mb-4'>
        <div className='flex justify-between text-xs text-gray-600 mb-1'>
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <ProgressBar progress={progress} status={status} />
      </div>

      {/* Stage Indicators */}
      <div className='space-y-2'>
        {WORKFLOW_STAGES.slice(0, -1).map((stage, index) => (
          <StageIndicator
            key={stage.id}
            stage={stage}
            isActive={index === currentStageIndex && !isTerminalState}
            isCompleted={index < currentStageIndex || isTerminalState}
          />
        ))}
      </div>

      {/* Additional Info */}
      {attempts > 1 && (
        <div className='mt-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded'>⚠️ Retry attempt #{attempts}</div>
      )}

      {status === 'timed-out' && (
        <div className='mt-3 text-xs text-red-600 bg-red-50 px-2 py-1 rounded'>
          ⏰ Job timed out - this usually indicates a worker issue
        </div>
      )}
    </div>
  )
}
