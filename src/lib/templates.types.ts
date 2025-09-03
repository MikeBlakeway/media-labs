import type { ExportApiWorkflow } from './workflow.infer'

export type FieldType = 'file' | 'string' | 'text' | 'integer' | 'number' | 'select' | 'boolean'

export interface FieldSpec {
  id: string
  label: string
  type: FieldType
  required: boolean
  defaultValue?: string | number | boolean
  options?: string[]
  nodeId: string
  inputKey: string
  help?: string
}

export interface WorkflowTemplate {
  slug: string
  name: string
  workflow: ExportApiWorkflow
  fields: FieldSpec[]
  createdAt: number
}
