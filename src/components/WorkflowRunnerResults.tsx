import Image from 'next/image'

interface OutputImage {
  filename: string
  type: 'base64' | 's3_url'
  data: string
}

interface WorkflowRunnerResultsProps {
  jobResults: unknown | null
  jobStartTime?: number
  duration?: number
}

/**
 * Component for displaying workflow runner results.
 * Extracted from WorkflowRunner for better organization.
 */
export function WorkflowRunnerResults({ jobResults, duration }: WorkflowRunnerResultsProps) {
  // Extract images from job results
  const images: OutputImage[] | null =
    jobResults && typeof jobResults === 'object' && jobResults !== null && 'images' in jobResults
      ? (jobResults.images as OutputImage[])
      : null

  if (!images || images.length === 0) {
    return null
  }

  return (
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

      {/* Display timing info if available */}
      {duration && <div className='text-xs text-gray-500'>Duration: {Math.round(duration / 1000)}s</div>}
    </div>
  )
}
