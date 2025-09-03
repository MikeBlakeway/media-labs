'use client'

import { useState } from 'react'

interface UploadResponse {
  key: string
  workerPath: string
  jobId: string
  filename: string
  size: number
  contentType: string
}

export default function UploadCard() {
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string>('')
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string>('')

  const onSubmit = async () => {
    setError('')
    setResult(null)
    if (!file) {
      setError('Pick a file first')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    if (jobId.trim()) fd.append('jobId', jobId.trim())

    const res = await fetch('/api/volume/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || 'Upload failed')
      return
    }
    setResult(data as UploadResponse)
  }

  return (
    <div className='rounded-2xl border p-4'>
      <h2 className='text-lg font-semibold'>Upload to Runpod Volume</h2>
      <div className='mt-3 space-y-3'>
        <input type='file' onChange={e => setFile(e.target.files?.[0] || null)} className='block' />
        <input
          type='text'
          placeholder='Optional jobId (UUID will be generated)'
          value={jobId}
          onChange={e => setJobId(e.target.value)}
          className='w-full rounded-md border px-3 py-2 text-sm'
        />
        <button onClick={onSubmit} className='rounded-xl bg-black px-4 py-2 text-white'>
          Upload
        </button>
      </div>

      {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}

      {result && (
        <div className='mt-4 rounded-xl bg-gray-50 p-3 text-sm'>
          <div>
            <span className='font-medium'>workerPath:</span> {result.workerPath}
          </div>
          <div>
            <span className='font-medium'>key:</span> {result.key}
          </div>
          <div>
            <span className='font-medium'>jobId:</span> {result.jobId}
          </div>
          <div>
            <span className='font-medium'>filename:</span> {result.filename}
          </div>
          <div>
            <span className='font-medium'>size:</span> {result.size} bytes
          </div>
          <div>
            <span className='font-medium'>contentType:</span> {result.contentType}
          </div>
        </div>
      )}
    </div>
  )
}
