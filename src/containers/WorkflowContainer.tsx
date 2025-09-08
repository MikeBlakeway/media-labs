/**
 * WorkflowContainer - Example Usage of Extracted Hooks
 *
 * This demonstrates how the new hooks can be used together to replace
 * the monolithic workflow component. This serves as a proof of concept
 * for the refactoring approach.
 */

'use client'

import { useParams } from 'next/navigation'
import {
  useWorkflowTemplate,
  useWorkflowForm,
  useJobManagement,
  useFileUpload,
  useWorkflowPreflight,
  useFieldLabeling
} from '@/hooks'
import { FormFieldsSection } from '@/components/FormFields'
import { JobStatusDisplay, JobActionButtons } from '@/components/JobStatus'
import { PreflightStatus } from '@/components/PreflightStatus'
import {
  processFormPatches,
  validateSubmissionPrerequisites,
  getSubmitButtonText,
  shouldDisableSubmit
} from '@/lib/workflow.utils'

export default function WorkflowContainer() {
  // Get slug from URL parameters (Next.js App Router pattern)
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // Use all the extracted hooks
  const template = useWorkflowTemplate(slug)
  const form = useWorkflowForm(template.meta)
  const job = useJobManagement()
  const upload = useFileUpload()
  const preflight = useWorkflowPreflight(slug)
  const labeling = useFieldLabeling(template.workflow)

  // Handle form submission with file uploads
  const handleSubmit = async () => {
    // Validate prerequisites
    const validation = validateSubmissionPrerequisites(Boolean(template.meta), preflight.allPresent, form.isValid)

    if (!validation.isValid) {
      alert(validation.errorMessage)
      return
    }

    // Validate form
    if (!form.validateForm()) {
      console.error('Form validation failed:', form.errors)
      return
    }

    // Get submission patches and process files
    const patches = form.getSubmissionPatches()
    const processedPatches = await processFormPatches(patches, upload.uploadFile)

    if (!processedPatches) {
      console.error('File processing failed')
      return
    }

    // Submit job
    await job.submitJob(slug, processedPatches)
  }

  // Loading state
  if (template.loading) {
    return (
      <div className='p-8'>
        <div className='flex items-center gap-2'>
          <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
          <span>Loading workflow template...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (template.error) {
    return (
      <div className='p-8'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <h3 className='font-medium text-red-800'>Failed to load workflow</h3>
          <p className='text-red-700 text-sm mt-1'>{template.error}</p>
        </div>
      </div>
    )
  }

  // No template loaded
  if (!template.meta || !template.workflow) {
    return (
      <div className='p-8'>
        <div className='text-gray-500'>No workflow template found</div>
      </div>
    )
  }

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>{template.meta.name}</h1>
        <p className='text-gray-600'>Workflow: {slug}</p>
      </div>

      {/* Preflight Status */}
      <PreflightStatus preflight={preflight} />

      {/* Form Fields */}
      <FormFieldsSection
        fields={template.meta.fields}
        formData={form.formData}
        errors={form.errors}
        onFieldChange={form.updateField}
        getEnhancedLabel={labeling.getEnhancedFieldLabel}
      />

      {/* Submit Button */}
      <div className='flex gap-4'>
        <button
          onClick={handleSubmit}
          disabled={shouldDisableSubmit(job.submitting, upload.uploading, preflight.allPresent, form.isValid)}
          className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {getSubmitButtonText(job.submitting, upload.uploading)}
        </button>

        <JobActionButtons job={job} />
      </div>

      {/* Job Status */}
      <JobStatusDisplay job={job} />
    </div>
  )
}
