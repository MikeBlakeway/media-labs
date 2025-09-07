import { z } from 'zod'
import type { ExportApiWorkflow } from './workflow.infer'

const DIRS = {
  unet: process.env.RUNPOD_MODEL_DIR_UNET ?? 'unet',
  clip: process.env.RUNPOD_MODEL_DIR_CLIP ?? 'clip',
  clip_vision: process.env.RUNPOD_MODEL_DIR_CLIP_VISION ?? 'clip_vision',
  vae: process.env.RUNPOD_MODEL_DIR_VAE ?? 'vae',
  lora: process.env.RUNPOD_MODEL_DIR_LORA ?? 'loras',
  checkpoints: process.env.RUNPOD_MODEL_DIR_CHECKPOINTS ?? 'checkpoints'
} as const

/** The model “kinds” we can validate against /models/<dir>/... */
export const ModelTypeSchema = z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints'])
export type ModelType = z.infer<typeof ModelTypeSchema>

export const ModelRequirementSchema = z.object({
  nodeId: z.string(),
  classType: z.string(),
  type: ModelTypeSchema,
  name: z.string()
})
export type ModelRequirement = z.infer<typeof ModelRequirementSchema>

export const ModelPresenceSchema = ModelRequirementSchema.extend({
  present: z.boolean(),
  s3Key: z.string(),
  workerPath: z.string()
})
export type ModelPresence = z.infer<typeof ModelPresenceSchema>

/** Map Comfy node class_type → (inputKey, modelType) to extract required model names */
const NODE_MODEL_MAP: Array<{
  classType: string | RegExp
  inputKey: string
  modelType: ModelType
}> = [
  { classType: 'UNETLoader', inputKey: 'unet_name', modelType: 'unet' },
  { classType: 'CLIPLoader', inputKey: 'clip_name', modelType: 'clip' },
  { classType: 'CLIPVisionLoader', inputKey: 'clip_name', modelType: 'clip_vision' },
  { classType: 'VAELoader', inputKey: 'vae_name', modelType: 'vae' },
  { classType: 'LoraLoader', inputKey: 'lora_name', modelType: 'lora' },
  { classType: 'CheckpointLoaderSimple', inputKey: 'ckpt_name', modelType: 'checkpoints' }
]

export const ModelDirByType: Record<ModelType, string> = {
  unet: DIRS.unet,
  clip: DIRS.clip,
  clip_vision: DIRS.clip_vision,
  vae: DIRS.vae,
  lora: DIRS.lora,
  checkpoints: DIRS.checkpoints
}

/** Extract required model names by scanning nodes’ inputs. */
export function inferModelRequirements(workflow: ExportApiWorkflow): ModelRequirement[] {
  const out: ModelRequirement[] = []
  for (const [nodeId, node] of Object.entries(workflow)) {
    for (const rule of NODE_MODEL_MAP) {
      const match =
        typeof rule.classType === 'string' ? node.class_type === rule.classType : rule.classType.test(node.class_type)
      if (!match) continue
      const raw = node.inputs[rule.inputKey]
      if (typeof raw === 'string' && raw.trim().length > 0) {
        out.push({
          nodeId,
          classType: node.class_type,
          type: rule.modelType,
          name: raw.trim()
        })
      }
    }
  }
  const seen = new Set<string>()
  return out.filter(req => {
    const key = `${req.nodeId}:${req.type}:${req.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Build the S3 key and worker path for a model file under the standard models/ layout. */
export function modelPaths(modelPrefix: string, req: ModelRequirement): { s3Key: string; workerPath: string } {
  const dir = ModelDirByType[req.type]
  const base = modelPrefix.replace(/\/+$/, '')
  const key = `${base}/${dir}/${req.name}`
  const workerPath = `/runpod-volume/${key}`
  return { s3Key: key, workerPath }
}
