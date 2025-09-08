import { useState, useRef, useCallback } from 'react'
import type { WorkflowMode } from './useWorkflowRunner'

export interface UseWorkflowRunnerJobResult {
  // Job state
  jobId: string
  status: string
  jobResults: unknown | null
  jobError: string
  submitting: boolean
  jobStartTime?: number
  pollAttempts: number

  // Actions
  submitWorkflow: (
    workflow: Record<string, unknown>,
    patches: Array<{ nodeId: string; inputKey: string; value: string }>,
    mode: WorkflowMode
  ) => Promise<void>
  cancelJob: () => Promise<void>
  forceCheckStatus: () => Promise<void>
  resetJob: () => void

  // Computed
  canCancel: boolean
  isTerminal: boolean
  isSuccess: boolean
  duration?: number
}

/**
 * Specialized hook for workflow runner job management.
 * Simplified version of useJobManagement specifically for the workflow runner component.
 */
export function useWorkflowRunnerJob(): UseWorkflowRunnerJobResult {
  const [jobId, setJobId] = useState<string>('')
  const [status, setStatus] = useState<string>('idle')
  const [jobResults, setJobResults] = useState<unknown | null>(null)
  const [jobError, setJobError] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [jobStartTime, setJobStartTime] = useState<number | undefined>(undefined)
  const [pollAttempts, setPollAttempts] = useState<number>(0)

  const pollRef = useRef<number | null>(null)

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

  const startPolling = useCallback(async (jobId: string) => {
    const poll = async (): Promise<void> => {
      try {
        setPollAttempts(prev => prev + 1)

        const sRes = await fetch(`/api/runpod/status/${jobId}`)
        if (!sRes.ok) {
          throw new Error(`Status API failed: ${sRes.status}`)
        }

        const statusData = await sRes.json()

        if (statusData.status === 'COMPLETED') {
          setStatus('completed')
          setJobResults(statusData.output || null)
          setJobError('')
        } else if (statusData.status === 'FAILED') {
          setStatus('failed')
          setJobError('Workflow execution failed')
        } else if (statusData.status === 'CANCELLED') {
          setStatus('cancelled')
          setJobError('Workflow was cancelled')
        } else if (statusData.status === 'TIMED_OUT') {
          setStatus('timed-out')
          setJobError('Workflow timed out')
        } else {
          // Continue polling for non-terminal states
          setStatus(statusData.status || 'running')
          setTimeout(() => poll(), 2000)
        }
      } catch (error) {
        console.error('Polling error:', error)
        setStatus('error')
        setJobError(error instanceof Error ? error.message : 'Polling failed')
      }
    }

    await poll()
  }, [])

  const submitWorkflow = useCallback(
    async (
      workflow: Record<string, unknown>,
      patches: Array<{ nodeId: string; inputKey: string; value: string }>,
      mode: WorkflowMode
    ) => {
      // Reset state for new submission
      setStatus('submitting')
      setJobResults(null)
      setJobError('')
      setJobId('')
      setSubmitting(true)
      setJobStartTime(Date.now())
      setPollAttempts(0)

      try {
        const body = {
          workflow,
          patches,
          mode
        }

        const res = await fetch('/api/workflows/patch-run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${data?.error || 'Unknown error'}`)
        }

        // Handle sync completion
        if (data?.status === 'COMPLETED' && data?.output) {
          setStatus('completed')
          setJobResults(data.output)
          setSubmitting(false)
          return
        }

        // Handle async jobs - start polling
        if (data?.id) {
          setStatus('queued')
          setJobId(data.id)
          setSubmitting(false)

          // Start polling
          await startPolling(data.id)
          return
        }

        // Handle unexpected responses
        throw new Error(`Unexpected response: ${JSON.stringify(data)}`)
      } catch (error) {
        console.error('Workflow submission failed:', error)
        setStatus('error')
        setJobError(error instanceof Error ? error.message : 'Submission failed')
        setSubmitting(false)
      }
    },
    [startPolling]
  )

  const cancelJob = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/runpod/cancel/${jobId}`, {
        method: 'POST'
      })

      if (response.ok) {
        setStatus('cancelled')
        setJobError('Job cancelled by user')
      }
    } catch (error) {
      console.error('Cancel job error:', error)
    }
  }, [jobId])

  const forceCheckStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const sRes = await fetch(`/api/runpod/status/${jobId}`)
      if (!sRes.ok) throw new Error(`Status check failed: ${sRes.status}`)

      const statusData = await sRes.json()
      setStatus(statusData.status || 'unknown')
    } catch (error) {
      console.error('Force check error:', error)
    }
  }, [jobId])

  // Computed values
  const canCancel = Boolean(jobId && (status === 'queued' || status === 'running'))
  const isTerminal = ['completed', 'failed', 'cancelled', 'timed-out', 'error'].includes(status)
  const isSuccess = status === 'completed'
  const duration = jobStartTime ? Date.now() - jobStartTime : undefined

  return {
    // Job state
    jobId,
    status,
    jobResults,
    jobError,
    submitting,
    jobStartTime,
    pollAttempts,

    // Actions
    submitWorkflow,
    cancelJob,
    forceCheckStatus,
    resetJob,

    // Computed
    canCancel,
    isTerminal,
    isSuccess,
    duration
  }
}
