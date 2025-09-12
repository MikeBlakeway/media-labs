'use client'

import { useState } from 'react'
import { useVolumeOperations, type ManifestEntry } from '@/hooks/useVolumeOperations'

// Example manifest for stable diffusion models
const EXAMPLE_MANIFEST: ManifestEntry[] = [
  {
    repo: 'runwayml/stable-diffusion-v1-5',
    remote: 'v1-5-pruned.safetensors',
    destDir: '/runpod-volume/models/checkpoints',
    filename: 'sd-v1-5.safetensors'
  },
  {
    repo: 'stabilityai/sd-vae-ft-mse',
    remote: 'diffusion_pytorch_model.safetensors',
    destDir: '/runpod-volume/models/vae',
    filename: 'vae-ft-mse.safetensors'
  }
]

export function VolumeManager() {
  const { isLoading, error, ping, seedModels, verifyModels, listDirectory, getDiskUsage } = useVolumeOperations()

  const [results, setResults] = useState<string>('')
  const [manifest, setManifest] = useState<ManifestEntry[]>(EXAMPLE_MANIFEST)

  const handlePing = async () => {
    try {
      const result = await ping()
      setResults(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('Ping failed:', err)
    }
  }

  const handleVerify = async () => {
    try {
      const result = await verifyModels(manifest)
      setResults(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('Verify failed:', err)
    }
  }

  const handleSeedDryRun = async () => {
    try {
      const result = await seedModels(manifest, true)
      setResults(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('Seed dry run failed:', err)
    }
  }

  const handleSeed = async () => {
    try {
      const result = await seedModels(manifest, false)
      setResults(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('Seed failed:', err)
    }
  }

  const handleList = async () => {
    try {
      const result = await listDirectory('/runpod-volume/models', { recursive: true })
      setResults(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('List failed:', err)
    }
  }

  const handleDiskUsage = async () => {
    try {
      const result = await getDiskUsage(['/runpod-volume'])
      setResults(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('Disk usage failed:', err)
    }
  }

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      <div className='bg-white rounded-lg shadow-md p-6'>
        <h1 className='text-2xl font-bold mb-4'>RunPod Volume Manager</h1>

        {error && (
          <div className='bg-red-50 border border-red-200 rounded-md p-4 mb-4'>
            <p className='text-red-700'>{error}</p>
          </div>
        )}

        <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-6'>
          <button
            onClick={handlePing}
            disabled={isLoading}
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50'
          >
            Ping
          </button>

          <button
            onClick={handleVerify}
            disabled={isLoading}
            className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50'
          >
            Verify Models
          </button>

          <button
            onClick={handleSeedDryRun}
            disabled={isLoading}
            className='px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50'
          >
            Seed (Dry Run)
          </button>

          <button
            onClick={handleSeed}
            disabled={isLoading}
            className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50'
          >
            Seed Models
          </button>

          <button
            onClick={handleList}
            disabled={isLoading}
            className='px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50'
          >
            List Files
          </button>

          <button
            onClick={handleDiskUsage}
            disabled={isLoading}
            className='px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50'
          >
            Disk Usage
          </button>
        </div>

        <div className='mb-4'>
          <h3 className='text-lg font-semibold mb-2'>Model Manifest</h3>
          <textarea
            value={JSON.stringify(manifest, null, 2)}
            onChange={e => {
              try {
                setManifest(JSON.parse(e.target.value))
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className='w-full h-40 p-3 border border-gray-300 rounded-md font-mono text-sm'
          />
        </div>

        <div>
          <h3 className='text-lg font-semibold mb-2'>Results</h3>
          <pre className='bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm'>
            {isLoading ? 'Loading...' : results || 'No results yet'}
          </pre>
        </div>
      </div>
    </div>
  )
}
