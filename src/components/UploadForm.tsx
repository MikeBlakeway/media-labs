interface UploadFormProps {
  file: File | null
  jobId: string
  uploading: boolean
  canUpload: boolean
  onFileChange: (file: File | null) => void
  onJobIdChange: (jobId: string) => void
  onSubmit: () => void
}

/**
 * Form component for file uploads.
 * Extracted from UploadCard for better component organization.
 */
export function UploadForm({
  file,
  jobId,
  uploading,
  canUpload,
  onFileChange,
  onJobIdChange,
  onSubmit
}: UploadFormProps) {
  return (
    <div className='mt-3 space-y-3'>
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-1'>Select File</label>
        <input
          type='file'
          onChange={e => onFileChange(e.target.files?.[0] || null)}
          className='block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100'
          disabled={uploading}
        />
        {file && (
          <div className='text-xs text-gray-500 mt-1'>
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      <div>
        <label className='block text-sm font-medium text-gray-700 mb-1'>Job ID (Optional)</label>
        <input
          type='text'
          placeholder='UUID will be generated if empty'
          value={jobId}
          onChange={e => onJobIdChange(e.target.value)}
          className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          disabled={uploading}
        />
        <div className='text-xs text-gray-500 mt-1'>Leave empty to auto-generate a UUID</div>
      </div>

      <button
        onClick={onSubmit}
        disabled={!canUpload}
        className='w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors'
      >
        {uploading ? 'Uploading...' : 'Upload to Volume'}
      </button>
    </div>
  )
}
