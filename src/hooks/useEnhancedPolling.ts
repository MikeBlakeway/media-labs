/**
 * Enhanced Polling Hook with Progress Tracking
 *
 * Provides better polling experience with:
 * - Exponential backoff for failed requests
 * - Progress estimation
 * - Better error handling
 */

import { useCallback, useRef, useState, useEffect } from 'react'

interface PollingState {
  status: string
  results: unknown | null
  error: string
  isPolling: boolean
  attempts: number
  duration: number
}

interface UseEnhancedPollingOptions {
  onComplete?: (results: unknown) => void
  onError?: (error: string) => void
  maxAttempts?: number
  baseInterval?: number
}

export function useEnhancedPolling(options: UseEnhancedPollingOptions = {}) {
  const {
    onComplete,
    onError,
    maxAttempts = 100, // ~3 minutes with backoff
    baseInterval = 2000 // 2 seconds
  } = options

  const [state, setState] = useState<PollingState>({
    status: 'idle',
    results: null,
    error: '',
    isPolling: false,
    attempts: 0,
    duration: 0
  })

  const pollRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
    setState(prev => ({ ...prev, isPolling: false }))
  }, [])

  const startPolling = useCallback(
    (jobId: string) => {
      startTimeRef.current = Date.now()
      setState(prev => ({
        ...prev,
        isPolling: true,
        attempts: 0,
        duration: 0,
        error: '',
        results: null
      }))

      const poll = async (attempt: number): Promise<void> => {
        try {
          const duration = Date.now() - startTimeRef.current
          setState(prev => ({ ...prev, attempts: attempt, duration }))

          const response = await fetch(`/api/runpod/status/${jobId}`)

          if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`)
          }

          const data = await response.json()

          // Update status
          setState(prev => ({ ...prev, status: data.status, duration }))

          // Check completion
          const isComplete = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(data.status)

          if (isComplete) {
            stopPolling()

            if (data.status === 'COMPLETED') {
              setState(prev => ({ ...prev, results: data.output }))
              onComplete?.(data.output)
            } else {
              const errorMsg = `Job ${data.status.toLowerCase()}`
              setState(prev => ({ ...prev, error: errorMsg }))
              onError?.(errorMsg)
            }
          } else if (attempt >= maxAttempts) {
            stopPolling()
            const errorMsg = 'Polling timeout - job may still be running'
            setState(prev => ({ ...prev, error: errorMsg }))
            onError?.(errorMsg)
          } else {
            // Calculate backoff delay (exponential with cap)
            const backoffDelay = Math.min(
              baseInterval * Math.pow(1.2, Math.floor(attempt / 10)),
              10000 // Max 10 seconds
            )

            pollRef.current = window.setTimeout(() => {
              void poll(attempt + 1)
            }, backoffDelay)
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Polling failed'
          setState(prev => ({ ...prev, error: errorMsg }))

          if (attempt >= maxAttempts) {
            stopPolling()
            onError?.(errorMsg)
          } else {
            // Retry with exponential backoff
            const retryDelay = baseInterval * Math.pow(2, Math.min(attempt, 5))
            pollRef.current = window.setTimeout(() => {
              void poll(attempt + 1)
            }, retryDelay)
          }
        }
      }

      void poll(1)
    },
    [baseInterval, maxAttempts, onComplete, onError, stopPolling]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current)
      }
    }
  }, [])

  return {
    ...state,
    startPolling,
    stopPolling,
    // Helper functions
    isTerminal: ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(state.status),
    isSuccess: state.status === 'COMPLETED',
    progressText: state.isPolling
      ? `${state.status} (${Math.floor(state.duration / 1000)}s, attempt ${state.attempts})`
      : state.status
  }
}
