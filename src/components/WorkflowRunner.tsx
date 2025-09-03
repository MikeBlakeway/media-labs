'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

type Mode = 'auto' | 'sync' | 'async'

interface OutputImage {
  filename: string
  type: 'base64' | 's3_url'
  data: string
}

export default function WorkflowRunner() {
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(null)
  const [nodeId, setNodeId] = useState('') // e.g. '12'
  const [inputKey, setInputKey] = useState('path') // e.g. 'path' | 'image_path' | 'url_or_path'
  const [workerPath, setWorkerPath] = useState('') // paste from Upload step
  const [mode, setMode] = useState<Mode>('auto')

  const [status, setStatus] = useState('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [images, setImages] = useState<OutputImage[] | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
  }, [])

  const onWorkflowFile = async (f: File) => {
    const text = await f.text()
    setWorkflow(JSON.parse(text))
  }

  const submit = async () => {
    setStatus('submitting')
    setImages(null)
    setJobId(null)

    if (!workflow) {
      setStatus('No workflow uploaded')
      return
    }
    if (!nodeId || !inputKey || !workerPath) {
      setStatus('Missing nodeId/inputKey/workerPath')
      return
    }

    const body = {
      workflow,
      patches: [{ nodeId, inputKey, value: workerPath }],
      mode
    }

    const res = await fetch('/api/workflows/patch-run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()

    // If sync completed
    if (data?.status === 'COMPLETED' && data?.output) {
      setStatus('completed')
      setImages(data.output.images ?? null)
      return
    }

    // If async: poll
    if (data?.id) {
      setStatus('queued')
      setJobId(data.id)
      const poll = async () => {
        const sres = await fetch(`/api/runpod/status/${data.id}`)
        const s = await sres.json()
        if (s.status === 'COMPLETED') {
          setStatus('completed')
          setImages(s.output?.images ?? null)
        } else if (s.status === 'FAILED') {
          setStatus('failed')
        } else {
          pollRef.current = window.setTimeout(poll, 2000)
        }
      }
      poll()
      return
    }

    setStatus(`unexpected: ${JSON.stringify(data)}`)
  }

  return (
    <div className='rounded-2xl border p-4'>
      <h2 className='text-lg font-semibold'>Run ComfyUI Workflow</h2>

      <div className='mt-3 grid gap-3'>
        <label className='block text-sm'>
          Workflow JSON
          <input
            type='file'
            accept='application/json'
            className='mt-1 block'
            onChange={e => e.target.files?.[0] && onWorkflowFile(e.target.files[0])}
          />
        </label>

        <label className='block text-sm'>
          Loader node id (e.g., 12)
          <input
            value={nodeId}
            onChange={e => setNodeId(e.target.value)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          />
        </label>

        <label className='block text-sm'>
          Loader input key (e.g., path, image_path, url_or_path)
          <input
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          />
        </label>

        <label className='block text-sm'>
          workerPath (paste from upload)
          <input
            value={workerPath}
            onChange={e => setWorkerPath(e.target.value)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
            placeholder='/runpod-volume/inputs/<jobId>/<file>'
          />
        </label>

        <label className='block text-sm'>
          Mode
          <select
            value={mode}
            onChange={e => setMode(e.target.value as Mode)}
            className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          >
            <option value='auto'>auto</option>
            <option value='sync'>sync</option>
            <option value='async'>async</option>
          </select>
        </label>

        <button onClick={submit} className='rounded-xl bg-black px-4 py-2 text-white'>
          Run
        </button>

        <div className='text-sm opacity-70'>
          Status: {status}
          {jobId ? ` — ${jobId}` : ''}
        </div>
      </div>

      {images && images.length > 0 && (
        <div className='mt-4 space-y-3'>
          {images.map((im, i) => (
            <div key={i} className='rounded-xl border p-3'>
              <div className='text-xs opacity-70 mb-1'>{im.filename}</div>
              {im.type === 'base64' ? (
                <Image alt='result' src={`data:image/png;base64,${im.data}`} className='max-w-full rounded' />
              ) : (
                <a className='underline' target='_blank' href={im.data}>
                  Open result
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
