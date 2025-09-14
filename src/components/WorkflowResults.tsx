/**
 * WorkflowResults Component (Refactored)
 *
 * Displays the output results from completed RunPod workflows
 * Uses hooks-based architecture for clean separation of concerns
 */

'use client'

import { useOutputProcessor } from '@/hooks/useOutputProcessor'
import { useResultsDisplay } from '@/hooks/useResultsDisplay'
import { useWorkflowOutputTypeSimple } from '@/hooks/useWorkflowOutputType'
import { ErrorDisplay } from './ErrorDisplay'
import { ImageGallery } from './ImageGallery'
import { ImageViewer } from './ImageViewer'
import { VideoDisplay } from './VideoDisplay'
import { MediaGallery } from './MediaDisplay'
import type { TemplateMeta } from '@/lib/templates.schema'

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
  workflowMeta?: TemplateMeta | null
}

export function WorkflowResults({ output, status, error, workflowMeta }: WorkflowResultsProps) {
  // Determine expected output type
  const outputType = useWorkflowOutputTypeSimple(workflowMeta || null)

  // Process output data
  const { processedOutput, isFailed, shouldShowResults } = useOutputProcessor(output, status) // Manage display state
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
        {outputType === 'video' ? (
          <span className='text-xs bg-blue-200 px-2 py-1 rounded'>{processedOutput.videoCount} videos</span>
        ) : (
          <span className='text-xs bg-green-200 px-2 py-1 rounded'>{processedOutput.imageCount} images</span>
        )}
        {/* Show secondary output type if present */}
        {outputType === 'video' && processedOutput.hasImages && (
          <span className='text-xs bg-green-200 px-2 py-1 rounded'>{processedOutput.imageCount} images</span>
        )}
        {outputType === 'image' && processedOutput.hasVideos && (
          <span className='text-xs bg-blue-200 px-2 py-1 rounded'>{processedOutput.videoCount} videos</span>
        )}
      </h3>

      {/* Primary Results based on workflow output type */}
      {outputType === 'video' && processedOutput.hasVideos ? (
        <MediaGallery
          items={processedOutput.videos.map((video, index) => ({
            src: video,
            filename: `video_${index + 1}`
          }))}
          workflowMeta={workflowMeta || null}
          className='mb-4'
        />
      ) : outputType === 'image' && processedOutput.hasImages ? (
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
      ) : null}

      {/* Secondary Results (fallback for mixed content or unexpected types) */}
      {outputType === 'image' && processedOutput.hasVideos && (
        <VideoDisplay videos={processedOutput.videos} className='mt-4' />
      )}

      {outputType === 'video' && processedOutput.hasImages && (
        <div className='mt-4 space-y-4'>
          <ImageGallery
            images={processedOutput.images}
            selectedIndex={display.selectedImageIndex}
            onSelect={display.selectImage}
          />
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
