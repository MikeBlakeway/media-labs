/**
 * useResultHistory Hook
 *
 * Manages workflow result history loading, filtering, and display.
 * Extracts history logic from the ResultHistory component.
 */

import { useCallback, useEffect, useState } from 'react'

export interface HistoryItem {
  jobId: string
  status: string
  output: {
    images?: Array<{
      base64?: string
      url?: string
      filename?: string
      // RunPod format support
      data?: string
      type?: 'base64' | 's3_url'
    }>
    errors?: string[]
  } | null
  timestamp: number
  slug: string
  duration?: number
}

export interface UseResultHistoryResult {
  // History state
  history: HistoryItem[]
  loading: boolean
  error: string
  filter: 'all' | 'current'

  // Actions
  loadHistory: () => Promise<void>
  setFilter: (filter: 'all' | 'current') => void
  downloadResult: (item: HistoryItem, imageIndex?: number) => void

  // Computed values
  filteredHistory: HistoryItem[]
  getThumbnail: (item: HistoryItem) => string | null
}

export function useResultHistory(currentSlug: string): UseResultHistoryResult {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilterState] = useState<'all' | 'current'>('current')

  // Load history from API
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (filter === 'current') {
        params.set('slug', currentSlug)
      }

      const response = await fetch(`/api/workflows/results?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setHistory(data.results || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history'
      console.error('Failed to load workflow history:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentSlug, filter])

  // Load history when dependencies change
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // Set filter and reload
  const setFilter = useCallback((newFilter: 'all' | 'current') => {
    setFilterState(newFilter)
  }, [])

  // Get thumbnail from history item
  const getThumbnail = useCallback((item: HistoryItem) => {
    if (!item.output?.images?.[0]) {
      return null
    }

    const img = item.output.images[0]
    // Handle both our format and RunPod format
    const base64Data = img.base64 || img.data
    return base64Data ? `data:image/png;base64,${base64Data}` : img.url || null
  }, [])

  // Download result
  const downloadResult = useCallback((item: HistoryItem, imageIndex = 0) => {
    const image = item.output?.images?.[imageIndex]
    if (!image) {
      console.warn('No image data found for download')
      return
    }

    // Handle both our format and RunPod format
    const base64Data = image.base64 || image.data
    if (!base64Data) {
      console.warn('No base64 data found for download')
      return
    }

    try {
      const link = document.createElement('a')
      link.href = `data:image/png;base64,${base64Data}`
      link.download = image.filename || `result-${item.jobId.slice(0, 8)}-${imageIndex + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [])

  // Filter history based on current filter setting
  const filteredHistory = history.filter(item => {
    if (filter === 'current') return item.slug === currentSlug
    return true
  })

  return {
    history,
    loading,
    error,
    filter,
    loadHistory,
    setFilter,
    downloadResult,
    filteredHistory,
    getThumbnail
  }
}
