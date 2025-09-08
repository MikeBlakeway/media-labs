/**
 * Progress Configuration
 *
 * Defines workflow stages, timing, and utilities for progress tracking.
 */

export interface ProgressStage {
  id: string
  label: string
  duration: number // estimated duration in seconds
  icon: string
}

export const WORKFLOW_STAGES: ProgressStage[] = [
  { id: 'queued', label: 'Waiting for worker', duration: 10, icon: '⏳' },
  { id: 'initializing', label: 'Loading models', duration: 15, icon: '🔄' },
  { id: 'processing', label: 'Generating content', duration: 60, icon: '⚡' },
  { id: 'finalizing', label: 'Processing results', duration: 5, icon: '✨' },
  { id: 'completed', label: 'Complete', duration: 0, icon: '✅' }
]

export const STATUS_TO_STAGE_MAP: Record<string, string> = {
  queued: 'queued',
  running: 'processing', // Will be refined by elapsed time
  completed: 'completed',
  failed: 'completed',
  cancelled: 'completed',
  'timed-out': 'completed'
}

export const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'timed-out']
export const HIDDEN_STATUSES = ['idle', 'submitting', 'error']

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Calculate total estimated duration for all stages
 */
export function getTotalEstimatedDuration(): number {
  return WORKFLOW_STAGES.reduce((sum, stage) => sum + stage.duration, 0)
}
