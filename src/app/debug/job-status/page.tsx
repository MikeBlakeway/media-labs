'use client'

import { useState } from 'react'

export default function JobStatusDebugPage() {
  const [jobId, setJobId] = useState('')
  const [result, setResult] = useState<{
    timestamp: string
    jobId: string
    responseTimeMs: number
    status: {
      id: string
      status: string
      output?: {
        images?: Array<{ filename: string; type: string; data: string }>
        errors?: string[]
      }
      delayTime?: number
      executionTime?: number
    }
    statusMapping: {
      current: string
      isComplete: boolean
      canCancel: boolean
      isSuccessful: boolean
      isFailed: boolean
    }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const checkStatus = async () => {
    if (!jobId.trim()) {
      setError('Please enter a job ID')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`/api/debug/job-status/${jobId.trim()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const autoRefresh = async () => {
    if (!jobId.trim()) return

    await checkStatus()

    // Auto-refresh every 2 seconds if job is not complete
    if (result?.statusMapping?.isComplete === false) {
      setTimeout(autoRefresh, 2000)
    }
  }

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>🔍 Job Status Debug Tool</h1>

      <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Check Job Status</h2>

        <div className='flex gap-3 mb-4'>
          <input
            type='text'
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            placeholder='Enter job ID (e.g., abc123-def456-ghi789)'
            className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button
            onClick={checkStatus}
            disabled={loading}
            className='px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50'
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
          <button
            onClick={autoRefresh}
            disabled={loading || !jobId.trim()}
            className='px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50'
          >
            Auto Refresh
          </button>
        </div>

        <p className='text-sm text-gray-600'>
          💡 Tip: You can find the job ID in your workflow page URL or in the browser console logs
        </p>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
          <h3 className='text-red-800 font-medium'>❌ Error</h3>
          <p className='text-red-700'>{error}</p>
        </div>
      )}

      {result && (
        <div className='bg-gray-50 rounded-lg p-6'>
          <h3 className='text-lg font-semibold mb-4'>📊 Status Result</h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
            <div className='bg-white p-4 rounded-lg'>
              <h4 className='font-medium text-gray-700 mb-2'>Job Info</h4>
              <p>
                <strong>Job ID:</strong> {result.jobId}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span
                  className={`font-medium ${
                    result.statusMapping.isSuccessful
                      ? 'text-green-600'
                      : result.statusMapping.isFailed
                      ? 'text-red-600'
                      : result.statusMapping.isComplete
                      ? 'text-gray-600'
                      : 'text-blue-600'
                  }`}
                >
                  {result.status.status}
                </span>
              </p>
              <p>
                <strong>Complete:</strong> {result.statusMapping.isComplete ? '✅ Yes' : '⏳ No'}
              </p>
              <p>
                <strong>Can Cancel:</strong> {result.statusMapping.canCancel ? '🚫 Yes' : '❌ No'}
              </p>
            </div>

            <div className='bg-white p-4 rounded-lg'>
              <h4 className='font-medium text-gray-700 mb-2'>Timing</h4>
              <p>
                <strong>Check Time:</strong> {new Date(result.timestamp).toLocaleTimeString()}
              </p>
              <p>
                <strong>Response Time:</strong> {result.responseTimeMs}ms
              </p>
              {result.status.delayTime !== undefined && (
                <p>
                  <strong>Delay Time:</strong> {result.status.delayTime}ms
                </p>
              )}
              {result.status.executionTime !== undefined && (
                <p>
                  <strong>Execution Time:</strong> {result.status.executionTime}ms
                </p>
              )}
            </div>
          </div>

          {result.status.output && (
            <div className='bg-white p-4 rounded-lg mb-4'>
              <h4 className='font-medium text-gray-700 mb-2'>Output</h4>
              {result.status.output.images && (
                <p>
                  <strong>Images:</strong> {result.status.output.images.length} found
                </p>
              )}
              {result.status.output.errors && result.status.output.errors.length > 0 && (
                <div>
                  <p className='text-red-600'>
                    <strong>Errors:</strong>
                  </p>
                  <ul className='list-disc list-inside text-red-600 text-sm'>
                    {result.status.output.errors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <details className='bg-white p-4 rounded-lg'>
            <summary className='cursor-pointer font-medium text-gray-700'>🔍 Raw Response Data</summary>
            <pre className='mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto'>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
