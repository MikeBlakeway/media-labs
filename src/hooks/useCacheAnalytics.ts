'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ModelCacheEntry, VolumeStats, CacheStatus } from '@/lib/cache-manager'

interface CacheAnalyticsData {
  cacheStatus: CacheStatus | null
  models: ModelCacheEntry[]
  volumeHistory: Array<{ timestamp: Date; stats: VolumeStats }>
  loading: boolean
  error: string | null
}

interface CacheAnalyticsActions {
  refreshData: () => Promise<void>
  trackModelAccess: (modelName: string, modelType: string) => Promise<void>
  pinModel: (modelName: string) => Promise<void>
  unpinModel: (modelName: string) => Promise<void>
  triggerOptimization: () => Promise<void>
  evictModel: (modelName: string) => Promise<void>
}

interface CacheMetrics {
  hitRatio: number
  missRatio: number
  averageHeatScore: number
  totalEvictions: number
  totalReclaimed: number
}

/**
 * Hook for cache analytics and model usage tracking
 */
export function useCacheAnalytics(): CacheAnalyticsData & CacheAnalyticsActions & { metrics: CacheMetrics } {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [models, setModels] = useState<ModelCacheEntry[]>([])
  const [volumeHistory, setVolumeHistory] = useState<Array<{ timestamp: Date; stats: VolumeStats }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hitRatio: 0,
    missRatio: 0,
    averageHeatScore: 0,
    totalEvictions: 0,
    totalReclaimed: 0
  })

  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch current cache status
      const statusResponse = await fetch('/api/cache/status')
      if (!statusResponse.ok) {
        throw new Error(`Failed to fetch cache status: ${statusResponse.statusText}`)
      }
      const statusData = await statusResponse.json()

      // Transform date strings back to Date objects
      if (statusData.cacheStatus) {
        if (statusData.cacheStatus.lastOptimization) {
          statusData.cacheStatus.lastOptimization = new Date(statusData.cacheStatus.lastOptimization)
        }
        if (statusData.cacheStatus.nextScheduledCleanup) {
          statusData.cacheStatus.nextScheduledCleanup = new Date(statusData.cacheStatus.nextScheduledCleanup)
        }
      }

      setCacheStatus(statusData.cacheStatus)

      // Transform model data
      const modelsData =
        statusData.models?.map((model: ModelCacheEntry) => ({
          ...model,
          lastAccessed: new Date(model.lastAccessed)
        })) || []

      setModels(modelsData)

      // Fetch volume history
      const historyResponse = await fetch('/api/cache/analytics/volume-history')
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        const transformedHistory =
          historyData.history?.map((entry: { timestamp: string; stats: VolumeStats }) => ({
            timestamp: new Date(entry.timestamp),
            stats: entry.stats
          })) || []
        setVolumeHistory(transformedHistory)
      }

      // Fetch metrics
      const metricsResponse = await fetch('/api/cache/analytics/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(
          metricsData.metrics || {
            hitRatio: 0,
            missRatio: 0,
            averageHeatScore: 0,
            totalEvictions: 0,
            totalReclaimed: 0
          }
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cache data'
      setError(message)
      console.error('Cache analytics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const trackModelAccess = useCallback(
    async (modelName: string, modelType: string) => {
      try {
        const response = await fetch('/api/cache/track-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelName, modelType })
        })

        if (!response.ok) {
          throw new Error(`Failed to track model access: ${response.statusText}`)
        }

        // Refresh data to get updated stats
        await refreshData()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to track model access'
        setError(message)
        console.error('Model access tracking error:', err)
      }
    },
    [refreshData]
  )

  const pinModel = useCallback(async (modelName: string) => {
    try {
      const response = await fetch('/api/cache/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName, pinned: true })
      })

      if (!response.ok) {
        throw new Error(`Failed to pin model: ${response.statusText}`)
      }

      // Update local state immediately
      setModels(prev => prev.map(model => (model.modelName === modelName ? { ...model, isPinned: true } : model)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pin model'
      setError(message)
      console.error('Model pinning error:', err)
    }
  }, [])

  const unpinModel = useCallback(async (modelName: string) => {
    try {
      const response = await fetch('/api/cache/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName, pinned: false })
      })

      if (!response.ok) {
        throw new Error(`Failed to unpin model: ${response.statusText}`)
      }

      // Update local state immediately
      setModels(prev => prev.map(model => (model.modelName === modelName ? { ...model, isPinned: false } : model)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unpin model'
      setError(message)
      console.error('Model unpinning error:', err)
    }
  }, [])

  const triggerOptimization = useCallback(async () => {
    try {
      const response = await fetch('/api/cache/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to trigger optimization: ${response.statusText}`)
      }

      // Refresh data to get updated stats
      await refreshData()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to trigger cache optimization'
      setError(message)
      console.error('Cache optimization error:', err)
    }
  }, [refreshData])

  const evictModel = useCallback(
    async (modelName: string) => {
      try {
        const response = await fetch('/api/cache/evict', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelName })
        })

        if (!response.ok) {
          throw new Error(`Failed to evict model: ${response.statusText}`)
        }

        // Remove from local state immediately
        setModels(prev => prev.filter(model => model.modelName !== modelName))

        // Refresh to get updated volume stats
        await refreshData()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to evict model'
        setError(message)
        console.error('Model eviction error:', err)
      }
    },
    [refreshData]
  )

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [refreshData])

  return {
    cacheStatus,
    models,
    volumeHistory,
    loading,
    error,
    metrics,
    refreshData,
    trackModelAccess,
    pinModel,
    unpinModel,
    triggerOptimization,
    evictModel
  }
}

/**
 * Hook for getting cache efficiency metrics
 */
export function useCacheMetrics() {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hitRatio: 0,
    missRatio: 0,
    averageHeatScore: 0,
    totalEvictions: 0,
    totalReclaimed: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cache/analytics/metrics')
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }

      const data = await response.json()
      setMetrics(data.metrics)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load metrics'
      setError(message)
      console.error('Cache metrics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()

    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refreshMetrics: fetchMetrics
  }
}
