// src/lib/workflow.patch.ts
import type { ExportApiWorkflow } from '@/lib/workflow.infer'

type WorkflowNode = ExportApiWorkflow[string] // { class_type: string; inputs: Record<string, unknown>; ... }

export function patchWorkflowNode(
  workflow: ExportApiWorkflow,
  nodeId: string,
  inputKey: string,
  value: unknown
): ExportApiWorkflow {
  const clone: ExportApiWorkflow = structuredClone(workflow)

  const node: WorkflowNode | undefined = clone[nodeId]
  if (!node) {
    throw new Error(`Node ${nodeId} not found`)
  }
  if (!node.inputs || typeof node.inputs !== 'object') {
    throw new Error(`Node ${nodeId} has no inputs`)
  }

  // immutably replace just this node’s inputs
  clone[nodeId] = {
    ...node,
    inputs: {
      ...node.inputs,
      [inputKey]: value
    }
  }

  return clone
}

export function patchWorkflow(
  workflow: ExportApiWorkflow,
  patches: ReadonlyArray<{ nodeId: string; inputKey: string; value: unknown }>
): ExportApiWorkflow {
  const clone: ExportApiWorkflow = structuredClone(workflow)

  for (const { nodeId, inputKey, value } of patches) {
    const node = clone[nodeId]
    if (!node) throw new Error(`Node ${nodeId} not found`)
    if (!node.inputs || typeof node.inputs !== 'object') {
      throw new Error(`Node ${nodeId} has no inputs`)
    }
    clone[nodeId] = {
      ...node,
      inputs: {
        ...node.inputs,
        [inputKey]: value
      }
    }
  }

  return clone
}
