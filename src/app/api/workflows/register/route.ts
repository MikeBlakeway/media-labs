import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveTemplate } from '@/lib/templates.fs'
import { makeTemplate, ExportApiWorkflowSchema } from '@/lib/workflow.infer'
import { validateWorkflow } from '@/lib/workflow.validation'

export const runtime = 'nodejs'

const RegisterReqSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,64}$/),
  name: z.string().min(2),
  workflow: z.unknown() // Accept any workflow format for validation
})

export async function POST(req: NextRequest) {
  try {
    const jsonUnknown = await req.json()
    const parsed = RegisterReqSchema.safeParse(jsonUnknown)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { slug, name, workflow: rawWorkflow } = parsed.data

    // Validate the workflow using our comprehensive validation
    const validation = validateWorkflow(rawWorkflow)

    if (!validation.isValid || !validation.workflow) {
      return NextResponse.json(
        {
          error: 'Invalid workflow',
          details: {
            format: validation.format,
            errors: validation.errors,
            warnings: validation.warnings
          }
        },
        { status: 400 }
      )
    }

    // Additional validation using existing ExportApiWorkflowSchema for compatibility
    const schemaResult = ExportApiWorkflowSchema.safeParse(validation.workflow)
    if (!schemaResult.success) {
      return NextResponse.json(
        {
          error: 'Workflow format validation failed',
          details: schemaResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const tpl = makeTemplate(slug, name, validation.workflow)
    saveTemplate(tpl)

    return NextResponse.json(
      {
        ok: true,
        slug,
        fields: tpl.fields,
        validation: {
          format: validation.format,
          warnings: validation.warnings
        }
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
