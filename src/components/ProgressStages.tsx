/**
 * ProgressStages Component
 *
 * Displays the list of workflow stages with their current status.
 */

'use client'

import { WORKFLOW_STAGES } from '@/lib/progress.config'
import { StageIndicator } from './StageIndicator'

interface ProgressStagesProps {
  currentStageIndex: number
  isTerminalState: boolean
  className?: string
}

export function ProgressStages({
  currentStageIndex,
  isTerminalState,
  className = ''
}: ProgressStagesProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {WORKFLOW_STAGES.slice(0, -1).map((stage, index) => (
        <StageIndicator
          key={stage.id}
          stage={stage}
          isActive={index === currentStageIndex && !isTerminalState}
          isCompleted={index < currentStageIndex || isTerminalState}
        />
      ))}
    </div>
  )
}
