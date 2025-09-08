import type { WorkflowMode } from '@/hooks/useWorkflowRunner'

interface WorkflowRunnerFormProps {
  // State
  workflow: Record<string, unknown> | null
  nodeId: string
  inputKey: string
  workerPath: string
  mode: WorkflowMode

  // Actions
  setNodeId: (nodeId: string) => void
  setInputKey: (inputKey: string) => void
  setWorkerPath: (workerPath: string) => void
  setMode: (mode: WorkflowMode) => void
  onWorkflowFile: (file: File) => void

  // Status
  disabled?: boolean
}

/**
 * Form component for workflow runner configuration.
 * Extracted from WorkflowRunner for better component organization.
 */
export function WorkflowRunnerForm({
  workflow,
  nodeId,
  inputKey,
  workerPath,
  mode,
  setNodeId,
  setInputKey,
  setWorkerPath,
  setMode,
  onWorkflowFile,
  disabled = false
}: WorkflowRunnerFormProps) {
  return (
    <div className='grid gap-3'>
      <label className='block text-sm'>
        Workflow JSON
        <input
          type='file'
          accept='application/json'
          className='mt-1 block'
          disabled={disabled}
          onChange={e => e.target.files?.[0] && onWorkflowFile(e.target.files[0])}
        />
        {workflow && <div className='text-xs text-green-600 mt-1'>✓ Workflow loaded</div>}
      </label>

      <label className='block text-sm'>
        Loader node id (e.g., 12)
        <input
          value={nodeId}
          onChange={e => setNodeId(e.target.value)}
          className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          placeholder='12'
          disabled={disabled}
        />
      </label>

      <label className='block text-sm'>
        Loader input key (e.g., path, image_path, url_or_path)
        <input
          value={inputKey}
          onChange={e => setInputKey(e.target.value)}
          className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          placeholder='path'
          disabled={disabled}
        />
      </label>

      <label className='block text-sm'>
        workerPath (paste from upload)
        <input
          value={workerPath}
          onChange={e => setWorkerPath(e.target.value)}
          className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          placeholder='/runpod-volume/inputs/<jobId>/<file>'
          disabled={disabled}
        />
      </label>

      <label className='block text-sm'>
        Mode
        <select
          value={mode}
          onChange={e => setMode(e.target.value as WorkflowMode)}
          className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
          disabled={disabled}
        >
          <option value='auto'>auto</option>
          <option value='sync'>sync</option>
          <option value='async'>async</option>
        </select>
      </label>
    </div>
  )
}
