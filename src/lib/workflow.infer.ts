import { z } from 'zod'
import type { FieldSpec, WorkflowTemplate } from './templates.types'

export const ExportApiNodeSchema = z
  .object({
    class_type: z.string(),
    inputs: z.record(z.string(), z.unknown())
  })
  .catchall(z.unknown())

export type ExportApiNode = z.infer<typeof ExportApiNodeSchema>

export const ExportApiWorkflowSchema = z.record(z.string(), ExportApiNodeSchema)
export type ExportApiWorkflow = z.infer<typeof ExportApiWorkflowSchema>

const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number'

export function inferFieldsFromExportApi(workflow: ExportApiWorkflow): FieldSpec[] {
  const fields: FieldSpec[] = []

  for (const [nodeId, node] of Object.entries(workflow)) {
    const classType = node.class_type
    const inputs = node.inputs

    // 1) Image loaders
    if (classType.includes('LoadImageFromPath') || classType === 'LoadImage' || classType.includes('LoadImage')) {
      // Prefer a path-like key if present; otherwise fall back to 'path'
      const candidateKeys = ['image', 'path', 'image_path', 'url_or_path']
      const key = candidateKeys.find(k => k in inputs) ?? 'path'
      fields.push({
        id: `file_${nodeId}_${key}`,
        label: 'Input image',
        type: 'file',
        required: true,
        nodeId,
        inputKey: key,
        help: classType.includes('LoadImageFromPath')
          ? undefined
          : 'Ensure a path-capable loader node is available on the worker'
      })
      continue
    }

    // 1b) Video loaders (V2V support)
    if (classType === 'LoadVideo' || classType.includes('LoadVideo') || classType.includes('VideoLoader')) {
      // Prefer a path-like key if present; otherwise fall back to 'video'
      const candidateKeys = ['video', 'path', 'video_path', 'url_or_path']
      const key = candidateKeys.find(k => k in inputs) ?? 'video'
      fields.push({
        id: `file_${nodeId}_${key}`,
        label: 'Input video',
        type: 'file',
        required: true,
        nodeId,
        inputKey: key,
        help: 'Upload the video file to process'
      })
      continue
    }

    // 2) Prompt encoders
    if (classType === 'CLIPTextEncode') {
      const def = inputs['text']
      fields.push({
        id: `text_${nodeId}_text`,
        label: 'Prompt',
        type: 'text',
        required: true,
        defaultValue: isString(def) ? def : undefined,
        nodeId,
        inputKey: 'text'
      })
      continue
    }

    // 3) Checkpoint loader
    if (classType === 'CheckpointLoaderSimple') {
      const def = inputs['ckpt_name']
      fields.push({
        id: `ckpt_${nodeId}_ckpt_name`,
        label: 'Checkpoint (ckpt_name)',
        type: 'string',
        required: true,
        defaultValue: isString(def) ? def : undefined,
        nodeId,
        inputKey: 'ckpt_name'
      })
      continue
    }

    // 4) LoRA loader
    if (classType === 'LoraLoader') {
      const nameVal = inputs['lora_name'] ?? inputs['model']
      const strengthModel = inputs['strength_model']
      const strengthClip = inputs['strength_clip']

      fields.push({
        id: `lora_${nodeId}_name`,
        label: 'LoRA name',
        type: 'string',
        required: true,
        defaultValue: isString(nameVal) ? nameVal : undefined,
        nodeId,
        inputKey: isString(inputs['lora_name']) ? 'lora_name' : 'model'
      })
      fields.push({
        id: `lora_${nodeId}_strength_model`,
        label: 'LoRA strength (model)',
        type: 'number',
        required: true,
        defaultValue: isNumber(strengthModel) ? strengthModel : 0.8,
        nodeId,
        inputKey: 'strength_model'
      })
      fields.push({
        id: `lora_${nodeId}_strength_clip`,
        label: 'LoRA strength (clip)',
        type: 'number',
        required: true,
        defaultValue: isNumber(strengthClip) ? strengthClip : 1.0,
        nodeId,
        inputKey: 'strength_clip'
      })
      continue
    }

    // 5) KSampler
    if (classType === 'KSampler') {
      const seed = inputs['seed']
      const steps = inputs['steps']
      const cfg = inputs['cfg']
      const sampler = inputs['sampler_name']
      const scheduler = inputs['scheduler']
      const denoise = inputs['denoise']

      fields.push({
        id: `ks_${nodeId}_seed`,
        label: 'Seed',
        type: 'integer',
        required: false,
        defaultValue: isNumber(seed) ? seed : undefined,
        nodeId,
        inputKey: 'seed'
      })
      fields.push({
        id: `ks_${nodeId}_steps`,
        label: 'Steps',
        type: 'integer',
        required: true,
        defaultValue: isNumber(steps) ? steps : 20,
        nodeId,
        inputKey: 'steps'
      })
      fields.push({
        id: `ks_${nodeId}_cfg`,
        label: 'CFG',
        type: 'number',
        required: true,
        defaultValue: isNumber(cfg) ? cfg : 8,
        nodeId,
        inputKey: 'cfg'
      })
      fields.push({
        id: `ks_${nodeId}_sampler`,
        label: 'Sampler',
        type: 'string',
        required: true,
        defaultValue: isString(sampler) ? sampler : 'euler',
        nodeId,
        inputKey: 'sampler_name'
      })
      fields.push({
        id: `ks_${nodeId}_scheduler`,
        label: 'Scheduler',
        type: 'string',
        required: true,
        defaultValue: isString(scheduler) ? scheduler : 'normal',
        nodeId,
        inputKey: 'scheduler'
      })
      fields.push({
        id: `ks_${nodeId}_denoise`,
        label: 'Denoise',
        type: 'number',
        required: false,
        defaultValue: isNumber(denoise) ? denoise : 1,
        nodeId,
        inputKey: 'denoise'
      })
      continue
    }

    // 6) Latent dimensions
    if (classType === 'EmptyLatentImage') {
      const width = inputs['width']
      const height = inputs['height']
      const batch = inputs['batch_size']
      fields.push({
        id: `eli_${nodeId}_width`,
        label: 'Width',
        type: 'integer',
        required: true,
        defaultValue: isNumber(width) ? width : 512,
        nodeId,
        inputKey: 'width'
      })
      fields.push({
        id: `eli_${nodeId}_height`,
        label: 'Height',
        type: 'integer',
        required: true,
        defaultValue: isNumber(height) ? height : 512,
        nodeId,
        inputKey: 'height'
      })
      fields.push({
        id: `eli_${nodeId}_batch`,
        label: 'Batch size',
        type: 'integer',
        required: false,
        defaultValue: isNumber(batch) ? batch : 1,
        nodeId,
        inputKey: 'batch_size'
      })
      continue
    }

    // 7) Save nodes
    if (classType === 'SaveImage' || classType === 'SaveVideo' || classType.includes('Save')) {
      const prefix = inputs['filename_prefix']
      fields.push({
        id: `save_${nodeId}_prefix`,
        label: 'Filename prefix',
        type: 'string',
        required: false,
        defaultValue: isString(prefix) ? prefix : 'MediaLabs',
        nodeId,
        inputKey: 'filename_prefix'
      })
      continue
    }
  }

  // Deduplicate ids
  const seen = new Set<string>()
  return fields.filter(f => {
    if (seen.has(f.id)) return false
    seen.add(f.id)
    return true
  })
}

export function makeTemplate(slug: string, name: string, workflow: ExportApiWorkflow): WorkflowTemplate {
  const fields = inferFieldsFromExportApi(workflow)
  return { slug, name, workflow, fields, createdAt: Date.now() }
}
