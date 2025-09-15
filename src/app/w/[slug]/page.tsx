'use client'

import { use } from 'react'
import { WorkflowResults } from '@/components/WorkflowResults'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { ResultHistory } from '@/components/ResultHistory'
import { ModelPreloadingProgress } from '@/components/ModelPreloadingProgress'

// Import our extracted hooks and components
import { useWorkflowTemplate } from '@/hooks/useWorkflowTemplate'
import { useWorkflowForm } from '@/hooks/useWorkflowForm'
import { useJobManagement } from '@/hooks/useJobManagement'
import { useWorkflowPreflight } from '@/hooks/useWorkflowPreflight'
import { useFieldLabeling } from '@/hooks/useFieldLabeling'
import { useFileUpload } from '@/hooks/useFileUpload'
import { FormField } from '@/components/FormFields'
import { JobStatusDisplay } from '@/components/JobStatus'
import { PreflightStatus } from '@/components/PreflightStatus'
import { processFormPatches } from '@/lib/workflow.utils'

interface WorkflowPageProps {
  params: Promise<{ slug: string }>
}

export default function WorkflowPage({ params }: WorkflowPageProps) {
  const { slug } = use(params)

  // Load template and workflow data
  const { meta, workflow, loading, error } = useWorkflowTemplate(slug)

  // Manage form state
  const { formData, updateField, validateForm, isValid } = useWorkflowForm(meta)

  // Handle job execution and polling
  const {
    jobId,
    status,
    jobResults,
    jobError,
    submitting,
    jobStartTime,
    pollAttempts,
    submitJob,
    cancelJob,
    forceCheckStatus,
    isTerminal
  } = useJobManagement()

  // Handle model preflight checks
  const {
    preflightBusy,
    preflightErr,
    preflight,
    missing,
    allPresent,
    runPreflight,
    startPreloading,
    canStartPreloading,
    copyCommands
  } = useWorkflowPreflight(slug)

  // Handle file uploads
  const { uploadFile } = useFileUpload()

  // Handle enhanced field labeling
  const { getEnhancedFieldLabel } = useFieldLabeling(workflow)

  // Check if job can be cancelled
  const canCancelJob = jobId && (status === 'queued' || status === 'running')

  // Handle form submission with full workflow
  const handleSubmit = async () => {
    // If models are not ready but preloading is available, suggest preloading
    if (!allPresent && canStartPreloading) {
      const proceed = confirm(
        'Some required models are missing. Would you like to start preloading them now? ' +
          'This will download models in the background to speed up future runs.'
      )
      if (proceed) {
        await startPreloading()
        return
      }
    }

    if (!meta || !allPresent) {
      alert('Required models are missing. Please upload them and click Recheck or start preloading.')
      return
    }

    if (!validateForm()) {
      alert('Please fill in all required fields.')
      return
    }

    try {
      // Create form patches from form data
      const formPatches = meta.fields.map(field => ({
        nodeId: field.nodeId,
        inputKey: field.inputKey,
        value: formData[field.id] ?? null
      }))

      // Process form data into patches, handling file uploads
      const patches = await processFormPatches(formPatches, uploadFile)

      if (!patches) {
        alert('File upload failed. Please try again.')
        return
      }

      // Submit the job
      await submitJob(slug, patches)
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }

  // Handle result selection from history
  const handleSelectResult = (result: { jobId: string; output: unknown }) => {
    console.log('Selected previous result:', result)
    // Optional: populate form with previous settings
  }

  // Loading and error states
  if (loading) {
    return (
      <main className='p-6'>
        <div className='text-center'>Loading workflow template...</div>
      </main>
    )
  }

  if (!meta) {
    return <main className='p-6 text-red-600'>{error || 'Template not found'}</main>
  }

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <header>
        <h1 className='text-2xl font-semibold'>{meta.name || slug}</h1>
        <p className='mt-2 text-sm opacity-70'>Fill the fields and run the workflow</p>
      </header>

      {/* Model Preloading Status */}
      <ModelPreloadingProgress workflowSlug={slug} showActions={true} />

      {/* Preflight Status Banner */}
      <PreflightStatus
        preflight={{
          preflightBusy,
          preflightErr,
          preflight,
          missing,
          allPresent,
          runPreflight,
          startPreloading,
          canStartPreloading,
          copyCommands,
          buildS3CpCommands: () => ''
        }}
      />

      {/* Dynamic Form Fields */}
      <div className='mt-6 space-y-4'>
        {meta.fields.map(field => (
          <div key={field.id} className='rounded-xl border p-3'>
            <FormField
              field={field}
              value={formData[field.id] ?? ''}
              onChange={value => updateField(field.id, value)}
              enhancedLabel={getEnhancedFieldLabel(field, meta.fields)}
            />
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className='mt-4 flex flex-wrap items-center gap-2'>
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting || status === 'queued' || status === 'running'}
          className='rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50'
          title={
            allPresent
              ? 'Run workflow'
              : 'Models may be missing - check status above'
          }
        >
          {submitting ? 'Submitting...' : allPresent ? 'Run' : canStartPreloading ? 'Preload & Run' : 'Run'}
        </button>

        {canCancelJob && (
          <button
            onClick={cancelJob}
            className='rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700'
            title='Cancel running job'
          >
            Cancel
          </button>
        )}

        {jobId && (
          <button
            onClick={forceCheckStatus}
            className='rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
            title='Force check job status'
          >
            🔍 Check Status
          </button>
        )}

        <JobStatusDisplay
          job={{
            jobId,
            status,
            jobResults,
            jobError,
            submitting,
            jobStartTime,
            pollAttempts,
            submitJob,
            cancelJob,
            forceCheckStatus,
            resetJob: () => {},
            isTerminal,
            isSuccess: status === 'completed',
            duration: jobStartTime ? Date.now() - jobStartTime : undefined
          }}
        />
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator status={status} jobId={jobId} startTime={jobStartTime} attempts={pollAttempts} />

      {/* Workflow Results */}
      <WorkflowResults
        output={
          jobResults as { images?: { base64?: string; url?: string; filename?: string }[]; errors?: string[] } | null
        }
        status={status}
        error={jobError || error}
        workflowMeta={meta}
      />

      {/* Result History */}
      <ResultHistory currentSlug={slug} onSelectResult={handleSelectResult} />
    </main>
  )
}
