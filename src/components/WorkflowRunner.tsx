'use client'

import { useState } from 'react'
import { JobStatusDisplay } from '@/components/JobStatus'
import { WorkflowRunnerForm } from '@/components/WorkflowRunnerForm'
import { WorkflowRunnerResults } from '@/components/WorkflowRunnerResults'
import { useWorkflowRunner, useWorkflowRunnerJob } from '@/hooks'

/**
 * Workflow Runner Component
 *
 * Refactored to use hooks-based architecture for better separation of concerns.
 * Uses useWorkflowRunner for form state and useWorkflowRunnerJob for job management.
 */
export default function WorkflowRunner() {
  const [error, setError] = useState<string>('')

  // Form state and workflow management
  const runner = useWorkflowRunner()

  // Job management
  const job = useWorkflowRunnerJob()

  // Handle workflow file upload with error handling
  const handleWorkflowFile = async (file: File) => {
    try {
      setError('')
      await runner.handleWorkflowFile(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workflow file'
      setError(message)
      alert(message)
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!runner.isValid) {
      alert('Please fill in all required fields and upload a workflow.')
      return
    }

    if (!runner.workflow) return

    setError('')
    await job.submitWorkflow(runner.workflow, runner.patches, runner.mode)
  }

  // Create a job object compatible with JobStatusDisplay
  const jobForDisplay = {
    jobId: job.jobId,
    status: job.status,
    jobResults: job.jobResults,
    jobError: job.jobError,
    submitting: job.submitting,
    jobStartTime: job.jobStartTime,
    pollAttempts: job.pollAttempts,
    submitJob: handleSubmit,
    cancelJob: job.cancelJob,
    forceCheckStatus: job.forceCheckStatus,
    resetJob: () => {
      job.resetJob()
      setError('')
    },
    isTerminal: job.isTerminal,
    isSuccess: job.isSuccess,
    duration: job.duration
  }

  const isFormDisabled = job.submitting || job.status === 'queued' || job.status === 'running'

  return (
    <div className='rounded-2xl border p-4'>
      <h2 className='text-lg font-semibold'>Run ComfyUI Workflow</h2>

      <div className='mt-3 grid gap-3'>
        {/* Workflow Configuration Form */}
        <WorkflowRunnerForm
          workflow={runner.workflow}
          nodeId={runner.nodeId}
          inputKey={runner.inputKey}
          workerPath={runner.workerPath}
          mode={runner.mode}
          setNodeId={runner.setNodeId}
          setInputKey={runner.setInputKey}
          setWorkerPath={runner.setWorkerPath}
          setMode={runner.setMode}
          onWorkflowFile={handleWorkflowFile}
          disabled={isFormDisabled}
        />

        {/* Error Display */}
        {error && (
          <div className='p-3 rounded-xl bg-red-50 border border-red-200'>
            <div className='text-sm text-red-600'>{error}</div>
          </div>
        )}

        {/* Submit and Control Buttons */}
        <div className='flex gap-2'>
          <button
            onClick={handleSubmit}
            disabled={!runner.isValid || isFormDisabled}
            className='rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50'
          >
            {job.submitting ? 'Running...' : 'Run'}
          </button>

          {job.canCancel && (
            <button
              onClick={job.cancelJob}
              className='rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700'
              title='Cancel running job'
            >
              Cancel
            </button>
          )}

          {job.jobId && (
            <button
              onClick={job.forceCheckStatus}
              className='rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
              title='Force check job status'
            >
              🔍 Check
            </button>
          )}
        </div>

        {/* Enhanced Job Status Display */}
        <JobStatusDisplay job={jobForDisplay} />
      </div>

      {/* Display workflow results */}
      <WorkflowRunnerResults jobResults={job.jobResults} duration={job.duration} />
    </div>
  )
}
