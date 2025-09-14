/**
 * useModelPreloading Hook
 *
 * Manages model preloading state and operations for UI components.
 * Provides functionality to trigger preloading and monitor progress.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'

// Status response schemas
const ModelStatusSchema = z.object({
  modelName: z.string(),
  modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
  status: z.enum(['queued', 'downloading', 'completed', 'failed', 'cancelled', 'not_queued']),
  progress: z.number().min(0).max(1),
  estimatedTimeRemaining: z.number().optional(),
  inQueue: z.boolean()
})

const WorkflowStatusSchema = z.object({
  workflowSlug: z.string(),
  workflowName: z.string(),
  readyNow: z.boolean(),
  estimatedReadyTime: z.string().nullable(),
  pendingModels: z.array(z.string()),
  requiredModels: z.array(
    ModelStatusSchema.extend({
      nodeId: z.string(),
      classType: z.string(),
      type: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
      name: z.string()
    })
  ),
  queueSummary: z.object({
    totalActive: z.number(),
    totalQueued: z.number(),
    totalProgress: z.number(),
    estimatedCompletion: z.string().optional()
  })
})

const QueueStatusSchema = z.object({
  queue: z.object({
    active: z.array(ModelStatusSchema),
    queued: z.array(ModelStatusSchema),
    completed: z.array(ModelStatusSchema),
    failed: z.array(ModelStatusSchema),
    totalProgress: z.number(),
    estimatedCompletion: z.string().optional()
  }),
  summary: z.object({
    totalModels: z.number(),
    activeDownloads: z.number(),
    queuedDownloads: z.number(),
    completedDownloads: z.number(),
    failedDownloads: z.number(),
    overallProgress: z.number(),
    estimatedCompletion: z.string().optional()
  })
})

export type ModelStatus = z.infer<typeof ModelStatusSchema>
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>
export type QueueStatus = z.infer<typeof QueueStatusSchema>

export interface UseModelPreloadingResult {
  // State
  loading: boolean
  error: string
  workflowStatus: WorkflowStatus | null
  queueStatus: QueueStatus | null

  // Actions
  preloadWorkflow: (workflowSlug: string, trigger?: string) => Promise<void>
  preloadModels: (models: Array<{ modelName: string; modelType: string; priority?: number }>) => Promise<void>
  cancelPreload: (modelNames?: string[]) => Promise<void>
  refreshStatus: () => Promise<void>

  // Computed values
  isWorkflowReady: boolean
  workflowReadyTime: string | null
  activeDownloads: number
  queuedDownloads: number
  overallProgress: number
}

export function useModelPreloading(workflowSlug?: string): UseModelPreloadingResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)

  // Use ref to track workflowSlug without causing refreshStatus to be recreated
  const workflowSlugRef = useRef(workflowSlug)
  workflowSlugRef.current = workflowSlug

  // Refresh status from API
  const refreshStatus = useCallback(async () => {
    try {
      const currentWorkflowSlug = workflowSlugRef.current
      const params = new URLSearchParams()
      if (currentWorkflowSlug) {
        params.append('workflowSlug', currentWorkflowSlug)
      }

      const response = await fetch(`/api/models/status?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch status')
      }

      const data = await response.json()

      if (currentWorkflowSlug && data.workflowSlug) {
        // Parse workflow-specific status
        const workflowResult = WorkflowStatusSchema.safeParse(data)
        if (workflowResult.success) {
          setWorkflowStatus(workflowResult.data)
        } else {
          console.error('Invalid workflow status format:', workflowResult.error)
          setError('Invalid status data format')
        }
      } else {
        // Parse general queue status
        const queueResult = QueueStatusSchema.safeParse(data)
        if (queueResult.success) {
          setQueueStatus(queueResult.data)
        } else {
          console.error('Invalid queue status format:', queueResult.error)
          setError('Invalid status data format')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh status'
      console.error('Refresh status error:', err)
      setError(message)
    }
  }, []) // Remove workflowSlug dependency to prevent refreshStatus from being recreated

  // Preload models for a specific workflow
  const preloadWorkflow = useCallback(
    async (slug: string, trigger = 'manual_request') => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/models/preload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'workflow',
            workflowSlug: slug,
            trigger
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to start preloading')
        }

        const result = await response.json()
        console.log('Preloading started:', result)

        // Refresh status after preloading starts
        await refreshStatus()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start preloading'
        console.error('Preload workflow error:', err)
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [refreshStatus]
  )

  // Preload specific models
  const preloadModels = useCallback(
    async (models: Array<{ modelName: string; modelType: string; priority?: number }>) => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/models/preload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'models',
            models: models.map(m => ({
              modelName: m.modelName,
              modelType: m.modelType,
              priority: m.priority || 0.5
            })),
            trigger: 'manual_request'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to start preloading')
        }

        const result = await response.json()
        console.log('Model preloading started:', result)

        // Refresh status after preloading starts
        await refreshStatus()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start preloading'
        console.error('Preload models error:', err)
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [refreshStatus]
  )

  // Cancel preloading
  const cancelPreload = useCallback(
    async (modelNames?: string[]) => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/models/preload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancel',
            modelNames
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to cancel preloading')
        }

        const result = await response.json()
        console.log('Preloading cancelled:', result)

        // Refresh status after cancellation
        await refreshStatus()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel preloading'
        console.error('Cancel preload error:', err)
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [refreshStatus]
  )

  // Auto-refresh status periodically
  useEffect(() => {
    // Initial load
    void refreshStatus()

    // Set up polling for active downloads using a stable reference
    const interval = setInterval(() => {
      void refreshStatus()
    }, 5000) // Poll every 5 seconds (reduced frequency to prevent excessive API calls)

    return () => clearInterval(interval)
  }, [refreshStatus]) // Only depend on refreshStatus, not on reactive state

  // Computed values
  const isWorkflowReady = workflowStatus?.readyNow || false
  const workflowReadyTime = workflowStatus?.estimatedReadyTime || null
  const activeDownloads = queueStatus?.summary.activeDownloads || workflowStatus?.queueSummary.totalActive || 0
  const queuedDownloads = queueStatus?.summary.queuedDownloads || workflowStatus?.queueSummary.totalQueued || 0
  const overallProgress = queueStatus?.summary.overallProgress || workflowStatus?.queueSummary.totalProgress || 0

  return {
    // State
    loading,
    error,
    workflowStatus,
    queueStatus,

    // Actions
    preloadWorkflow,
    preloadModels,
    cancelPreload,
    refreshStatus,

    // Computed values
    isWorkflowReady,
    workflowReadyTime,
    activeDownloads,
    queuedDownloads,
    overallProgress
  }
}
