/**
 * useProgressTimer Hook
 *
 * Manages elapsed time calculation and timer lifecycle for progress tracking.
 * Handles start/stop logic based on workflow status.
 */

import { useCallback, useEffect, useState } from 'react'
import { TERMINAL_STATUSES, formatDuration } from '@/lib/progress.config'

export interface UseProgressTimerResult {
  // Time state
  elapsedSeconds: number

  // Formatted values
  formattedElapsed: string

  // Timer control
  resetTimer: () => void
  setCustomElapsed: (seconds: number) => void
}

export function useProgressTimer(startTime?: number, status?: string): UseProgressTimerResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Reset timer when start time changes
  useEffect(() => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(Math.max(0, elapsed))
    } else {
      setElapsedSeconds(0)
    }
  }, [startTime])

  // Timer interval management
  useEffect(() => {
    // Don't run timer if no start time or if workflow is in terminal state
    if (!startTime || !status || TERMINAL_STATUSES.includes(status)) {
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(Math.max(0, elapsed))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, status])

  // Reset timer manually
  const resetTimer = useCallback(() => {
    setElapsedSeconds(0)
  }, [])

  // Set custom elapsed time (useful for testing or manual adjustments)
  const setCustomElapsed = useCallback((seconds: number) => {
    setElapsedSeconds(Math.max(0, seconds))
  }, [])

  // Formatted elapsed time
  const formattedElapsed = formatDuration(elapsedSeconds)

  return {
    // Time state
    elapsedSeconds,

    // Formatted values
    formattedElapsed,

    // Timer control
    resetTimer,
    setCustomElapsed
  }
}
