import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTemplate } from '@/lib/templates.fs'
import { runAsync } from '@/lib/runpod'
import { ExportApiWorkflowSchema, type ExportApiWorkflow, type ExportApiNode } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

const PatchSpecSchema = z.object({
  nodeId: z.string(),
  inputKey: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()])
})

const AsyncRunReqSchema = z.object({
  slug: z.string(),
  patches: z.array(PatchSpecSchema)
})
type AsyncRunReq = z.infer<typeof AsyncRunReqSchema>

/**
 * Force Async Workflow Runner
 *
 * This endpoint always runs workflows in async mode to avoid worker-comfyui
 * websocket timeout issues with long-running video generation workflows.
 */
export async function POST(req: NextRequest) {
  try {
    const bodyUnknown = await req.json()
    const parsed = AsyncRunReqSchema.safeParse(bodyUnknown)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body: AsyncRunReq = parsed.data

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

    // Always use async mode to avoid worker-comfyui websocket timeouts
    const asyncOut = await runAsync(input)

    return NextResponse.json(
      {
        id: asyncOut.id,
        status: 'IN_PROGRESS',
        mode: 'async',
        message: 'Workflow submitted in async mode to prevent timeout issues'
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
