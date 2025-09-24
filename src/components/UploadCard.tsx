'use client'

import { UploadForm } from '@/components/UploadForm'
import { UploadResult } from '@/components/UploadResult'
import { useUploadCard } from '@/hooks'

/**
 * Upload Card Component
 *
 * Refactored to use hooks-based architecture for better separation of concerns.
 * Uses useUploadCard for state management and extracted components for UI.
 */
export default function UploadCard() {
  const upload = useUploadCard()

  return (
    <div className='rounded-2xl border border-default bg-card p-4'>
      <h2 className='text-lg font-semibold text-primary'>Upload to RunPod Volume</h2>

      <UploadForm
        file={upload.file}
        jobId={upload.jobId}
        uploading={upload.uploading}
        canUpload={upload.canUpload}
        onFileChange={upload.setFile}
        onJobIdChange={upload.setJobId}
        onSubmit={upload.uploadFile}
      />

      {/* Error Display */}
      {upload.error && (
        <div className='mt-3 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'>
          <div className='text-sm text-red-600 dark:text-red-300'>{upload.error}</div>
        </div>
      )}

      {/* Success Result */}
      {upload.result && <UploadResult result={upload.result} onClear={upload.clearResult} />}
    </div>
  )
}
