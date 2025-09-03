import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveTemplate } from '@/lib/templates.fs'
import { makeTemplate, ExportApiWorkflowSchema } from '@/lib/workflow.infer'

export const runtime = 'nodejs'

const RegisterReqSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,64}$/),
  name: z.string().min(2),
  workflow: ExportApiWorkflowSchema
})

export async function POST(req: NextRequest) {
  try {
    const jsonUnknown = await req.json()
    const parsed = RegisterReqSchema.safeParse(jsonUnknown)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { slug, name, workflow } = parsed.data
    const tpl = makeTemplate(slug, name, workflow)
    saveTemplate(tpl)

    return NextResponse.json({ ok: true, slug, fields: tpl.fields }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
