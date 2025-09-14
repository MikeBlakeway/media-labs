/**
 * Demo Page for Model Preloading Features
 *
 * Showcases the preloading components and functionality
 */

'use client'

import { useState } from 'react'
import { ModelPreloadingProgress } from '@/components/ModelPreloadingProgress'
import { useModelPreloading } from '@/hooks/useModelPreloading'

export default function PreloadingDemoPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState('text-to-image')
  const [b2TestResults, setB2TestResults] = useState<{
    preflightTest?: Record<string, unknown>
    cacheTest?: Record<string, unknown>
    progressTest?: Record<string, unknown>
    volumeStats?: Record<string, unknown>
    loading: boolean
    error?: string
  }>({ loading: false })

  const preloading = useModelPreloading(selectedWorkflow)

  const workflows = [
    { slug: 'text-to-image', name: 'Text to Image (FLUX)' },
    { slug: 'wan2-1-flf2v', name: 'WAN 2.1 FLF2V' }
  ]

  const demoModels = [
    { modelName: 'flux1-dev.safetensors', modelType: 'checkpoints' as const, priority: 0.9 },
    { modelName: 'clip_l.safetensors', modelType: 'clip' as const, priority: 0.8 },
    { modelName: 'ae.safetensors', modelType: 'vae' as const, priority: 0.7 }
  ]

  // Test B2 Integration
  const testB2Integration = async () => {
    setB2TestResults({ loading: true })
    try {
      // Test preflight detection
      console.log('Testing B2 preflight detection...')
      const preflightResponse = await fetch('/api/workflows/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowSlug: selectedWorkflow })
      })
      const preflightData = await preflightResponse.json()

      // Test cache endpoint for a model that might be in B2
      console.log('Testing B2 cache endpoint...')
      const cacheResponse = await fetch('/api/models/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: [
            {
              modelName: 'flux1-dev.safetensors',
              modelType: 'checkpoints',
              priority: 0.9
            }
          ],
          useEnhancedMode: true // Test performance optimization
        })
      })
      const cacheData = await cacheResponse.json()

      // Test cold start progress endpoint
      console.log('Testing cold start progress...')
      const progressResponse = await fetch('/api/cold-start/progress')
      const progressData = await progressResponse.json()

      // Test volume management endpoint
      console.log('Testing volume management...')
      const volumeResponse = await fetch('/api/volume/management')
      const volumeData = await volumeResponse.json()

      setB2TestResults({
        loading: false,
        preflightTest: preflightData,
        cacheTest: cacheData,
        progressTest: progressData,
        volumeStats: volumeData
      })
    } catch (error) {
      setB2TestResults({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return (
    <main className='mx-auto max-w-4xl p-6'>
      <header className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Model Preloading Demo</h1>
        <p className='mt-2 text-gray-600'>Demonstration of intelligent model preloading features</p>
      </header>

      {/* Workflow Selection */}
      <div className='mb-8 rounded-xl border p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Select Workflow</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {workflows.map(workflow => (
            <button
              key={workflow.slug}
              onClick={() => setSelectedWorkflow(workflow.slug)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedWorkflow === workflow.slug
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className='font-medium'>{workflow.name}</div>
              <div className='text-sm text-gray-600'>{workflow.slug}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow-Specific Preloading Status */}
      <div className='mb-8'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Workflow Preloading Status: {selectedWorkflow}</h2>
        <ModelPreloadingProgress workflowSlug={selectedWorkflow} showActions={true} />
      </div>

      {/* B2 Integration Testing */}
      <div className='mb-8 rounded-xl border p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>B2 Integration Testing</h2>

        <div className='mb-4'>
          <button
            onClick={testB2Integration}
            disabled={b2TestResults.loading}
            className='rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:opacity-50 transition-colors'
          >
            {b2TestResults.loading ? '🔄 Testing...' : '🧪 Test B2 Integration'}
          </button>
        </div>

        {b2TestResults.preflightTest && (
          <div className='mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
            <h3 className='font-medium text-blue-800 mb-2'>Preflight Test Results</h3>
            <pre className='text-sm text-blue-700 overflow-x-auto'>
              {JSON.stringify(b2TestResults.preflightTest, null, 2)}
            </pre>
          </div>
        )}

        {b2TestResults.cacheTest && (
          <div className='mb-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <h3 className='font-medium text-green-800 mb-2'>Cache API Test Results</h3>
            <pre className='text-sm text-green-700 overflow-x-auto'>
              {JSON.stringify(b2TestResults.cacheTest, null, 2)}
            </pre>
          </div>
        )}

        {b2TestResults.progressTest && (
          <div className='mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg'>
            <h3 className='font-medium text-orange-800 mb-2'>Cold Start Progress Test Results</h3>
            <pre className='text-sm text-orange-700 overflow-x-auto'>
              {JSON.stringify(b2TestResults.progressTest, null, 2)}
            </pre>
          </div>
        )}

        {b2TestResults.volumeStats && (
          <div className='mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg'>
            <h3 className='font-medium text-purple-800 mb-2'>Volume Management Test Results</h3>
            <pre className='text-sm text-purple-700 overflow-x-auto'>
              {JSON.stringify(b2TestResults.volumeStats, null, 2)}
            </pre>
          </div>
        )}

        {b2TestResults.error && (
          <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
            <h3 className='font-medium text-red-800 mb-2'>Test Error</h3>
            <div className='text-sm text-red-700'>{b2TestResults.error}</div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='mb-8 rounded-xl border p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Manual Actions</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <button
            onClick={() => preloading.preloadWorkflow(selectedWorkflow)}
            disabled={preloading.loading}
            className='rounded-lg bg-purple-600 px-4 py-3 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors'
          >
            {preloading.loading ? '🔄 Starting...' : '🚀 Preload Workflow'}
          </button>

          <button
            onClick={() => preloading.preloadModels(demoModels)}
            disabled={preloading.loading}
            className='rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {preloading.loading ? '🔄 Starting...' : '📦 Preload Demo Models'}
          </button>

          <button
            onClick={() => preloading.refreshStatus()}
            className='rounded-lg bg-gray-600 px-4 py-3 text-white hover:bg-gray-700 transition-colors'
          >
            🔄 Refresh Status
          </button>
        </div>
      </div>

      {/* General Queue Status */}
      <div className='mb-8'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Global Queue Status</h2>
        <ModelPreloadingProgress showActions={true} />
      </div>

      {/* Compact Display Examples */}
      <div className='mb-8 rounded-xl border p-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Compact Display Examples</h2>

        <div className='space-y-4'>
          <div>
            <h3 className='font-medium mb-2'>Workflow-specific compact:</h3>
            <ModelPreloadingProgress workflowSlug={selectedWorkflow} compact={true} showActions={false} />
          </div>

          <div>
            <h3 className='font-medium mb-2'>Global queue compact:</h3>
            <ModelPreloadingProgress compact={true} showActions={false} />
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div className='rounded-xl border p-6 bg-gray-50'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Current Status</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div>
            <strong>Workflow Ready:</strong> {preloading.isWorkflowReady ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Active Downloads:</strong> {preloading.activeDownloads}
          </div>
          <div>
            <strong>Queued Downloads:</strong> {preloading.queuedDownloads}
          </div>
          <div>
            <strong>Overall Progress:</strong> {Math.round(preloading.overallProgress * 100)}%
          </div>
          {preloading.workflowReadyTime && (
            <div className='md:col-span-2'>
              <strong>Estimated Ready Time:</strong> {new Date(preloading.workflowReadyTime).toLocaleTimeString()}
            </div>
          )}
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
