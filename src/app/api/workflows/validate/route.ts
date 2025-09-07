import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateWorkflow } from '@/lib/workflow.validation'

export const runtime = 'nodejs'

const ValidateReqSchema = z.object({
  workflow: z.unknown() // Accept any workflow format for validation
})

export async function POST(req: NextRequest) {
  try {
    const jsonUnknown = await req.json()
    const parsed = ValidateReqSchema.safeParse(jsonUnknown)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { workflow: rawWorkflow } = parsed.data

    // Validate the workflow using our comprehensive validation
    const validation = validateWorkflow(rawWorkflow)

    return NextResponse.json(
      {
        isValid: validation.isValid,
        format: validation.format,
        errors: validation.errors,
        warnings: validation.warnings,
        hasWorkflow: !!validation.workflow
      },
      {
        status: validation.isValid ? 200 : 400
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json(
      {
        isValid: false,
        format: 'unknown',
        errors: [`Server error: ${message}`],
        warnings: [],
        hasWorkflow: false
      },
      { status: 500 }
    )
  }
}
