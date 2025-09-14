---
applyTo: 'data/workflows/**,src/lib/templates*'
description: 'ComfyUI workflow template management'
---

# Workflow Templates Instructions

## ComfyUI Workflow Template Standards

Maintain consistent patterns for creating, validating, and managing ComfyUI workflow templates.

### Template File Structure

#### Required Template Schema

```json
{
  "name": "Template Display Name",
  "description": "Clear description of what this workflow does",
  "category": "image-generation" | "video-generation" | "upscaling" | "style-transfer",
  "outputType": "image" | "video",
  "parameters": {
    "parameterName": {
      "type": "string" | "number" | "boolean" | "select",
      "label": "User-Friendly Label",
      "description": "Parameter description",
      "default": "default-value",
      "options": ["option1", "option2"], // For select type
      "min": 1, // For number type
      "max": 100, // For number type
      "step": 1 // For number type
    }
  },
  "workflow": {
    // ComfyUI workflow JSON in API format
  }
}
```

#### Example Template Structure

```json
{
  "name": "Text to Image - Basic",
  "description": "Generate images from text prompts using Stable Diffusion",
  "category": "image-generation",
  "outputType": "image",
  "parameters": {
    "prompt": {
      "type": "string",
      "label": "Prompt",
      "description": "Text description of the image to generate",
      "default": "A beautiful landscape"
    },
    "width": {
      "type": "number",
      "label": "Width",
      "description": "Image width in pixels",
      "default": 512,
      "min": 256,
      "max": 2048,
      "step": 64
    },
    "steps": {
      "type": "number",
      "label": "Sampling Steps",
      "description": "Number of denoising steps",
      "default": 20,
      "min": 1,
      "max": 150
    },
    "sampler": {
      "type": "select",
      "label": "Sampler",
      "description": "Sampling method",
      "default": "euler_ancestral",
      "options": ["euler", "euler_ancestral", "dpm_2", "dpm_2_ancestral"]
    }
  },
  "workflow": {
    // ComfyUI workflow nodes...
  }
}
```

### Parameter Placeholder System

#### Template Parameter Replacement

```json
{
  "workflow": {
    "1": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": "{{prompt}}", // Parameter placeholder
        "clip": ["2", 1]
      }
    },
    "2": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "{{model_name}}" // Parameter placeholder
      }
    }
  }
}
```

#### Parameter Processing Pattern

```typescript
// src/lib/templates.ts
export function patchWorkflowParameters(workflow: WorkflowObject, parameters: Record<string, unknown>): WorkflowObject {
  let workflowStr = JSON.stringify(workflow)

  for (const [key, value] of Object.entries(parameters)) {
    const placeholder = `{{${key}}}`
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    workflowStr = workflowStr.replace(regex, String(value))
  }

  try {
    return JSON.parse(workflowStr) as WorkflowObject
  } catch (error) {
    throw new Error(`Failed to parse workflow after parameter substitution: ${error}`)
  }
}
```

### Workflow Validation Patterns

#### Template Schema Validation

```typescript
// src/lib/templates.schema.ts
import { z } from 'zod'

const ParameterSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'select']),
  label: z.string(),
  description: z.string(),
  default: z.union([z.string(), z.number(), z.boolean()]),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional()
})

export const WorkflowTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['image-generation', 'video-generation', 'upscaling', 'style-transfer']),
  outputType: z.enum(['image', 'video']),
  parameters: z.record(z.string(), ParameterSchema),
  workflow: z.record(z.string(), z.unknown()) // ComfyUI workflow object
})

export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>
export type ParameterDefinition = z.infer<typeof ParameterSchema>
```

#### Template File Validation

```typescript
// scripts/validate-workflows.ts
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { WorkflowTemplateSchema } from '../src/lib/templates.schema'

export function validateWorkflowTemplates() {
  const workflowsDir = join(process.cwd(), 'data/workflows')
  const files = readdirSync(workflowsDir).filter(f => f.endsWith('.json'))

  let hasErrors = false

  for (const file of files) {
    try {
      const content = readFileSync(join(workflowsDir, file), 'utf-8')
      const template = JSON.parse(content)

      const result = WorkflowTemplateSchema.safeParse(template)
      if (!result.success) {
        console.error(`❌ ${file}: Validation failed`)
        console.error(result.error.format())
        hasErrors = true
      } else {
        console.log(`✅ ${file}: Valid`)
      }
    } catch (error) {
      console.error(`❌ ${file}: Parse error - ${error}`)
      hasErrors = true
    }
  }

  if (hasErrors) {
    process.exit(1)
  }
}
```

