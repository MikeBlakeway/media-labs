'use client'

import type { JobStatus } from '../hooks/useJobSSE'

export interface JobStatusDisplayProps {
  /** Current job status */
  job: JobStatus
  /** Whether SSE is connected */
  isConnected: boolean
  /** Any SSE connection errors */
  error?: string | null
  /** Additional CSS classes */
  className?: string
  /** Callback when reconnect is requested */
  onReconnect?: () => void
}

/**
 * Job status display component
 * Shows current job progress, status, and connection state
 */
export function JobStatusDisplay({
  job,
  isConnected,
  error,
  className = '',
  onReconnect
}: JobStatusDisplayProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      case 'RUNNING':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
      case 'COMPLETED':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
      case 'FAILED':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      case 'RUNNING':
        return (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )
      case 'COMPLETED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'FAILED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'Job is in queue waiting to be processed'
      case 'RUNNING':
        return 'Video is being generated'
      case 'COMPLETED':
        return 'Video generation completed successfully'
      case 'FAILED':
        return 'Video generation failed'
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(job.status)} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon(job.status)}
          <div>
            <h3 className="font-semibold">
              Job Status: {job.status}
            </h3>
            <p className="text-sm opacity-75">
              {getStatusMessage(job.status)}
            </p>
          </div>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs opacity-75">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Progress bar (only for RUNNING status) */}
      {job.status === 'RUNNING' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{job.progressPct || 0}%</span>
          </div>
          <div className="w-full bg-white dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-current h-2 rounded-full transition-all duration-300"
              style={{ width: `${job.progressPct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Job details */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="opacity-75">Job ID:</span>
          <code className="font-mono bg-white dark:bg-slate-700 px-1 rounded text-xs">
            {job.id}
          </code>
        </div>
        {job.updatedAt && (
          <div className="flex justify-between">
            <span className="opacity-75">Last Updated:</span>
            <span>{new Date(job.updatedAt).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {job.error && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 text-sm">
          <strong>Error:</strong> {job.error}
        </div>
      )}

      {/* SSE connection error */}
      {error && (
        <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded text-orange-800 dark:text-orange-200 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <strong>Connection Issue:</strong> {error}
            </div>
            {onReconnect && (
              <button
                onClick={onReconnect}
                className="ml-2 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition-colors"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}