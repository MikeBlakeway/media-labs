'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

export interface JobStatus {
  id: string
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  progressPct?: number | null
  outputUrl?: string | null
  downloadUrl?: string
  error?: string | null
  updatedAt?: string
}

export interface SSEEvent {
  type: string
  data?: any
  timestamp?: string
}

export interface UseJobSSEOptions {
  /** Whether to automatically fetch job details when status becomes COMPLETED */
  fetchJobOnComplete?: boolean
}

export interface UseJobSSEReturn {
  /** Current job status and data */
  job: JobStatus | null
  /** Whether SSE connection is currently connected */
  isConnected: boolean
  /** Any connection or processing errors */
  error: string | null
  /** Whether we're currently fetching job details */
  isLoading: boolean
  /** Manually trigger a job details fetch */
  fetchJob: () => Promise<void>
  /** Manually reconnect SSE if needed */
  reconnect: () => void
}

/**
 * React hook for SSE job status updates and video playback integration
 * 
 * @param jobId - The job ID to track
 * @param options - Configuration options
 * @returns Job status, connection state, and control functions
 */
export function useJobSSE(
  jobId: string | null,
  options: UseJobSSEOptions = {}
): UseJobSSEReturn {
  const { fetchJobOnComplete = true } = options
  
  const [job, setJob] = useState<JobStatus | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastJobStatusRef = useRef<string | null>(null)

  /**
   * Fetch job details from API
   */
  const fetchJob = useCallback(async (): Promise<void> => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/jobs/${jobId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found')
        }
        throw new Error(`Failed to fetch job: ${response.status}`)
      }

      const jobData = await response.json()
      
      setJob({
        id: jobData.id,
        status: jobData.status,
        progressPct: jobData.progressPct,
        outputUrl: jobData.outputUrl,
        downloadUrl: jobData.downloadUrl,
        error: jobData.error,
        updatedAt: jobData.updatedAt
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job'
      setError(errorMessage)
      console.error('Failed to fetch job:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  /**
   * Clean up existing SSE connection
   */
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    if (!jobId) return

    cleanup()
    setError(null)

    try {
      const eventSource = new EventSource(`${API_BASE}/api/jobs/stream?jobId=${jobId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log(`SSE connected for job ${jobId}`)
        setIsConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data)
          
          // Handle different event types
          switch (sseEvent.type) {
            case 'connected':
              console.log('SSE connection confirmed:', sseEvent.data)
              // Update job with initial status from connection event
              if (sseEvent.data) {
                setJob(prevJob => ({
                  id: sseEvent.data.jobId,
                  status: sseEvent.data.jobStatus,
                  progressPct: sseEvent.data.progressPct,
                  outputUrl: prevJob?.outputUrl || null,
                  downloadUrl: prevJob?.downloadUrl,
                  error: prevJob?.error || null,
                  updatedAt: sseEvent.data.connectedAt || new Date().toISOString()
                }))
              }
              break

            case 'job_status_update':
              console.log('Job status update:', sseEvent.data)
              if (sseEvent.data) {
                const newStatus = sseEvent.data.status
                const wasCompleted = lastJobStatusRef.current === 'COMPLETED'
                const nowCompleted = newStatus === 'COMPLETED'
                
                setJob(prevJob => ({
                  id: sseEvent.data.jobId,
                  status: newStatus,
                  progressPct: sseEvent.data.progressPct,
                  outputUrl: sseEvent.data.outputUrl || prevJob?.outputUrl || null,
                  downloadUrl: prevJob?.downloadUrl,
                  error: sseEvent.data.error || prevJob?.error || null,
                  updatedAt: sseEvent.data.updatedAt || sseEvent.timestamp || new Date().toISOString()
                }))
                
                // If job just completed and we have fetchJobOnComplete enabled,
                // fetch full job details to get download URL
                if (!wasCompleted && nowCompleted && fetchJobOnComplete) {
                  console.log('Job completed, fetching full details...')
                  fetchJob()
                }
                
                lastJobStatusRef.current = newStatus
              }
              break

            case 'heartbeat':
              // Just keep the connection alive, no UI updates needed
              break

            default:
              console.log('Unknown SSE event type:', sseEvent.type, sseEvent)
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err, event.data)
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err)
        setIsConnected(false)
        setError('Connection lost. Attempting to reconnect...')
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting SSE reconnection...')
          connect()
        }, 5000)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to updates'
      setError(errorMessage)
      console.error('Failed to create SSE connection:', err)
    }
  }, [jobId, cleanup, fetchJob, fetchJobOnComplete])

  /**
   * Reconnect function for manual reconnection
   */
  const reconnect = useCallback(() => {
    console.log('Manual SSE reconnection requested')
    connect()
  }, [connect])

  // Connect when jobId changes
  useEffect(() => {
    if (jobId) {
      connect()
    } else {
      cleanup()
      setJob(null)
    }

    // Cleanup on unmount or jobId change
    return cleanup
  }, [jobId, connect, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    job,
    isConnected,
    error,
    isLoading,
    fetchJob,
    reconnect
  }
}