### Template Registry Management

#### Template Loading System

```typescript
// src/lib/templates.fs.ts
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { WorkflowTemplate, WorkflowTemplateSchema } from './templates.schema'

export class TemplateRegistry {
  private templates = new Map<string, WorkflowTemplate>()
  private initialized = false

  async initialize() {
    if (this.initialized) return

    const workflowsDir = join(process.cwd(), 'data/workflows')
    const files = readdirSync(workflowsDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const content = readFileSync(join(workflowsDir, file), 'utf-8')
        const template = JSON.parse(content)

        const validated = WorkflowTemplateSchema.parse(template)
        const slug = file.replace('.json', '')

        this.templates.set(slug, validated)
      } catch (error) {
        console.error(`Failed to load template ${file}:`, error)
      }
    }

    this.initialized = true
  }

  getTemplate(slug: string): WorkflowTemplate | null {
    return this.templates.get(slug) || null
  }

  getAllTemplates(): Map<string, WorkflowTemplate> {
    return new Map(this.templates)
  }

  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category)
  }
}

export const templateRegistry = new TemplateRegistry()
```

### Model Requirement Detection

#### Model Inference from Workflow

```typescript
// src/lib/workflow.preflight.ts
export interface ModelRequirement {
  type: 'checkpoint' | 'lora' | 'vae' | 'clip' | 'unet'
  filename: string
  s3Key: string
  workerPath: string
  required: boolean
}

export function inferModelRequirements(workflow: WorkflowObject): ModelRequirement[] {
  const requirements: ModelRequirement[] = []

  for (const [nodeId, node] of Object.entries(workflow)) {
    // Checkpoint models
    if (node.class_type === 'CheckpointLoaderSimple') {
      requirements.push({
        type: 'checkpoint',
        filename: node.inputs.ckpt_name,
        s3Key: `models/checkpoints/${node.inputs.ckpt_name}`,
        workerPath: `/runpod-volume/models/checkpoints/${node.inputs.ckpt_name}`,
        required: true
      })
    }

    // LoRA models
    if (node.class_type === 'LoraLoader') {
      requirements.push({
        type: 'lora',
        filename: node.inputs.lora_name,
        s3Key: `models/loras/${node.inputs.lora_name}`,
        workerPath: `/runpod-volume/models/loras/${node.inputs.lora_name}`,
        required: true
      })
    }

    // VAE models
    if (node.class_type === 'VAELoader') {
      requirements.push({
        type: 'vae',
        filename: node.inputs.vae_name,
        s3Key: `models/vae/${node.inputs.vae_name}`,
        workerPath: `/runpod-volume/models/vae/${node.inputs.vae_name}`,
        required: true
      })
    }

    // Add more model types as needed...
  }

  // Remove duplicates
  const uniqueRequirements = requirements.filter(
    (req, index, arr) => arr.findIndex(r => r.s3Key === req.s3Key) === index
  )

  return uniqueRequirements
}
```

### Video Workflow Support

#### Video-Specific Template Structure

```json
{
  "name": "Text to Video - AnimateDiff",
  "description": "Generate short videos from text prompts",
  "category": "video-generation",
  "outputType": "video",
  "parameters": {
    "prompt": {
      "type": "string",
      "label": "Prompt",
      "description": "Text description of the video to generate",
      "default": "A cat walking through a garden"
    },
    "frames": {
      "type": "number",
      "label": "Frame Count",
      "description": "Number of frames to generate",
      "default": 16,
      "min": 8,
      "max": 64,
      "step": 8
    },
    "fps": {
      "type": "number",
      "label": "FPS",
      "description": "Frames per second",
      "default": 8,
      "min": 1,
      "max": 30
    }
  },
  "workflow": {
    // Video-specific ComfyUI nodes...
  }
}
```

### Template Creation Guidelines

#### Workflow Export Process

1. Create workflow in ComfyUI interface
2. Enable "Dev mode Options" in ComfyUI settings
3. Use "Save (API Format)" to export JSON
4. Add template metadata and parameter definitions
5. Replace hardcoded values with `{{parameter}}` placeholders
6. Validate with schema before committing

