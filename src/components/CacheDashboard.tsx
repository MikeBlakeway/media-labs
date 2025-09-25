'use client'

import { useCacheAnalytics } from '@/hooks/useCacheAnalytics'
import { CACHE_CONFIG, type ModelCacheEntry } from '@/lib/cache-manager'

interface CacheStatusCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
}

function CacheStatusCard({ title, value, subtitle, className = '' }: CacheStatusCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow p-6 border dark:border-slate-700 ${className}`}>
      <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>{title}</h3>
      <p className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>{value}</p>
      {subtitle && <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{subtitle}</p>}
    </div>
  )
}

interface ModelListProps {
  models: ModelCacheEntry[]
  onPin: (modelName: string) => void
  onUnpin: (modelName: string) => void
  onEvict: (modelName: string) => void
}

function ModelList({ models, onPin, onUnpin, onEvict }: ModelListProps) {
  const sortedModels = [...models].sort((a, b) => b.heatScore - a.heatScore)

  return (
    <div className='bg-white dark:bg-slate-800 shadow rounded-lg border dark:border-slate-700'>
      <div className='px-6 py-4 border-b border-gray-200 dark:border-slate-600'>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>Models ({models.length})</h3>
      </div>
      <div className='max-h-96 overflow-y-auto'>
        {sortedModels.map(model => (
          <div
            key={model.modelName}
            className='flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-600 last:border-b-0'
          >
            <div className='flex-1 min-w-0'>
              <div className='flex items-center'>
                <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>{model.modelName}</p>
                <span
                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    model.type === 'unet'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : model.type === 'clip'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : model.type === 'vae'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : model.type === 'lora'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {model.type}
                </span>
                {model.isPinned && (
                  <span className='ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'>
                    Pinned
                  </span>
                )}
                {model.isInUse && (
                  <span className='ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                    In Use
                  </span>
                )}
              </div>
              <div className='mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300'>
                <span>Heat: {model.heatScore.toFixed(3)}</span>
                <span className='mx-2'>•</span>
                <span>Size: {(model.size / 1024 / 1024 / 1024).toFixed(2)}GB</span>
                <span className='mx-2'>•</span>
                <span>Accessed: {model.accessCount} times</span>
                <span className='mx-2'>•</span>
                <span>Last: {new Date(model.lastAccessed).toLocaleDateString()}</span>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              {model.isPinned ? (
                <button
                  onClick={() => onUnpin(model.modelName)}
                  className='inline-flex items-center px-3 py-1 border border-gray-300 dark:border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Unpin
                </button>
              ) : (
                <button
                  onClick={() => onPin(model.modelName)}
                  className='inline-flex items-center px-3 py-1 border border-gray-300 dark:border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Pin
                </button>
              )}
              {!model.isInUse && !model.isPinned && (
                <button
                  onClick={() => onEvict(model.modelName)}
                  className='inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                >
                  Evict
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CacheDashboard() {
  const {
    cacheStatus,
    models,
    volumeHistory,
    loading,
    error,
    metrics,
    refreshData,
    pinModel,
    unpinModel,
    triggerOptimization,
    evictModel
  } = useCacheAnalytics()

  if (loading && !cacheStatus) {
    return (
      <div className='p-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-1/4 mb-6'></div>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3 mb-6'>
            {[1, 2, 3].map(i => (
              <div key={i} className='h-24 bg-gray-200 rounded'></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-6'>
        <div className='bg-red-50 border border-red-200 rounded-md p-4'>
          <div className='flex'>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800'>Error loading cache data</h3>
              <div className='mt-2 text-sm text-red-700'>
                <p>{error}</p>
              </div>
              <div className='mt-4'>
                <button
                  onClick={refreshData}
                  className='bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200'
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const volumeStats = cacheStatus?.volumeStats
  const isHighUsage = volumeStats && volumeStats.usagePercent >= CACHE_CONFIG.HIGH_WATER_MARK

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Model Cache Dashboard</h1>
        <div className='flex space-x-3'>
          <button
            onClick={refreshData}
            disabled={loading}
            className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50'
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={triggerOptimization}
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${
              isHighUsage ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isHighUsage ? 'Optimize Now' : 'Trigger Optimization'}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-4'>
        <CacheStatusCard
          title='Volume Usage'
          value={volumeStats ? `${volumeStats.usagePercent.toFixed(1)}%` : 'N/A'}
          subtitle={
            volumeStats
              ? `${(volumeStats.usedBytes / 1024 / 1024 / 1024).toFixed(1)} / ${(
                  volumeStats.totalBytes /
                  1024 /
                  1024 /
                  1024
                ).toFixed(1)} GB`
              : undefined
          }
          className={isHighUsage ? 'border-l-4 border-red-500' : ''}
        />
        <CacheStatusCard
          title='Total Models'
          value={cacheStatus?.modelCount || 0}
          subtitle={`${cacheStatus?.pinnedModels || 0} pinned, ${cacheStatus?.inUseModels || 0} in use`}
        />
        <CacheStatusCard title='Cache Efficiency' value={`${metrics.hitRatio.toFixed(1)}%`} subtitle='Hit ratio' />
        <CacheStatusCard
          title='Average Heat Score'
          value={metrics.averageHeatScore.toFixed(3)}
          subtitle='Model usage intensity'
        />
      </div>

      {/* Configuration Info */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4'>
        <h3 className='text-sm font-medium text-blue-800 dark:text-blue-200 mb-2'>Cache Configuration</h3>
        <div className='text-sm text-blue-700 dark:text-blue-300 grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div>High Water Mark: {CACHE_CONFIG.HIGH_WATER_MARK}%</div>
          <div>Low Water Mark: {CACHE_CONFIG.LOW_WATER_MARK}%</div>
          <div>Protection Window: {CACHE_CONFIG.PROTECTION_HOURS}h</div>
          <div>Min Heat Score: {CACHE_CONFIG.MIN_HEAT_SCORE}</div>
        </div>
      </div>

      {/* High Usage Warning */}
      {isHighUsage && (
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg className='h-5 w-5 text-red-400 dark:text-red-300' viewBox='0 0 20 20' fill='currentColor'>
                <path
                  fillRule='evenodd'
                  d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>High Volume Usage Detected</h3>
              <div className='mt-2 text-sm text-red-700 dark:text-red-300'>
                <p>
                  Volume usage ({volumeStats?.usagePercent.toFixed(1)}%) exceeds the high water mark (
                  {CACHE_CONFIG.HIGH_WATER_MARK}%). Consider running optimization to free up space.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Models List */}
      {models.length > 0 && <ModelList models={models} onPin={pinModel} onUnpin={unpinModel} onEvict={evictModel} />}

      {models.length === 0 && !loading && (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
            />
          </svg>
          <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-gray-100'>No models found</h3>
          <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
            No models are currently tracked in the cache system.
          </p>
        </div>
      )}

      {/* Metrics Summary */}
      {(metrics.totalEvictions > 0 || volumeHistory.length > 0) && (
        <div className='bg-white dark:bg-slate-800 shadow rounded-lg p-6 border dark:border-slate-700'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>Performance Metrics</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div>
              <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>Total Evictions</p>
              <p className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>{metrics.totalEvictions}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>Space Reclaimed</p>
              <p className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>
                {(metrics.totalReclaimed / 1024 / 1024 / 1024).toFixed(1)}GB
              </p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>Volume History</p>
              <p className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>{volumeHistory.length} points</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
