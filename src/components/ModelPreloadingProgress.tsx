/**
 * Model Preloading Progress Component
 *
 * Displays real-time progress of model preloading operations.
 * Shows queue status, active downloads, and estimated completion times.
 */

'use client'

import { useModelPreloading } from '@/hooks'

interface ModelPreloadingProgressProps {
  workflowSlug?: string
  compact?: boolean
  showActions?: boolean
}

export function ModelPreloadingProgress({
  workflowSlug,
  compact = false,
  showActions = true
}: ModelPreloadingProgressProps) {
  const preloading = useModelPreloading(workflowSlug)

  // Don't render if no active downloads and no workflow-specific data
  if (!workflowSlug && preloading.activeDownloads === 0 && preloading.queuedDownloads === 0) {
    return null
  }

  // Workflow-specific rendering
  if (workflowSlug && preloading.workflowStatus) {
    const status = preloading.workflowStatus

    if (compact) {
      return (
        <div className='flex items-center gap-2 text-sm'>
          {status.readyNow ? (
            <div className='flex items-center gap-1 text-green-600 dark:text-green-400'>
              <span>✓</span>
              <span>Models ready</span>
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
              <span className='text-secondary'>Preparing {status.pendingModels.length} models</span>
              {status.estimatedReadyTime && (
                <span className='text-muted'>(ready in {formatReadyTime(status.estimatedReadyTime)})</span>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className='rounded-xl border border-default bg-card p-4'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='font-semibold text-primary'>Model Preloading</h3>
          {showActions && (
            <div className='flex gap-2'>
              {!status.readyNow && (
                <button
                  onClick={() => preloading.preloadWorkflow(workflowSlug, 'manual_request')}
                  disabled={preloading.loading}
                  className='text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600'
                >
                  {preloading.loading ? 'Starting...' : 'Speed Up'}
                </button>
              )}
              <button
                onClick={() => preloading.refreshStatus()}
                className='text-sm px-3 py-1 bg-panel text-secondary rounded-lg hover:bg-input transition-colors'
              >
                🔄 Refresh
              </button>
            </div>
          )}
        </div>

        {status.readyNow ? (
          <div className='flex items-center gap-2 text-green-600 dark:text-green-400'>
            <span className='text-lg'>✓</span>
            <span className='font-medium'>All required models are ready!</span>
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-secondary'>Preparing {status.pendingModels.length} models...</span>
              {status.estimatedReadyTime && (
                <span className='text-muted'>Ready in {formatReadyTime(status.estimatedReadyTime)}</span>
              )}
            </div>

            <div className='space-y-2'>
              {status.requiredModels.map(model => (
                <div key={`${model.type}:${model.name}`} className='flex items-center gap-3'>
                  <ModelStatusIcon status={model.status} />
                  <span className='flex-1 text-sm font-mono truncate text-secondary'>{model.name}</span>
                  {model.status === 'downloading' && (
                    <div className='w-16 h-2 bg-panel rounded-full overflow-hidden dark:bg-slate-700'>
                      <div
                        className='h-full bg-blue-500 transition-all duration-300'
                        style={{ width: `${model.progress * 100}%` }}
                      />
                    </div>
                  )}
                  <span className='text-xs text-gray-500 w-16 text-right'>{getStatusText(model.status)}</span>
                </div>
              ))}
            </div>

            {status.queueSummary.totalProgress > 0 && (
              <div className='pt-2 border-t'>
                <div className='flex items-center justify-between text-sm mb-1'>
                  <span>Overall Progress</span>
                  <span>{Math.round(status.queueSummary.totalProgress * 100)}%</span>
                </div>
                <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500'
                    style={{ width: `${status.queueSummary.totalProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {preloading.error && (
          <div className='mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>
            {preloading.error}
          </div>
        )}
      </div>
    )
  }

  // General queue status rendering
  if (preloading.queueStatus) {
    const queue = preloading.queueStatus

    if (compact) {
      return (
        <div className='flex items-center gap-2 text-sm'>
          {queue.summary.activeDownloads > 0 && (
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
              <span>Downloading {queue.summary.activeDownloads} models</span>
              <span className='text-gray-500'>({Math.round(queue.summary.overallProgress * 100)}%)</span>
            </div>
          )}
          {queue.summary.queuedDownloads > 0 && (
            <span className='text-gray-600'>+{queue.summary.queuedDownloads} queued</span>
          )}
        </div>
      )
    }

    return (
      <div className='rounded-xl border p-4'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='font-semibold text-gray-900'>Download Queue</h3>
          {showActions && (
            <div className='flex gap-2'>
              <button
                onClick={() => preloading.cancelPreload()}
                disabled={queue.summary.activeDownloads === 0}
                className='text-sm px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50'
              >
                Cancel All
              </button>
              <button
                onClick={() => preloading.refreshStatus()}
                className='text-sm px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700'
              >
                🔄 Refresh
              </button>
            </div>
          )}
        </div>

        <div className='grid grid-cols-4 gap-4 mb-4 text-center'>
          <div>
            <div className='text-2xl font-bold text-blue-600'>{queue.summary.activeDownloads}</div>
            <div className='text-sm text-gray-600'>Active</div>
          </div>
          <div>
            <div className='text-2xl font-bold text-yellow-600'>{queue.summary.queuedDownloads}</div>
            <div className='text-sm text-gray-600'>Queued</div>
          </div>
          <div>
            <div className='text-2xl font-bold text-green-600'>{queue.summary.completedDownloads}</div>
            <div className='text-sm text-gray-600'>Completed</div>
          </div>
          <div>
            <div className='text-2xl font-bold text-red-600'>{queue.summary.failedDownloads}</div>
            <div className='text-sm text-gray-600'>Failed</div>
          </div>
        </div>

        {queue.summary.overallProgress > 0 && (
          <div className='mb-4'>
            <div className='flex items-center justify-between text-sm mb-1'>
              <span>Overall Progress</span>
              <span>{Math.round(queue.summary.overallProgress * 100)}%</span>
            </div>
            <div className='w-full h-3 bg-gray-200 rounded-full overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500'
                style={{ width: `${queue.summary.overallProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Active downloads */}
        {queue.queue.active.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-gray-900'>Active Downloads</h4>
            {queue.queue.active.map(model => (
              <div
                key={`${model.modelType}:${model.modelName}`}
                className='flex items-center gap-3 p-2 bg-blue-50 rounded-lg'
              >
                <ModelStatusIcon status={model.status} />
                <span className='flex-1 text-sm font-mono truncate'>{model.modelName}</span>
                <div className='w-20 h-2 bg-white rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-blue-500 transition-all duration-300'
                    style={{ width: `${model.progress * 100}%` }}
                  />
                </div>
                <span className='text-xs text-gray-600 w-12 text-right'>{Math.round(model.progress * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

function ModelStatusIcon({ status }: { status: string }) {
  const icons = {
    queued: '⏳',
    downloading: '⬇️',
    completed: '✅',
    failed: '❌',
    cancelled: '⏹️',
    not_queued: '⭕'
  }

  const colors = {
    queued: 'text-yellow-500',
    downloading: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-gray-500',
    not_queued: 'text-gray-400'
  }

  return (
    <span className={`text-sm ${colors[status as keyof typeof colors] || 'text-gray-400'}`}>
      {icons[status as keyof typeof icons] || '❓'}
    </span>
  )
}

function getStatusText(status: string): string {
  const texts = {
    queued: 'Queued',
    downloading: 'Loading...',
    completed: 'Ready',
    failed: 'Failed',
    cancelled: 'Cancelled',
    not_queued: 'Pending'
  }

  return texts[status as keyof typeof texts] || status
}

function formatReadyTime(readyTime: string): string {
  const now = new Date()
  const ready = new Date(readyTime)
  const diffMs = ready.getTime() - now.getTime()
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000))

  if (diffSeconds < 60) {
    return `${diffSeconds}s`
  } else if (diffSeconds < 3600) {
    return `${Math.round(diffSeconds / 60)}m`
  } else {
    return `${Math.round(diffSeconds / 3600)}h`
  }
}
