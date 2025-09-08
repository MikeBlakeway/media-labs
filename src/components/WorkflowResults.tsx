/**
 * WorkflowResults Component
 *
 * Displays the output results from completed RunPod workflows
 * Supports images, videos, and error display
 */

'use client'

import { useState } from 'react'
import { DynamicImage } from './DynamicImage'

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
  const [selectedImage, setSelectedImage] = useState<number>(0)

  // Don't render anything if not completed or no output
  if (status !== 'completed' || !output) {
    if (status === 'failed' && error) {
      return (
        <div className='mt-6 rounded-xl border border-red-300 bg-red-50 p-4'>
          <h3 className='font-medium text-red-800 mb-2'>❌ Workflow Failed</h3>
          <p className='text-sm text-red-700'>{error}</p>
          {output?.errors && output.errors.length > 0 && (
            <div className='mt-3'>
              <h4 className='text-sm font-medium text-red-800'>Error Details:</h4>
              <ul className='mt-1 text-xs text-red-700 space-y-1'>
                {output.errors.map((err, i) => (
                  <li key={i} className='font-mono bg-red-100 p-2 rounded'>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className='mt-6 rounded-xl border border-green-300 bg-green-50 p-4'>
      <h3 className='font-medium text-green-800 mb-4 flex items-center gap-2'>
        ✅ Workflow Completed
        <span className='text-xs bg-green-200 px-2 py-1 rounded'>{output.images?.length || 0} images</span>
      </h3>

      {/* Display Images */}
      {output.images && output.images.length > 0 && (
        <div className='space-y-4'>
          {/* Image Gallery */}
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
            {output.images.map((img, index) => {
              // Handle both our format and RunPod format
              const base64Data = img.base64 || img.data
              const imageUrl = img.url

              return (
                <div
                  key={index}
                  className='relative cursor-pointer hover:ring-2 hover:ring-green-400 rounded-lg overflow-hidden'
                  onClick={() => setSelectedImage(index)}
                >
                  {base64Data ? (
                    <DynamicImage
                      src={`data:image/png;base64,${base64Data}`}
                      alt={`Result ${index + 1}`}
                      className='w-full h-32 object-cover'
                    />
                  ) : imageUrl ? (
                    <DynamicImage src={imageUrl} alt={`Result ${index + 1}`} className='w-full h-32 object-cover' />
                  ) : (
                    <div className='w-full h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500'>
                      {img.filename || `Image ${index + 1}`}
                    </div>
                  )}
                  <div className='absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded'>
                    {index + 1}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full Size Display */}
          {output.images[selectedImage] && (
            <div className='border rounded-lg p-4 bg-white'>
              <div className='flex justify-between items-center mb-3'>
                <h4 className='font-medium'>
                  Image {selectedImage + 1} of {output.images.length}
                </h4>
                <div className='flex gap-2'>
                  <button
                    onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                    disabled={selectedImage === 0}
                    className='px-2 py-1 text-xs border rounded disabled:opacity-50'
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setSelectedImage(Math.min(output.images!.length - 1, selectedImage + 1))}
                    disabled={selectedImage === output.images.length - 1}
                    className='px-2 py-1 text-xs border rounded disabled:opacity-50'
                  >
                    Next →
                  </button>
                </div>
              </div>

              {(() => {
                const currentImage = output.images[selectedImage]
                const base64Data = currentImage.base64 || currentImage.data
                const imageUrl = currentImage.url

                if (base64Data) {
                  return (
                    <DynamicImage
                      src={`data:image/png;base64,${base64Data}`}
                      alt={`Result ${selectedImage + 1}`}
                      className='max-w-full h-auto rounded border'
                    />
                  )
                } else if (imageUrl) {
                  return (
                    <DynamicImage
                      src={imageUrl}
                      alt={`Result ${selectedImage + 1}`}
                      className='max-w-full h-auto rounded border'
                    />
                  )
                } else {
                  return (
                    <div className='w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500'>
                      No image data available
                    </div>
                  )
                }
              })()}

              {/* Download Button */}
              {(() => {
                const currentImage = output.images[selectedImage]
                const base64Data = currentImage.base64 || currentImage.data

                if (base64Data) {
                  return (
                    <div className='mt-3'>
                      <a
                        href={`data:image/png;base64,${base64Data}`}
                        download={currentImage.filename || `result-${selectedImage + 1}.png`}
                        className='inline-block px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700'
                      >
                        📥 Download
                      </a>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          )}
        </div>
      )}

      {/* Display Videos (if any) */}
      {output.videos && output.videos.length > 0 && (
        <div className='mt-4'>
          <h4 className='font-medium text-green-800 mb-2'>Videos</h4>
          <div className='space-y-2'>
            {output.videos.map((video, index) => (
              <video key={index} controls className='max-w-full rounded border'>
                <source src={video} />
                Your browser does not support video playback.
              </video>
            ))}
          </div>
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
