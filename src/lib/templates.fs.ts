import fs from 'node:fs'
import path from 'node:path'
import { WorkflowTemplate } from './templates.types'
import { makeTemplate, type ExportApiWorkflow } from './workflow.infer'

const ROOT = path.join(process.cwd(), 'data', 'workflows')

function ensureDir() {
  fs.mkdirSync(ROOT, { recursive: true })
}

function filePath(slug: string): string {
  return path.join(ROOT, `${slug}.json`)
}

export function saveTemplate(tpl: WorkflowTemplate) {
  ensureDir()
  fs.writeFileSync(filePath(tpl.slug), JSON.stringify(tpl, null, 2), 'utf8')
}

export function getTemplate(slug: string): WorkflowTemplate | null {
  try {
    const raw = fs.readFileSync(filePath(slug), 'utf8')
    return JSON.parse(raw) as WorkflowTemplate
  } catch {
    return null
  }
}

export function listTemplates(): { slug: string; name: string }[] {
  ensureDir()
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8')
    const tpl = JSON.parse(raw) as WorkflowTemplate
    return { slug: tpl.slug, name: tpl.name }
  })
}

export function deleteTemplate(slug: string): boolean {
  try {
    fs.unlinkSync(filePath(slug))
    return true
  } catch {
    return false
  }
}

/** Update by name and/or workflow; re-infer fields when workflow changes. */
export function updateTemplate(
  slug: string,
  update: { name?: string; workflow?: ExportApiWorkflow }
): WorkflowTemplate | null {
  const current = getTemplate(slug)
  if (!current) return null
  const name = update.name ?? current.name
  const workflow = update.workflow ?? current.workflow
  const next = makeTemplate(slug, name, workflow)
  next.createdAt = current.createdAt // preserve original createdAt
  saveTemplate(next)
  return next
}
