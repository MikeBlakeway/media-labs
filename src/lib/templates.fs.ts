import fs from 'node:fs'
import path from 'node:path'
import { WorkflowTemplate } from './templates.types'
import { makeTemplate, type ExportApiWorkflow } from './workflow.infer'
import { validateWorkflow, extractWorkflow, type WorkflowValidationResult } from './workflow.validation'

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
  const validTemplates: { slug: string; name: string }[] = []

  for (const f of files) {
    try {
      const fullPath = path.join(ROOT, f)
      const raw = fs.readFileSync(fullPath, 'utf8')
      const tpl = JSON.parse(raw) as WorkflowTemplate

      // Check if this is a valid WorkflowTemplate with required properties
      if (tpl.slug && tpl.name) {
        // Optionally validate the workflow itself
        const validation = validateWorkflow(tpl.workflow)
        if (!validation.isValid) {
          console.warn(`Template ${f} has invalid workflow:`, validation.errors)
          // Still include it in the list but warn about issues
        }
        if (validation.warnings.length > 0) {
          console.warn(`Template ${f} workflow warnings:`, validation.warnings)
        }

        validTemplates.push({ slug: tpl.slug, name: tpl.name })
      } else {
        // Try to extract workflow from other formats
        const rawData = JSON.parse(raw)
        const workflow = extractWorkflow(rawData)

        if (workflow) {
          console.warn(`Skipping legacy format file: ${f} (can be imported using importWorkflow function)`)
        } else {
          console.warn(`Skipping invalid template file: ${f} (missing slug or name)`)
        }
      }
    } catch (err) {
      console.warn(`Skipping malformed template file: ${f}`, err instanceof Error ? err.message : 'unknown error')
    }
  }

  return validTemplates
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

/**
 * Import and validate a workflow from raw data (RunPod or ComfyUI format)
 */
export function importWorkflow(
  slug: string,
  name: string,
  rawData: unknown
): { success: true; template: WorkflowTemplate } | { success: false; validation: WorkflowValidationResult } {
  const validation = validateWorkflow(rawData)

  if (!validation.isValid || !validation.workflow) {
    return { success: false, validation }
  }

  // Create template from validated workflow
  const template = makeTemplate(slug, name, validation.workflow)

  return { success: true, template }
}

/**
 * Safely import a workflow file and create a template
 */
export function importWorkflowFromFile(
  filePath: string,
  slug: string,
  name: string
):
  | { success: true; template: WorkflowTemplate }
  | { success: false; validation: WorkflowValidationResult; error?: string } {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return importWorkflow(slug, name, data)
  } catch (err) {
    return {
      success: false,
      validation: {
        isValid: false,
        errors: [`Failed to read or parse file: ${err instanceof Error ? err.message : 'unknown error'}`],
        warnings: [],
        format: 'unknown'
      },
      error: err instanceof Error ? err.message : 'unknown error'
    }
  }
}

/**
 * Validate an existing template file for correctness
 */
export function validateTemplateFile(filePath: string): WorkflowValidationResult {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const template = JSON.parse(raw) as WorkflowTemplate

    // Check if it's a properly formatted template
    if (!template.slug || !template.name || !template.workflow) {
      return {
        isValid: false,
        errors: ['Template missing required properties (slug, name, workflow)'],
        warnings: [],
        format: 'unknown'
      }
    }

    // Validate the embedded workflow
    return validateWorkflow(template.workflow)
  } catch (err) {
    return {
      isValid: false,
      errors: [`Failed to read or parse template file: ${err instanceof Error ? err.message : 'unknown error'}`],
      warnings: [],
      format: 'unknown'
    }
  }
}
