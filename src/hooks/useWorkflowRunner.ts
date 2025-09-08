import { useState } from 'react'

export type WorkflowMode = 'auto' | 'sync' | 'async'

export interface WorkflowRunnerState {
  workflow: Record<string, unknown> | null
  nodeId: string
  inputKey: string
  workerPath: string
  mode: WorkflowMode
}

export interface UseWorkflowRunnerResult {
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
  handleWorkflowFile: (file: File) => Promise<void>
  resetForm: () => void

  // Computed
  isValid: boolean
  patches: Array<{ nodeId: string; inputKey: string; value: string }>
}

/**
 * Hook for managing workflow runner form state and workflow file handling.
 * Extracted from WorkflowRunner component for better separation of concerns.
 */
export function useWorkflowRunner(): UseWorkflowRunnerResult {
  const [state, setState] = useState<WorkflowRunnerState>({
    workflow: null,
    nodeId: '',
    inputKey: 'path',
    workerPath: '',
    mode: 'auto'
  })

  const setNodeId = (nodeId: string) => {
    setState(prev => ({ ...prev, nodeId }))
  }

  const setInputKey = (inputKey: string) => {
    setState(prev => ({ ...prev, inputKey }))
  }

  const setWorkerPath = (workerPath: string) => {
    setState(prev => ({ ...prev, workerPath }))
  }

  const setMode = (mode: WorkflowMode) => {
    setState(prev => ({ ...prev, mode }))
  }

  const handleWorkflowFile = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      const workflow = JSON.parse(text)
      setState(prev => ({ ...prev, workflow }))
    } catch (error) {
      console.error('Failed to parse workflow JSON:', error)
      throw new Error('Invalid JSON file. Please upload a valid ComfyUI workflow.')
    }
  }

  const resetForm = () => {
    setState({
      workflow: null,
      nodeId: '',
      inputKey: 'path',
      workerPath: '',
      mode: 'auto'
    })
  }

  // Computed values
  const isValid = Boolean(state.workflow && state.nodeId && state.inputKey && state.workerPath)

  const patches =
    state.nodeId && state.inputKey && state.workerPath
      ? [{ nodeId: state.nodeId, inputKey: state.inputKey, value: state.workerPath }]
      : []

  return {
    // State
    workflow: state.workflow,
    nodeId: state.nodeId,
    inputKey: state.inputKey,
    workerPath: state.workerPath,
    mode: state.mode,

    // Actions
    setNodeId,
    setInputKey,
    setWorkerPath,
    setMode,
    handleWorkflowFile,
    resetForm,

    // Computed
    isValid,
    patches
  }
}
