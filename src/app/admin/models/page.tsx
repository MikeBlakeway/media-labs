/**
 * Model Administration Page
 * 
 * Provides controls for manual model warming and preloading management.
 * Shows comprehensive model queue status and analytics.
 */

'use client'

import { useState } from 'react'
import { ModelPreloadingProgress } from '@/components/ModelPreloadingProgress'
import { useModelPreloading } from '@/hooks/useModelPreloading'

type WarmingStrategy = 'popular_models' | 'recent_combinations' | 'all_templates'

type WarmingResult = {
  strategy?: string
  warmed?: number
  skipped?: number
  models?: string[]
  [k: string]: unknown
} | null

export default function ModelsAdminPage() {
  const [warmingStrategy, setWarmingStrategy] = useState<WarmingStrategy>('popular_models')
  const [maxModels, setMaxModels] = useState(10)
  const [priorityThreshold, setPriorityThreshold] = useState(0.3)
  const [warming, setWarming] = useState(false)
  const [warmingResult, setWarmingResult] = useState<WarmingResult>(null)
  
  const preloading = useModelPreloading()

  const handleStartWarming = async () => {
    try {
      setWarming(true)
      setWarmingResult(null)
      
      const response = await fetch('/api/models/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: warmingStrategy,
          maxModels,
          priorityThreshold
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start warming')
      }
      
      const result = await response.json()
      setWarmingResult(result)
      
      // Refresh status after warming starts
      await preloading.refreshStatus()
      
    } catch (error) {
      console.error('Warming failed:', error)
      alert('Failed to start model warming')
    } finally {
      setWarming(false)
    }
  }

  const handleCancelAll = async () => {
    if (!confirm('Cancel all preloading operations?')) return
    
    try {
      await preloading.cancelPreload()
      alert('All preloading operations cancelled')
    } catch (error) {
      console.error('Cancel failed:', error)
      alert('Failed to cancel preloading')
    }
  }

  return (
    <main className='mx-auto max-w-4xl p-6'>
      <header className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Model Administration</h1>
        <p className='mt-2 text-gray-600'>
          Manage model preloading, warming strategies, and queue status
        </p>
      </header>

      {/* Quick Actions */}
      <div className='mb-8 rounded-xl border p-6 bg-gradient-to-r from-blue-50 to-purple-50'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Quick Actions</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <button
            onClick={() => preloading.refreshStatus()}
            className='rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 transition-colors'
          >
            🔄 Refresh Status
          </button>
          
          <button
            onClick={handleCancelAll}
            disabled={preloading.activeDownloads === 0}
            className='rounded-lg bg-red-600 px-4 py-3 text-white hover:bg-red-700 disabled:opacity-50 transition-colors'
          >
            ⏹️ Cancel All Downloads
          </button>
        </div>
      </div>

      {/* Background Warming Controls */}
      <div className='mb-8 rounded-xl border p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Background Model Warming</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Warming Strategy
            </label>
            <select
              value={warmingStrategy}
              onChange={(e) => setWarmingStrategy(e.target.value as WarmingStrategy)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            >
              <option value='popular_models'>Popular Models</option>
              <option value='recent_combinations'>Recent Combinations</option>
              <option value='all_templates'>All Template Models</option>
            </select>
          </div>
          
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Max Models
            </label>
            <input
              type='number'
              min='1'
              max='50'
              value={maxModels}
              onChange={(e) => setMaxModels(parseInt(e.target.value))}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            />
          </div>
          
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Priority Threshold
            </label>
            <input
              type='range'
              min='0'
              max='1'
              step='0.1'
              value={priorityThreshold}
              onChange={(e) => setPriorityThreshold(parseFloat(e.target.value))}
              className='w-full'
            />
            <div className='text-xs text-gray-600 mt-1'>{priorityThreshold.toFixed(1)}</div>
          </div>
        </div>

        <button
          onClick={handleStartWarming}
          disabled={warming}
          className='rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors'
        >
          {warming ? '🔄 Starting Warming...' : '🔥 Start Background Warming'}
        </button>

        {warmingResult && (
          <div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <div className='font-medium text-green-800'>Warming Started Successfully</div>
            <div className='text-sm text-green-700 mt-1'>
              Strategy: {warmingResult.strategy} • 
              Models queued: {warmingResult.warmed} • 
              Skipped: {warmingResult.skipped}
            </div>
            {warmingResult.models && warmingResult.models.length > 0 && (
              <div className='text-xs text-green-600 mt-2'>
                Models: {warmingResult.models.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Queue Status */}
      <div className='mb-8'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Download Queue Status</h2>
        <ModelPreloadingProgress showActions={true} />
      </div>

      {/* Model Analytics (Placeholder) */}
      <div className='rounded-xl border p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Model Usage Analytics</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 text-center'>
          <div className='p-4 bg-blue-50 rounded-lg'>
            <div className='text-2xl font-bold text-blue-600'>15</div>
            <div className='text-sm text-blue-700'>Models Used This Week</div>
          </div>
          
          <div className='p-4 bg-green-50 rounded-lg'>
            <div className='text-2xl font-bold text-green-600'>8</div>
            <div className='text-sm text-green-700'>Successful Workflows</div>
          </div>
          
          <div className='p-4 bg-purple-50 rounded-lg'>
            <div className='text-2xl font-bold text-purple-600'>3.2GB</div>
            <div className='text-sm text-purple-700'>Data Transferred</div>
          </div>
        </div>

        <div className='mt-6'>
          <h3 className='font-medium text-gray-900 mb-3'>Most Popular Models</h3>
          <div className='space-y-2'>
            {[
              { name: 'flux1-dev.safetensors', uses: 12, type: 'checkpoints' },
              { name: 'clip_l.safetensors', uses: 10, type: 'clip' },
              { name: 'ae.safetensors', uses: 8, type: 'vae' },
              { name: 't5xxl_fp16.safetensors', uses: 7, type: 'unet' }
            ].map((model) => (
              <div key={model.name} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                <div>
                  <div className='font-mono text-sm'>{model.name}</div>
                  <div className='text-xs text-gray-600 capitalize'>{model.type}</div>
                </div>
                <div className='text-sm font-medium text-gray-900'>
                  {model.uses} uses
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {preloading.error && (
        <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
          <div className='font-medium text-red-800'>Error</div>
          <div className='text-sm text-red-700 mt-1'>{preloading.error}</div>
        </div>
      )}
    </main>
  )
}