import { NextRequest, NextResponse } from 'next/server'
import { PatchRunReq, TPatchRunReq } from '@/lib/zodSchemas'
import { patchWorkflowNode } from '@/lib/patchWorkflow'
import { runAsync, runSync } from '@/lib/runpod'
import { ExportApiWorkflowSchema, type ExportApiWorkflow } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

function approxSizeBytes(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PatchRunReq.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code
      }))
      return NextResponse.json({ error: { issues } }, { status: 400 })
    }
    const payload: TPatchRunReq = parsed.data
    // Validate & strongly type the workflow before patching
    const wfParsed = ExportApiWorkflowSchema.safeParse(payload.workflow)
    if (!wfParsed.success) {
      return NextResponse.json({ error: 'Invalid workflow: expected a ComfyUI Export (API) graph' }, { status: 400 })
    }
    let wf: ExportApiWorkflow = wfParsed.data
    for (const p of payload.patches) {
      wf = patchWorkflowNode(wf, p.nodeId, p.inputKey, p.value)
    }

    // Choose mode
    const input: { workflow: ExportApiWorkflow } = { workflow: wf }
    let mode = payload.mode
    if (mode === 'auto') {
      const size = approxSizeBytes({ input })
      // heuristic: use runsync if <= 20MB, else async
      mode = size <= 20 * 1024 * 1024 ? 'sync' : 'async'
    }

    if (mode === 'sync') {
      const out = await runSync(input)
      return NextResponse.json(out, { status: 200 })
    } else {
      const { id } = await runAsync(input)
      return NextResponse.json({ id, status: 'IN_PROGRESS' }, { status: 200 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
