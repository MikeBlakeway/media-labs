/**
 * useJobManagement Hook
 *
 * Manages job submission, polling, status tracking, and result handling.
 * Extracts job-related logic from the main workflow component.
 */

import { useCallback, useRef, useState } from 'react'
import { z } from 'zod'

// RunPod job state types
type RunPodJobState = 'IN_QUEUE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT'

// Schemas for API responses (matches original component)
const RunPodJobStateSchema = z.enum(['IN_QUEUE', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'])

const RunAsyncRespSchema = z.object({
  id: z.string(),
  status: z.union([RunPodJobStateSchema, z.string()])
})

const RunSyncRespSchema = z.object({
  status: z.union([z.enum(['COMPLETED', 'FAILED']), RunPodJobStateSchema]),
  output: z.unknown().optional()
})

const StatusRespSchema = z.object({
  status: z.union([RunPodJobStateSchema, z.string()]),
  output: z.unknown().optional()
})

// Job submission patch type
export interface JobPatch {
  nodeId: string
  inputKey: string
  value: string | number | boolean
}

export interface UseJobManagementResult {
  // Job state
  jobId: string
  status: string
  jobResults: unknown | null
  jobError: string
  submitting: boolean

  // Timing information
  jobStartTime: number | undefined
  pollAttempts: number

  // Actions
  submitJob: (slug: string, patches: JobPatch[]) => Promise<void>
  cancelJob: () => Promise<void>
  forceCheckStatus: () => Promise<void>
  resetJob: () => void

  // Computed values
  isTerminal: boolean
  isSuccess: boolean
  duration: number | undefined
}

// Helper functions (matches original component logic)
function isJobComplete(status: RunPodJobState | string): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED' || status === 'TIMED_OUT'
}

function mapJobStatusToClientStatus(status: RunPodJobState | string): string {
  switch (status) {
    case 'IN_QUEUE':
      return 'queued'
    case 'RUNNING':
      return 'running'
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'CANCELLED':
      return 'cancelled'
    case 'TIMED_OUT':
      return 'timed-out'
    case 'QUEUED':
      return 'queued'
    case 'IN_PROGRESS':
      return 'running'
    default:
      return typeof status === 'string' ? status.toLowerCase() : 'unknown'
  }
}

export function useJobManagement(): UseJobManagementResult {
  const [jobId, setJobId] = useState<string>('')
  const [status, setStatus] = useState<string>('idle')
  const [jobResults, setJobResults] = useState<unknown | null>(null)
  const [jobError, setJobError] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [jobStartTime, setJobStartTime] = useState<number | undefined>(undefined)
  const [pollAttempts, setPollAttempts] = useState<number>(0)

  const pollRef = useRef<number | null>(null)

  // Store result in history
  const storeResultInHistory = useCallback(
    async (jobId: string, status: string, output: unknown, slug: string, duration?: number) => {
      try {
        const historyResponse = await fetch('/api/workflows/results', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            jobId,
            status,
            output,
            slug,
            duration
          })
        })

        if (!historyResponse.ok) {
          console.warn('Failed to store result in history:', historyResponse.status)
        }
      } catch (historyError) {
        console.warn('History storage error:', historyError)
      }
    },
    []
  )

  // Polling function
  const startPolling = useCallback(
    async (jobId: string, slug: string) => {
      const poll = async (): Promise<void> => {
        try {
          setPollAttempts(prev => prev + 1)

          const sRes = await fetch(`/api/runpod/status/${jobId}`)

          if (!sRes.ok) {
            const errorText = await sRes.text()
            console.error(`Status API failed: ${sRes.status} ${sRes.statusText}`, errorText)
            throw new Error(`Status API failed: ${sRes.status} ${sRes.statusText}`)
          }

          const sRaw = await sRes.json()
          const s = StatusRespSchema.safeParse(sRaw)

          if (!s.success) {
            console.error('Status schema validation failed:', s.error)
            setStatus('error')
            setJobError('Invalid status response')
            return
          }

          const clientStatus = mapJobStatusToClientStatus(s.data.status)
          setStatus(clientStatus)

          // Check if job is complete
          if (isJobComplete(s.data.status)) {
            // Job finished - stop polling and store results
            if (pollRef.current) {
              clearTimeout(pollRef.current)
              pollRef.current = null
            }

            const duration = jobStartTime ? Date.now() - jobStartTime : undefined

            // Store results for display
            if (s.data.status === 'COMPLETED') {
              setJobResults(s.data.output || null)
              setJobError('')
            } else if (s.data.status === 'FAILED') {
              setJobResults(s.data.output || null)
              setJobError('Workflow execution failed')
            } else if (s.data.status === 'TIMED_OUT') {
              setJobError('Workflow timed out')
            } else if (s.data.status === 'CANCELLED') {
              setJobError('Workflow was cancelled')
            }

            // Store result in history
            await storeResultInHistory(jobId, s.data.status, s.data.output, slug, duration)
          } else {
            // Continue polling for non-terminal states
            pollRef.current = window.setTimeout(() => {
              void poll()
            }, 2000)
          }
        } catch (error) {
          console.error('Polling error:', error)
          setStatus('error')
          setJobError(error instanceof Error ? error.message : 'Polling failed')

          // Don't continue polling on error
          if (pollRef.current) {
            clearTimeout(pollRef.current)
            pollRef.current = null
          }
        }
      }

      await poll()
    },
    [jobStartTime, storeResultInHistory]
  )

  // Submit job
  const submitJob = useCallback(
    async (slug: string, patches: JobPatch[]) => {
      // Clear previous results
      setJobResults(null)
      setJobError('')
      setStatus('submitting')
      setJobId('')
      setJobStartTime(Date.now())
      setPollAttempts(0)
      setSubmitting(true)

      try {
        const runBody = {
          slug,
          patches,
          mode: 'auto' as const
        }

        const runRes = await fetch('/api/workflows/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(runBody)
        })

        const runRaw = await runRes.json()

        // Check ASYNC response first (more specific)
        const maybeAsync = RunAsyncRespSchema.safeParse(runRaw)
        if (maybeAsync.success) {
          const initialStatus = mapJobStatusToClientStatus(maybeAsync.data.status)
          setStatus(initialStatus)
          setJobId(maybeAsync.data.id)
          setSubmitting(false)

          // Start polling
          await startPolling(maybeAsync.data.id, slug)
          return
        }

        // Check SYNC response
        const maybeSync = RunSyncRespSchema.safeParse(runRaw)
        if (maybeSync.success) {
          const normalizedStatus = mapJobStatusToClientStatus(maybeSync.data.status)
          setStatus(normalizedStatus)
          setSubmitting(false)

          if (maybeSync.data.output) {
            setJobResults(maybeSync.data.output)
          }
          return
        }

        // Neither schema matched
        console.error('Response matches neither async nor sync schema:', {
          rawResponse: runRaw,
          responseType: typeof runRaw,
          responseKeys: runRaw && typeof runRaw === 'object' ? Object.keys(runRaw) : 'not object'
        })

        setStatus('error')
        setJobError('Unexpected run response')
        setSubmitting(false)
      } catch (error) {
        console.error('Job submission error:', error)
        setStatus('error')
        setJobError(error instanceof Error ? error.message : 'Job submission failed')
        setSubmitting(false)
      }
    },
    [startPolling]
  )

  // Cancel job
  const cancelJob = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/runpod/cancel/${jobId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        console.error('Failed to cancel job:', response.status)
      }

      // Stop polling
      if (pollRef.current) {
        clearTimeout(pollRef.current)
        pollRef.current = null
      }

      setStatus('cancelled')
      setJobError('Job cancelled by user')
    } catch (error) {
      console.error('Cancel job error:', error)
    }
  }, [jobId])

  // Force check status
  const forceCheckStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const sRes = await fetch(`/api/runpod/status/${jobId}`)

      if (!sRes.ok) {
        throw new Error(`Status API failed: ${sRes.status} ${sRes.statusText}`)
      }

      const sRaw = await sRes.json()
      const s = StatusRespSchema.safeParse(sRaw)

      if (!s.success) {
        console.error('Status schema validation failed:', s.error)
        setJobError('Invalid status response from force check')
        return
      }

      const clientStatus = mapJobStatusToClientStatus(s.data.status)
      setStatus(clientStatus)

      // If job is complete, process results immediately
      if (isJobComplete(s.data.status)) {
        if (pollRef.current) {
          clearTimeout(pollRef.current)
          pollRef.current = null
        }

        if (s.data.status === 'COMPLETED') {
          setJobResults(s.data.output || null)
          setJobError('')
        } else {
          setJobError(`Job ${s.data.status.toLowerCase()}`)
        }
      }
    } catch (error) {
      console.error('Force check status error:', error)
      setJobError(error instanceof Error ? error.message : 'Status check failed')
    }
  }, [jobId])

  // Reset job state
  const resetJob = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }

    setJobId('')
    setStatus('idle')
    setJobResults(null)
    setJobError('')
    setSubmitting(false)
    setJobStartTime(undefined)
    setPollAttempts(0)
  }, [])

  // Computed values
  const isTerminal = ['completed', 'failed', 'cancelled', 'timed-out', 'error'].includes(status)
  const isSuccess = status === 'completed'
  const duration = jobStartTime ? Date.now() - jobStartTime : undefined

  return {
    jobId,
    status,
    jobResults,
    jobError,
    submitting,
    jobStartTime,
    pollAttempts,
    submitJob,
    cancelJob,
    forceCheckStatus,
    resetJob,
    isTerminal,
    isSuccess,
    duration
  }
}
