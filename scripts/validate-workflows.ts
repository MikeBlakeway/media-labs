#!/usr/bin/env tsx

/**
 * Workflow validation and conversion utility
 *
 * Usage:
 *   npm run validate-workflows
 *   npx tsx scripts/validate-workflows.ts
 */

import fs from 'node:fs'
import path from 'node:path'

// Import our validation functions
import { validateWorkflow } from '../src/lib/workflow.validation'
import { importWorkflowFromFile, saveTemplate } from '../src/lib/templates.fs'

const WORKFLOWS_DIR = path.join(process.cwd(), 'data', 'workflows')

async function main(): Promise<void> {
  console.log('🔍 Validating workflows in:', WORKFLOWS_DIR)

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.log('❌ Workflows directory not found:', WORKFLOWS_DIR)
    process.exit(1)
  }

  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'))
  console.log(`📁 Found ${files.length} JSON files`)

  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file)
    const slug = path.basename(file, '.json')

    console.log(`\n📄 Processing: ${file}`)

    try {
      const raw = fs.readFileSync(filePath, 'utf8')
      const data = JSON.parse(raw)

      // Check if it's already a proper template
      if (data.slug && data.name && data.workflow) {
        console.log('✅ Already a proper WorkflowTemplate')

        // Validate the workflow
        const validation = validateWorkflow(data.workflow)
        if (validation.isValid) {
          console.log('✅ Workflow is valid')
        } else {
          console.log('❌ Workflow has errors:', validation.errors)
        }

        if (validation.warnings.length > 0) {
          console.log('⚠️  Workflow warnings:', validation.warnings)
        }

        continue
      }

      // Try to extract workflow and convert
      const validation = validateWorkflow(data)

      console.log(`📝 Format detected: ${validation.format}`)

      if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors)
        continue
      }

      if (validation.warnings.length > 0) {
        console.log('⚠️  Warnings:', validation.warnings)
      }

      // Convert to proper template format
      const name = generateNameFromSlug(slug)
      console.log(`🔄 Converting to template format with name: "${name}"`)

      const result = importWorkflowFromFile(filePath, slug, name)

      if (result.success) {
        // Backup original file
        const backupPath = filePath + '.backup'
        fs.copyFileSync(filePath, backupPath)
        console.log(`💾 Backed up original to: ${path.basename(backupPath)}`)

        // Save converted template
        saveTemplate(result.template)
        console.log('✅ Converted and saved as WorkflowTemplate')
      } else {
        console.log('❌ Conversion failed:', result.validation.errors)
      }
    } catch (err) {
      console.log('❌ Error processing file:', err instanceof Error ? err.message : 'unknown error')
    }
  }

  console.log('\n🎉 Validation complete!')
}

function generateNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}