#### Parameter Design Best Practices

```json
{
  "parameters": {
    // Use descriptive parameter names
    "main_prompt": {
      // Not just "prompt"
      "type": "string",
      "label": "Main Prompt",
      "description": "Primary text description for image generation"
    },

    // Provide reasonable defaults
    "image_width": {
      "type": "number",
      "default": 512, // Safe default
      "min": 256,
      "max": 2048,
      "step": 64 // GPU-friendly increments
    },

    // Group related parameters with prefixes
    "advanced_cfg_scale": {
      "type": "number",
      "label": "CFG Scale (Advanced)",
      "description": "Classifier-free guidance scale - higher values follow prompt more closely",
      "default": 7.5,
      "min": 1.0,
      "max": 20.0,
      "step": 0.5
    }
  }
}
```

### Template Testing and Validation

#### Automated Template Testing

```typescript
// src/__tests__/templates.test.ts
import { templateRegistry } from '@/lib/templates.fs'
import { patchWorkflowParameters, inferModelRequirements } from '@/lib/workflow.preflight'

describe('Workflow Templates', () => {
  beforeAll(async () => {
    await templateRegistry.initialize()
  })

  test('all templates should be valid', () => {
    const templates = templateRegistry.getAllTemplates()
    expect(templates.size).toBeGreaterThan(0)

    for (const [slug, template] of templates) {
      expect(template.name).toBeTruthy()
      expect(template.workflow).toBeTruthy()
      expect(template.parameters).toBeTruthy()
    }
  })

  test('parameter patching should work correctly', () => {
    const template = templateRegistry.getTemplate('text-to-image')
    expect(template).toBeTruthy()

    const parameters = {
      prompt: 'test prompt',
      width: 512,
      height: 512
    }

    const patchedWorkflow = patchWorkflowParameters(template!.workflow, parameters)
    const workflowStr = JSON.stringify(patchedWorkflow)

    expect(workflowStr).toContain('test prompt')
    expect(workflowStr).not.toContain('{{prompt}}')
  })
})
```

### Template Documentation Requirements

#### Template README Structure

```markdown
# Workflow Templates

## Available Templates

### Image Generation

- `text-to-image.json` - Basic text-to-image generation
- `text-to-image-advanced.json` - Advanced options with LoRA support

### Video Generation

- `text-to-video.json` - Basic text-to-video generation
- `image-to-video.json` - Convert static images to videos

## Adding New Templates

1. Create workflow in ComfyUI
2. Export in API format
3. Add template metadata
4. Validate with `npm run validate-workflows`
5. Test parameter substitution
6. Document in this README

## Parameter Guidelines

- Use descriptive parameter names
- Provide reasonable defaults
- Include min/max ranges for numbers
- Add helpful descriptions for users
```

### Error Handling for Templates

#### Template Loading Error Handling

```typescript
export async function loadTemplate(slug: string): Promise<WorkflowTemplate> {
  try {
    const template = templateRegistry.getTemplate(slug)
    if (!template) {
      throw new Error(`Template '${slug}' not found`)
    }
    return template
  } catch (error) {
    console.error(`Failed to load template ${slug}:`, error)
    throw new Error(`Template loading failed: ${error.message}`)
  }
}
```

#### Parameter Validation Error Handling

```typescript
export function validateParameters(
  template: WorkflowTemplate,
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [key, paramDef] of Object.entries(template.parameters)) {
    const value = parameters[key]

    // Check required parameters
    if (value === undefined && paramDef.default === undefined) {
      errors.push(`Missing required parameter: ${key}`)
      continue
    }

    // Type validation
    const actualValue = value ?? paramDef.default
    if (paramDef.type === 'number' && typeof actualValue !== 'number') {
      errors.push(`Parameter '${key}' must be a number`)
    }

    // Range validation for numbers
    if (paramDef.type === 'number' && typeof actualValue === 'number') {
      if (paramDef.min !== undefined && actualValue < paramDef.min) {
        errors.push(`Parameter '${key}' must be >= ${paramDef.min}`)
      }
      if (paramDef.max !== undefined && actualValue > paramDef.max) {
        errors.push(`Parameter '${key}' must be <= ${paramDef.max}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
```

Refer to [ComfyUI documentation](https://github.com/comfyanonymous/ComfyUI) for workflow creation and [template examples](../../data/workflows/) for reference implementations.
