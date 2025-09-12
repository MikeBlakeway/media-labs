/**
 * StageIndicator Component
 *
 * Displays individual stage status with icon and state.
 */

'use client'

import type { ProgressStage } from '@/lib/progress.config'

interface StageIndicatorProps {
  stage: ProgressStage
  isActive: boolean
  isCompleted: boolean
  className?: string
}

export function StageIndicator({
  stage,
  isActive,
  isCompleted,
  className = ''
}: StageIndicatorProps) {
  const getStageStatus = () => {
    if (isCompleted) return 'text-green-600 bg-green-100'
    if (isActive) return 'text-blue-600 bg-blue-100'
    return 'text-gray-400 bg-gray-100'
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStageStatus()} ${className}`}>
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
