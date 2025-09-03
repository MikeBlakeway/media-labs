import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTemplate } from '@/lib/templates.fs'
import { runAsync, runSync } from '@/lib/runpod'
import { ExportApiWorkflowSchema, type ExportApiWorkflow, type ExportApiNode } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

const PatchSpecSchema = z.object({
  nodeId: z.string(),
  inputKey: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()])
})

const RunReqSchema = z.object({
  slug: z.string(),
  patches: z.array(PatchSpecSchema),
  mode: z.enum(['auto', 'sync', 'async']).optional()
})
type RunReq = z.infer<typeof RunReqSchema>

function approxSizeBytes(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8')
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown = await req.json()
    const parsed = RunReqSchema.safeParse(bodyUnknown)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body: RunReq = parsed.data

    const tpl = getTemplate(body.slug)
    if (!tpl) {
      return NextResponse.json({ error: 'template not found' }, { status: 404 })
    }

    // Validate stored workflow into a typed structure
    const wfParsed = ExportApiWorkflowSchema.safeParse(tpl.workflow)
    if (!wfParsed.success) {
      return NextResponse.json({ error: 'stored workflow is invalid' }, { status: 500 })
    }
    const wf: ExportApiWorkflow = wfParsed.data

    // Apply patches with strict typing (no casts)
    const out: Record<string, ExportApiNode> = {}
    for (const [nodeId, node] of Object.entries(wf)) {
      const nodePatches = body.patches.filter(p => p.nodeId === nodeId)
      if (nodePatches.length === 0) {
        out[nodeId] = node
      } else {
        const newInputs: Record<string, unknown> = { ...node.inputs }
        for (const p of nodePatches) {
          newInputs[p.inputKey] = p.value
        }
        out[nodeId] = { ...node, inputs: newInputs }
      }
    }
    const patched: ExportApiWorkflow = out

    const input = { workflow: patched }
    let mode: 'sync' | 'async'
    if (body.mode === 'sync' || body.mode === 'async') {
      mode = body.mode
    } else {
      mode = approxSizeBytes({ input }) <= 20 * 1024 * 1024 ? 'sync' : 'async'
    }

    if (mode === 'sync') {
      const outSync: unknown = await runSync(input)
      return NextResponse.json(outSync, { status: 200 })
    } else {
      const asyncOut = await runAsync(input)
      return NextResponse.json({ id: asyncOut.id, status: 'IN_PROGRESS' }, { status: 200 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
