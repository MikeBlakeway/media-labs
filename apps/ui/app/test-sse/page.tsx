'use client'

import { useState } from 'react'
import { useJobSSE } from '../../hooks/useJobSSE'
import { VideoPlayer } from '../../components/VideoPlayer'
import { JobStatusDisplay } from '../../components/JobStatusDisplay'

export default function TestSSEPage() {
  const [jobId, setJobId] = useState<string>('')
  const { job, isConnected, error, isLoading, reconnect } = useJobSSE(jobId || null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Job ID will trigger the SSE hook
  }

  const showVideo = job?.status === 'COMPLETED' && job.outputUrl

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              SSE Hook Test Page
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Test real-time job updates via Server-Sent Events
            </p>
          </header>

          {/* Job ID Input */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Job ID
                </label>
                <input
                  type="text"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  placeholder="Enter job ID to track (e.g., cmf166v1p00028p8funrrlo37)"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Start Tracking
              </button>
            </div>
          </form>

          {/* Connection Status */}
          {jobId && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    SSE Connection: {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {!isConnected && (
                  <button
                    onClick={reconnect}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Reconnect
                  </button>
                )}
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Error: {error}
                </div>
              )}
            </div>
          )}

          {/* Job Status */}
          {job && (
            <JobStatusDisplay
              job={job}
              isConnected={isConnected}
              error={error}
              onReconnect={reconnect}
              className="mb-6"
            />
          )}

          {/* Video Player */}
          {showVideo && (
            <VideoPlayer
              videoUrl={job.outputUrl!}
              downloadUrl={job.downloadUrl}
              title={`Job ${job.id} - Generated Video`}
            />
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to test:
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Create a job using the API or the main FLF2V page</li>
              <li>2. Copy the job ID and paste it above</li>
              <li>3. Click "Start Tracking" to begin SSE connection</li>
              <li>4. Watch real-time updates as the job progresses</li>
              <li>5. See the video player appear when job completes</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}