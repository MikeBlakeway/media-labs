import { NextResponse } from 'next/server'
import { listTemplates } from '@/lib/templates.fs'
import { TemplatesListSchema } from '@/lib/templates.schema'

export const runtime = 'nodejs'

export async function GET() {
  const items = listTemplates() // { slug, name }[]
  const parsed = TemplatesListSchema.safeParse(items)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid templates list' }, { status: 500 })
  }
  return NextResponse.json(parsed.data, { status: 200 })
}
