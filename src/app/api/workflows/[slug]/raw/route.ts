import { NextRequest, NextResponse } from 'next/server'
import { getTemplate } from '@/lib/templates.fs'
import { ExportApiWorkflowSchema, type ExportApiWorkflow } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

type Params = { slug: string }

export async function GET(_req: NextRequest, context: { params: Promise<Params> }) {
  const { slug } = await context.params

  const tpl = getTemplate(slug)
  if (!tpl) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // Validate before sending
  const parsed = ExportApiWorkflowSchema.safeParse(tpl.workflow)
  if (!parsed.success) {
    return NextResponse.json({ error: 'stored workflow invalid' }, { status: 500 })
  }

  const payload: { slug: string; name: string; workflow: ExportApiWorkflow } = {
    slug: tpl.slug,
    name: tpl.name,
    workflow: parsed.data
  }
  return NextResponse.json(payload, { status: 200 })
}
