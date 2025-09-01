'use client'

import { useState, useEffect } from 'react'
import { useJobSSE } from '../../hooks/useJobSSE'
import { VideoPlayer } from '../../components/VideoPlayer'
import { JobStatusDisplay } from '../../components/JobStatusDisplay'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

export default function FLF2VPage() {
  const [startImage, setStartImage] = useState<File | null>(null)
  const [endImage, setEndImage] = useState<File | null>(null)
  const [startImagePreview, setStartImagePreview] = useState<string | null>(null)
  const [endImagePreview, setEndImagePreview] = useState<string | null>(null)
  const [frames, setFrames] = useState<number>(16)
  const [fps, setFps] = useState<number>(8)
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use SSE hook for real-time job updates
  const { job, isConnected, error: sseError, isLoading, reconnect } = useJobSSE(jobId)

  // Cleanup preview URLs on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (startImagePreview) {
        URL.revokeObjectURL(startImagePreview)
      }
      if (endImagePreview) {
        URL.revokeObjectURL(endImagePreview)
      }
    }
  }, [])

  const handleImageUpload = (file: File, type: 'start' | 'end') => {
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type for ${type} image. Supported types: PNG, JPEG, JPG`)
        return
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        setError(`File too large for ${type} image. Maximum size: 10MB`)
        return
      }

      // Clear any previous errors
      setError(null)

      // Revoke existing preview URL to prevent memory leaks
      if (type === 'start' && startImagePreview) {
        URL.revokeObjectURL(startImagePreview)
      } else if (type === 'end' && endImagePreview) {
        URL.revokeObjectURL(endImagePreview)
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      if (type === 'start') {
        setStartImage(file)
        setStartImagePreview(previewUrl)
      } else {
        setEndImage(file)
        setEndImagePreview(previewUrl)
      }
    }
  }

  // Helper function to upload a single image and get URL reference
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/api/uploads`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Failed to upload image: ${errorData}`)
    }

    const result = await response.json()
    return result.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startImage || !endImage) {
      setError('Both start and end images are required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setJobId(null)

    try {
      // Step 1: Upload images individually to get URL references
      console.log('📤 Uploading start image...')
      const startImageUrl = await uploadImage(startImage)

      console.log('📤 Uploading end image...')
      const endImageUrl = await uploadImage(endImage)

      console.log('✅ Both images uploaded, creating job...')

      // Step 2: Create job with URL references (small payload)
      const jobData = {
        startImageUrl,
        endImageUrl,
        frames: frames.toString(),
        fps: fps.toString(),
        resolution
      }

      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to create job: ${errorData}`)
      }

      const result = await response.json()
      setJobId(result.id)
      console.log('✅ Job created successfully:', result.id)
    } catch (err) {
      console.error('❌ Job creation failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    // Revoke preview URLs to prevent memory leaks
    if (startImagePreview) {
      URL.revokeObjectURL(startImagePreview)
    }
    if (endImagePreview) {
      URL.revokeObjectURL(endImagePreview)
    }

    setStartImage(null)
    setEndImage(null)
    setStartImagePreview(null)
    setEndImagePreview(null)
    setFrames(16)
    setFps(8)
    setResolution('720p')
    setJobId(null)
    setError(null)
  }

  // Check if we should show the completed video
  const showVideo = job?.status === 'COMPLETED' && (job.outputUrl || job.downloadUrl)

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-4xl mx-auto'>
          <header className='text-center mb-8'>
            <h1 className='text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2'>First-Last Frame to Video</h1>
            <p className='text-slate-600 dark:text-slate-400'>Generate smooth video transitions between two images</p>
          </header>

          {/* Job Status Display */}
          {job && (
            <JobStatusDisplay
              job={job}
              isConnected={isConnected}
              error={sseError}
              onReconnect={reconnect}
              className="mb-6"
            />
          )}

          {/* Video Player (when completed) */}
          {showVideo && (
            <VideoPlayer
              videoUrl={job.outputUrl!}
              downloadUrl={job.downloadUrl}
              title="Generated Video"
              className="mb-6"
            />
          )}

          {/* Success Message (when job created but not yet completed) */}
          {jobId && !showVideo && (
            <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6'>
              <h3 className='text-green-800 dark:text-green-200 font-semibold mb-2'>Job Created Successfully!</h3>
              <p className='text-green-700 dark:text-green-300'>
                Job ID:{' '}
                <code className='bg-green-100 dark:bg-green-800 px-2 py-1 rounded font-mono text-sm'>{jobId}</code>
              </p>
              <p className='text-green-700 dark:text-green-300 text-sm mt-2'>
                Your video is being processed. You'll see real-time updates above.
              </p>
              <button
                onClick={resetForm}
                className='mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors'
              >
                Create Another Video
              </button>
            </div>
          )}

          {error && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6'>
              <h3 className='text-red-800 dark:text-red-200 font-semibold mb-2'>Error</h3>
              <p className='text-red-700 dark:text-red-300'>{error}</p>
            </div>
          )}

          {/* Form - only show if no job is running or if job failed */}
          {(!job || job.status === 'FAILED') && (
            <form onSubmit={handleSubmit} className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-6'>
            {/* Image Upload Section */}
            <div className='grid md:grid-cols-2 gap-6'>
              {/* Start Image */}
              <div className='space-y-3'>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300'>Start Image</label>
                <div className='border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors relative'>
                  {startImagePreview ? (
                    <div className='space-y-3'>
                      <img
                        src={startImagePreview}
                        alt='Start image preview'
                        className='max-w-full max-h-48 mx-auto rounded-lg shadow-md'
                      />
                      <p className='text-sm text-slate-600 dark:text-slate-400'>{startImage?.name}</p>
                      <button
                        type='button'
                        onClick={() => {
                          if (startImagePreview) {
                            URL.revokeObjectURL(startImagePreview)
                          }
                          setStartImage(null)
                          setStartImagePreview(null)
                        }}
                        className='text-red-600 hover:text-red-700 text-sm font-medium relative z-10'
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <div className='text-slate-400 text-4xl'>📷</div>
                      <p className='text-slate-600 dark:text-slate-400'>Click to upload start image</p>
                      <p className='text-xs text-slate-500 dark:text-slate-500'>PNG, JPEG, JPG (max 10MB)</p>
                    </div>
                  )}
                  <input
                    type='file'
                    accept='image/png,image/jpeg,image/jpg'
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'start')
                    }}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0'
                  />
                </div>
              </div>

              {/* End Image */}
              <div className='space-y-3'>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300'>End Image</label>
                <div className='border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors relative'>
                  {endImagePreview ? (
                    <div className='space-y-3'>
                      <img
                        src={endImagePreview}
                        alt='End image preview'
                        className='max-w-full max-h-48 mx-auto rounded-lg shadow-md'
                      />
                      <p className='text-sm text-slate-600 dark:text-slate-400'>{endImage?.name}</p>
                      <button
                        type='button'
                        onClick={() => {
                          if (endImagePreview) {
                            URL.revokeObjectURL(endImagePreview)
                          }
                          setEndImage(null)
                          setEndImagePreview(null)
                        }}
                        className='text-red-600 hover:text-red-700 text-sm font-medium relative z-10'
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <div className='text-slate-400 text-4xl'>📷</div>
                      <p className='text-slate-600 dark:text-slate-400'>Click to upload end image</p>
                      <p className='text-xs text-slate-500 dark:text-slate-500'>PNG, JPEG, JPG (max 10MB)</p>
                    </div>
                  )}
                  <input
                    type='file'
                    accept='image/png,image/jpeg,image/jpg'
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'end')
                    }}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0'
                  />
                </div>
              </div>
            </div>

            {/* Parameters Section */}
            <div className='border-t border-slate-200 dark:border-slate-700 pt-6'>
              <h3 className='text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4'>Video Parameters</h3>

              <div className='grid md:grid-cols-3 gap-6'>
                {/* Frames */}
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>
                    Frames ({frames})
                  </label>
                  <input
                    type='range'
                    min='4'
                    max='120'
                    value={frames}
                    onChange={e => setFrames(Number(e.target.value))}
                    className='w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer'
                  />
                  <div className='flex justify-between text-xs text-slate-500 dark:text-slate-400'>
                    <span>4</span>
                    <span>120</span>
                  </div>
                  <div className='flex gap-2 mt-2'>
                    <button
                      type='button'
                      onClick={() => setFrames(16)}
                      className={`px-3 py-1 text-xs rounded ${
                        frames === 16
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Standard (16)
                    </button>
                    <button
                      type='button'
                      onClick={() => setFrames(60)}
                      className={`px-3 py-1 text-xs rounded ${
                        frames === 60
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Smooth (60)
                    </button>
                  </div>
                </div>

                {/* FPS */}
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>FPS ({fps})</label>
                  <input
                    type='range'
                    min='1'
                    max='60'
                    value={fps}
                    onChange={e => setFps(Number(e.target.value))}
                    className='w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer'
                  />
                  <div className='flex justify-between text-xs text-slate-500 dark:text-slate-400'>
                    <span>1</span>
                    <span>60</span>
                  </div>
                  <div className='flex gap-2 mt-2'>
                    <button
                      type='button'
                      onClick={() => setFps(8)}
                      className={`px-3 py-1 text-xs rounded ${
                        fps === 8
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Standard (8)
                    </button>
                    <button
                      type='button'
                      onClick={() => setFps(24)}
                      className={`px-3 py-1 text-xs rounded ${
                        fps === 24
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Cinematic (24)
                    </button>
                  </div>
                </div>

                {/* Resolution */}
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>Resolution</label>
                  <div className='space-y-2'>
                    <label className='flex items-center space-x-2 cursor-pointer'>
                      <input
                        type='radio'
                        name='resolution'
                        value='720p'
                        checked={resolution === '720p'}
                        onChange={e => setResolution(e.target.value as '720p' | '1080p')}
                        className='text-blue-600'
                      />
                      <span className='text-sm text-slate-700 dark:text-slate-300'>720p (HD)</span>
                    </label>
                    <label className='flex items-center space-x-2 cursor-pointer'>
                      <input
                        type='radio'
                        name='resolution'
                        value='1080p'
                        checked={resolution === '1080p'}
                        onChange={e => setResolution(e.target.value as '720p' | '1080p')}
                        className='text-blue-600'
                      />
                      <span className='text-sm text-slate-700 dark:text-slate-300'>1080p (Full HD)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className='flex justify-center pt-6'>
              <button
                type='submit'
                disabled={!startImage || !endImage || isSubmitting}
                className='px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center space-x-2'
              >
                {isSubmitting ? (
                  <>
                    <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    <span>Creating Video...</span>
                  </>
                ) : (
                  <span>Generate Video</span>
                )}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  )
}
