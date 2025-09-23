import { useState, useEffect, useCallback } from 'react'

interface SignedUrlResponse {
  signedUrl: string
  expiresAt: string
}

interface UseSignedUrlState {
  signedUrl: string | null
  loading: boolean
  error: string | null
}

interface UseSignedUrlOptions {
  expiresIn?: number // Expiration time in seconds
  autoRefresh?: boolean // Auto-refresh before expiration
  refreshBuffer?: number // Refresh buffer time in seconds (default: 300 = 5 minutes)
}

/**
 * Hook to generate and manage signed URLs for private S3 files
 *
 * Features:
 * - Automatic caching
 * - Auto-refresh before expiration
 * - Error handling
 * - Loading states
 */
export function useSignedUrl(
  s3Url: string | null,
  options: UseSignedUrlOptions = {}
): UseSignedUrlState & { refresh: () => void } {
  const {
    expiresIn = 3600, // 1 hour default
    autoRefresh = true,
    refreshBuffer = 300 // 5 minutes before expiration
  } = options

  const [state, setState] = useState<UseSignedUrlState>({
    signedUrl: null,
    loading: false,
    error: null
  })

  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  const generateSignedUrl = useCallback(async () => {
    if (!s3Url) {
      setState({ signedUrl: null, loading: false, error: null })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/generate-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          s3Url,
          expiresIn
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate signed URL: ${response.statusText}`)
      }

      const data: SignedUrlResponse = await response.json()

      setState({
        signedUrl: data.signedUrl,
        loading: false,
        error: null
      })

      // Set up auto-refresh timer if enabled
      if (autoRefresh) {
        const expiresAt = new Date(data.expiresAt).getTime()
        const now = Date.now()
        const timeToRefresh = expiresAt - now - refreshBuffer * 1000

        if (timeToRefresh > 0) {
          const timer = setTimeout(() => {
            generateSignedUrl()
          }, timeToRefresh)
          setRefreshTimer(timer)
        }
      }
    } catch (err) {
      console.error('Error generating signed URL:', err)
      setState({
        signedUrl: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }, [s3Url, expiresIn, autoRefresh, refreshBuffer])

  // Initial load and dependency changes
  useEffect(() => {
    generateSignedUrl()

    // Cleanup timer on unmount or dependency changes
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        setRefreshTimer(null)
      }
    }
  }, [generateSignedUrl, refreshTimer])

  const refresh = useCallback(() => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      setRefreshTimer(null)
    }
    generateSignedUrl()
  }, [generateSignedUrl, refreshTimer])

  return {
    ...state,
    refresh
  }
}
