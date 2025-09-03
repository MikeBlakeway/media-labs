// src/lib/zodSchemas.ts
import { z } from 'zod'

export const PatchSpec = z.object({
  nodeId: z.string().min(1),
  inputKey: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()])
})

// Use two-arg record overload (string keys, unknown values)
const WorkflowSchema = z.record(z.string(), z.unknown())

export const PatchRunReq = z.object({
  workflow: WorkflowSchema,
  patches: z.array(PatchSpec).min(1),
  mode: z.enum(['auto', 'sync', 'async']).default('auto')
})

export type TPatchRunReq = z.infer<typeof PatchRunReq>
