import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/templates.fs'
import { TemplateMetaSchema } from '@/lib/templates.schema'
import { ExportApiWorkflowSchema } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

// GET → return minimal metadata
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tpl = getTemplate(slug)
  if (!tpl) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const meta = { slug: tpl.slug, name: tpl.name, fields: tpl.fields }
  const parsed = TemplateMetaSchema.safeParse(meta)
  if (!parsed.success) return NextResponse.json({ error: 'invalid stored template' }, { status: 500 })
  return NextResponse.json(parsed.data, { status: 200 })
}

const UpdateReqSchema = z.object({
  name: z.string().min(2).optional(),
  workflow: ExportApiWorkflowSchema.optional()
})

// PUT → update name and/or workflow; re-infer fields on server
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const bodyUnknown = await req.json()
    const parsed = UpdateReqSchema.safeParse(bodyUnknown)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { slug } = await params
    const updated = updateTemplate(slug, parsed.data)
    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const meta = { slug: updated.slug, name: updated.name, fields: updated.fields }
    const v = TemplateMetaSchema.safeParse(meta)
    if (!v.success) return NextResponse.json({ error: 'update ok but meta invalid' }, { status: 500 })
    return NextResponse.json(v.data, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE → remove workflow
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ok = deleteTemplate(slug)
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true }, { status: 200 })
}
