'use client'

import Image from 'next/image'
import { useState } from 'react'
import { JobStatusDisplay } from '@/components/JobStatus'
import { formatDuration } from '@/lib/workflow.utils'

type Mode = 'auto' | 'sync' | 'async'

interface OutputImage {
  filename: string
  type: 'base64' | 's3_url'
  data: string
}

// Custom job state for this component (simpler than main workflow system)
interface CustomJobState {
  jobId: string
  status: string
  jobResults: unknown | null
  jobError: string
  submitting: boolean
  jobStartTime: number | undefined
  pollAttempts: number
}

export default function WorkflowRunner() {
  // Form state for workflow configuration
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(null)
  const [nodeId, setNodeId] = useState('') // e.g. '12'
  const [inputKey, setInputKey] = useState('path') // e.g. 'path' | 'image_path' | 'url_or_path'
  const [workerPath, setWorkerPath] = useState('') // paste from Upload step
  const [mode, setMode] = useState<Mode>('auto')

  // Custom job state (this component has different needs than main workflow system)
  const [jobState, setJobState] = useState<CustomJobState>({
    jobId: '',
    status: 'idle',
    jobResults: null,
    jobError: '',
    submitting: false,
    jobStartTime: undefined,
    pollAttempts: 0
  })

  // Validation state
  const isValid = Boolean(workflow && nodeId && inputKey && workerPath)
  const canCancel = jobState.jobId && (jobState.status === 'queued' || jobState.status === 'running')

  // Handle workflow file upload
  const onWorkflowFile = async (f: File) => {
    try {
      const text = await f.text()
      setWorkflow(JSON.parse(text))
    } catch (error) {
      console.error('Failed to parse workflow JSON:', error)
      alert('Invalid JSON file. Please upload a valid ComfyUI workflow.')
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!isValid) {
      alert('Please fill in all required fields and upload a workflow.')
      return
    }

    if (!workflow) return

    // Reset state for new submission
    setJobState(prev => ({
      ...prev,
      status: 'submitting',
      jobResults: null,
      jobError: '',
      jobId: '',
      submitting: true,
      jobStartTime: Date.now(),
      pollAttempts: 0
    }))

    try {
      const body = {
        workflow,
        patches: [{ nodeId, inputKey, value: workerPath }],
        mode
      }

      const res = await fetch('/api/workflows/patch-run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${data?.error || 'Unknown error'}`)
      }

      // Handle sync completion
      if (data?.status === 'COMPLETED' && data?.output) {
        setJobState(prev => ({
          ...prev,
          status: 'completed',
          jobResults: data.output,
          submitting: false
        }))
        return
      }

      // Handle async jobs - start polling
      if (data?.id) {
        setJobState(prev => ({
          ...prev,
          status: 'queued',
          jobId: data.id,
          submitting: false
        }))

        // Start polling
        startPolling(data.id)
        return
      }

      // Handle unexpected responses
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`)
    } catch (error) {
      console.error('Workflow submission failed:', error)
      setJobState(prev => ({
        ...prev,
        status: 'error',
        jobError: error instanceof Error ? error.message : 'Submission failed',
        submitting: false
      }))
    }
  }

  // Polling logic (simplified version of our hook's polling)
  const startPolling = async (jobId: string) => {
    const poll = async (): Promise<void> => {
      try {
        setJobState(prev => ({ ...prev, pollAttempts: prev.pollAttempts + 1 }))

        const sRes = await fetch(`/api/runpod/status/${jobId}`)
        if (!sRes.ok) {
          throw new Error(`Status API failed: ${sRes.status}`)
        }

        const statusData = await sRes.json()

        if (statusData.status === 'COMPLETED') {
          setJobState(prev => ({
            ...prev,
            status: 'completed',
            jobResults: statusData.output || null,
            jobError: ''
          }))
        } else if (statusData.status === 'FAILED') {
          setJobState(prev => ({
            ...prev,
            status: 'failed',
            jobError: 'Workflow execution failed'
          }))
        } else if (statusData.status === 'CANCELLED') {
          setJobState(prev => ({
            ...prev,
            status: 'cancelled',
            jobError: 'Workflow was cancelled'
          }))
        } else if (statusData.status === 'TIMED_OUT') {
          setJobState(prev => ({
            ...prev,
            status: 'timed-out',
            jobError: 'Workflow timed out'
          }))
        } else {
          // Continue polling for non-terminal states
          setJobState(prev => ({ ...prev, status: statusData.status || 'running' }))
          setTimeout(() => poll(), 2000)
        }
      } catch (error) {
        console.error('Polling error:', error)
        setJobState(prev => ({
          ...prev,
          status: 'error',
          jobError: error instanceof Error ? error.message : 'Polling failed'
        }))
      }
    }

    await poll()
  }

  // Cancel job
  const cancelJob = async () => {
    if (!jobState.jobId) return

    try {
      const response = await fetch(`/api/runpod/cancel/${jobState.jobId}`, {
        method: 'POST'
      })

      if (response.ok) {
        setJobState(prev => ({
          ...prev,
          status: 'cancelled',
          jobError: 'Job cancelled by user'
        }))
      }
    } catch (error) {
      console.error('Cancel job error:', error)
    }
  }

  // Force check status
  const forceCheckStatus = async () => {
    if (!jobState.jobId) return

    try {
      const sRes = await fetch(`/api/runpod/status/${jobState.jobId}`)
      if (!sRes.ok) throw new Error(`Status check failed: ${sRes.status}`)

      const statusData = await sRes.json()
      setJobState(prev => ({ ...prev, status: statusData.status || 'unknown' }))
    } catch (error) {
      console.error('Force check error:', error)
    }
  }

  // Extract images from job results
  const images: OutputImage[] | null =
    jobState.jobResults &&
    typeof jobState.jobResults === 'object' &&
    jobState.jobResults !== null &&
    'images' in jobState.jobResults
      ? (jobState.jobResults.images as OutputImage[])
      : null

  // Create a job object compatible with JobStatusDisplay
  const jobForDisplay = {
    ...jobState,
    submitJob: handleSubmit,
    cancelJob,
    forceCheckStatus,
    resetJob: () =>
      setJobState({
        jobId: '',
        status: 'idle',
        jobResults: null,
        jobError: '',
        submitting: false,
        jobStartTime: undefined,
        pollAttempts: 0
      }),
    isTerminal: ['completed', 'failed', 'cancelled', 'timed-out', 'error'].includes(jobState.status),
    isSuccess: jobState.status === 'completed',
    duration: jobState.jobStartTime ? Date.now() - jobState.jobStartTime : undefined
  }

  return (
    <div className='rounded-2xl border p-4'>
      <h2 className='text-lg font-semibold'>Run ComfyUI Workflow</h2>

      <div className='mt-3 grid gap-3'>
        <label className='block text-sm'>
          Workflow JSON
          <input
            type='file'
            accept='application/json'
            className='mt-1 block'
            onChange={e => e.target.files?.[0] && onWorkflowFile(e.target.files[0])}
          />
          {workflow && <div className='text-xs text-green-600 mt-1'>✓ Workflow loaded</div>}
        </label>

        <label className='block text-sm'>
          Loader node id (e.g., 12)
          <input
            value={nodeId}
            onChange={e => setNodeId(e.target.value)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
            placeholder='12'
          />
        </label>

        <label className='block text-sm'>
          Loader input key (e.g., path, image_path, url_or_path)
          <input
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
            placeholder='path'
          />
        </label>

        <label className='block text-sm'>
          workerPath (paste from upload)
          <input
            value={workerPath}
            onChange={e => setWorkerPath(e.target.value)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
            placeholder='/runpod-volume/inputs/<jobId>/<file>'
          />
        </label>

        <label className='block text-sm'>
          Mode
          <select
            value={mode}
            onChange={e => setMode(e.target.value as Mode)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          >
            <option value='auto'>auto</option>
            <option value='sync'>sync</option>
            <option value='async'>async</option>
          </select>
        </label>

        <div className='flex gap-2'>
          <button
            onClick={handleSubmit}
            disabled={!isValid || jobState.submitting || jobState.status === 'queued' || jobState.status === 'running'}
            className='rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50'
          >
            {jobState.submitting ? 'Running...' : 'Run'}
          </button>

          {canCancel && (
            <button
              onClick={cancelJob}
              className='rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700'
              title='Cancel running job'
            >
              Cancel
            </button>
          )}

          {jobState.jobId && (
            <button
              onClick={forceCheckStatus}
              className='rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
              title='Force check job status'
            >
              🔍 Check
            </button>
          )}
        </div>

        {/* Enhanced Job Status Display using our component */}
        <JobStatusDisplay job={jobForDisplay} />
      </div>

      {/* Display workflow results */}
      {images && images.length > 0 && (
        <div className='mt-4 space-y-3'>
          <h3 className='font-medium'>Results</h3>
          {images.map((im, i) => (
            <div key={i} className='rounded-xl border p-3'>
              <div className='text-xs opacity-70 mb-1'>{im.filename}</div>
              {im.type === 'base64' ? (
                <Image
                  alt='result'
                  src={`data:image/png;base64,${im.data}`}
                  className='max-w-full rounded'
                  width={512}
                  height={512}
                />
              ) : (
                <a className='underline' target='_blank' rel='noopener noreferrer' href={im.data}>
                  Open result
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Display timing info if available */}
      {jobState.jobStartTime && jobForDisplay.duration && (
        <div className='mt-2 text-xs text-gray-500'>Duration: {formatDuration(jobForDisplay.duration)}</div>
      )}
    </div>
  )
}
