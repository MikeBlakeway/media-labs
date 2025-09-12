/**
 * WorkflowResults Component (Refactored)
 *
 * Displays the output results from completed RunPod workflows
 * Uses hooks-based architecture for clean separation of concerns
 */

'use client'

import { useOutputProcessor } from '@/hooks/useOutputProcessor'
import { useResultsDisplay } from '@/hooks/useResultsDisplay'
import { ErrorDisplay } from './ErrorDisplay'
import { ImageGallery } from './ImageGallery'
import { ImageViewer } from './ImageViewer'
import { VideoDisplay } from './VideoDisplay'

interface RunpodOutputImage {
  base64?: string
  url?: string
  filename?: string
  // RunPod format support
  data?: string
  type?: 'base64' | 's3_url'
}

interface WorkflowOutput {
  images?: RunpodOutputImage[]
  videos?: string[]
  errors?: string[]
  [key: string]: unknown
}

interface WorkflowResultsProps {
  output: WorkflowOutput | null
  status: string
  error?: string
}

export function WorkflowResults({ output, status, error }: WorkflowResultsProps) {
  // Process output data
  const { processedOutput, isFailed, shouldShowResults } = useOutputProcessor(output, status)

  // Manage display state
  const display = useResultsDisplay(processedOutput.images)

  // Handle error states
  if (isFailed && (error || processedOutput.hasErrors)) {
    return <ErrorDisplay error={error} errors={processedOutput.errors} className='mt-6' />
  }

  // Don't render anything if not ready to show results
  if (!shouldShowResults) {
    return null
  }

  return (
    <div className='mt-6 rounded-xl border border-green-300 bg-green-50 p-4'>
      <h3 className='font-medium text-green-800 mb-4 flex items-center gap-2'>
        ✅ Workflow Completed
        <span className='text-xs bg-green-200 px-2 py-1 rounded'>{processedOutput.imageCount} images</span>
        {processedOutput.hasVideos && (
          <span className='text-xs bg-blue-200 px-2 py-1 rounded'>{processedOutput.videoCount} videos</span>
        )}
      </h3>

      {/* Image Results */}
      {processedOutput.hasImages && (
        <div className='space-y-4'>
          {/* Image Gallery */}
          <ImageGallery
            images={processedOutput.images}
            selectedIndex={display.selectedImageIndex}
            onSelect={display.selectImage}
          />

          {/* Full Size Image Viewer */}
          {display.selectedImage && (
            <ImageViewer
              image={display.selectedImage}
              currentIndex={display.selectedImageIndex}
              totalImages={processedOutput.imageCount}
              canNavigatePrev={display.canNavigatePrev}
              canNavigateNext={display.canNavigateNext}
              onNavigatePrev={display.navigatePrev}
              onNavigateNext={display.navigateNext}
            />
          )}
        </div>
      )}

      {/* Video Results */}
      {processedOutput.hasVideos && <VideoDisplay videos={processedOutput.videos} className='mt-4' />}

      {/* Raw Output Debug (development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className='mt-4'>
          <summary className='text-xs text-green-700 cursor-pointer'>🔍 Debug: Raw Output</summary>
          <pre className='mt-2 text-xs bg-green-100 p-2 rounded overflow-auto max-h-40'>
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
