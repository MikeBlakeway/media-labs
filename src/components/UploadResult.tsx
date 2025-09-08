import type { UploadResponse } from '@/hooks/useUploadCard'

interface UploadResultProps {
  result: UploadResponse
  onClear?: () => void
}

/**
 * Component for displaying upload results.
 * Extracted from UploadCard for better organization and reusability.
 */
export function UploadResult({ result, onClear }: UploadResultProps) {
  return (
    <div className='mt-4 rounded-xl bg-gray-50 p-3 text-sm'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-medium text-green-600'>✓ Upload Successful</h3>
        {onClear && (
          <button onClick={onClear} className='text-xs text-gray-500 hover:text-gray-700' title='Clear result'>
            ✕
          </button>
        )}
      </div>

      <div className='space-y-1'>
        <div>
          <span className='font-medium'>workerPath:</span>
          <code className='ml-1 bg-white px-1 rounded text-xs'>{result.workerPath}</code>
        </div>
        <div>
          <span className='font-medium'>key:</span>
          <code className='ml-1 bg-white px-1 rounded text-xs'>{result.key}</code>
        </div>
        <div>
          <span className='font-medium'>jobId:</span>
          <code className='ml-1 bg-white px-1 rounded text-xs'>{result.jobId}</code>
        </div>
        <div>
          <span className='font-medium'>filename:</span> {result.filename}
        </div>
        <div>
          <span className='font-medium'>size:</span> {result.size.toLocaleString()} bytes
        </div>
        <div>
          <span className='font-medium'>contentType:</span> {result.contentType}
        </div>
      </div>
    </div>
  )
}
