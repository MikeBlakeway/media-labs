/**
 * useProgressCalculation Hook
 *
 * Calculates current stage, progress percentage, and estimated remaining time.
 * Handles stage transitions and timing logic based on elapsed time and status.
 */

import { useMemo } from 'react'
import {
  WORKFLOW_STAGES,
  STATUS_TO_STAGE_MAP,
  TERMINAL_STATUSES,
  getTotalEstimatedDuration,
  formatDuration,
  type ProgressStage
} from '@/lib/progress.config'

export interface ProgressCalculation {
  currentStage: ProgressStage
  currentStageIndex: number
  progress: number
  estimatedRemaining: number
  formattedRemaining: string
  isTerminalState: boolean
}

export interface UseProgressCalculationResult {
  calculation: ProgressCalculation

  // Convenience getters
  currentStage: ProgressStage
  progress: number
  isTerminalState: boolean
}

export function useProgressCalculation(status: string, elapsedSeconds: number): UseProgressCalculationResult {
  const calculation = useMemo((): ProgressCalculation => {
    // Determine current stage based on status and elapsed time
    const getStageId = (): string => {
      const baseStageId = STATUS_TO_STAGE_MAP[status] || 'queued'

      // Refine stage for running status based on elapsed time
      if (status === 'running') {
        if (elapsedSeconds < 15) return 'initializing'
        if (elapsedSeconds < 75) return 'processing'
        return 'finalizing'
      }

      return baseStageId
    }

    const stageId = getStageId()
    const currentStage = WORKFLOW_STAGES.find(s => s.id === stageId) || WORKFLOW_STAGES[0]
    const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === currentStage.id)

    // Calculate progress within current stage
    const calculateProgress = (): number => {
      if (status === 'running') {
        if (stageId === 'initializing') {
          return Math.min(100, (elapsedSeconds / 15) * 100)
        } else if (stageId === 'processing') {
          const processingTime = elapsedSeconds - 15
          return Math.min(100, (processingTime / 60) * 100)
        } else if (stageId === 'finalizing') {
          const finalizingTime = elapsedSeconds - 75
          return Math.min(100, (finalizingTime / 5) * 100)
        }
      } else if (status === 'queued') {
        // Simulate progress for queued state
        return Math.min(100, (elapsedSeconds / 10) * 100)
      } else if (TERMINAL_STATUSES.includes(status)) {
        return 100
      }

      return 0
    }

    const progress = calculateProgress()
    const isTerminalState = TERMINAL_STATUSES.includes(status)

    // Calculate estimated remaining time
    const totalEstimated = getTotalEstimatedDuration()
    const estimatedRemaining = Math.max(0, totalEstimated - elapsedSeconds)
    const formattedRemaining = formatDuration(estimatedRemaining)

    return {
      currentStage,
      currentStageIndex,
      progress,
      estimatedRemaining,
      formattedRemaining,
      isTerminalState
    }
  }, [status, elapsedSeconds])

  return {
    calculation,

    // Convenience getters
    currentStage: calculation.currentStage,
    progress: calculation.progress,
    isTerminalState: calculation.isTerminalState
  }
}
