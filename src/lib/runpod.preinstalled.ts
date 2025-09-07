/**
 * Pre-installed models in RunPod ComfyUI Docker image variants
 *
 * Based on runpod-workers/runpod-worker-comfy repository documentation
 * Each variant has specific models pre-installed in the Docker image
 */

export interface PreinstalledModel {
  name: string
  type: 'unet' | 'clip' | 'clip_vision' | 'vae' | 'lora' | 'checkpoints'
  workerPath: string
}

export interface RunPodVariant {
  tag: string
  description: string
  models: PreinstalledModel[]
}

export const RUNPOD_VARIANTS: Record<string, RunPodVariant> = {
  base: {
    tag: '3.4.0-base',
    description: 'ComfyUI base with no pre-installed models',
    models: []
  },
  sdxl: {
    tag: '3.4.0-sdxl',
    description: 'SDXL models',
    models: [
      {
        name: 'sd_xl_base_1.0.safetensors',
        type: 'checkpoints',
        workerPath: '/runpod-volume/models/checkpoints/sd_xl_base_1.0.safetensors'
      },
      {
        name: 'sdxl_vae.safetensors',
        type: 'vae',
        workerPath: '/runpod-volume/models/vae/sdxl_vae.safetensors'
      },
      {
        name: 'sdxl-vae-fp16-fix.safetensors',
        type: 'vae',
        workerPath: '/runpod-volume/models/vae/sdxl-vae-fp16-fix.safetensors'
      }
    ]
  },
  sd3: {
    tag: '3.4.0-sd3',
    description: 'Stable Diffusion 3 models',
    models: [
      {
        name: 'sd3_medium_incl_clips_t5xxlfp8.safetensors',
        type: 'checkpoints',
        workerPath: '/runpod-volume/models/checkpoints/sd3_medium_incl_clips_t5xxlfp8.safetensors'
      }
    ]
  },
  'flux1-schnell': {
    tag: '3.4.0-flux1-schnell',
    description: 'FLUX.1 Schnell models',
    models: [
      {
        name: 'flux1-schnell.safetensors',
        type: 'unet',
        workerPath: '/runpod-volume/models/diffusion_models/flux1-schnell.safetensors'
      },
      {
        name: 'clip_l.safetensors',
        type: 'clip',
        workerPath: '/runpod-volume/models/clip/clip_l.safetensors'
      },
      {
        name: 't5xxl_fp8_e4m3fn.safetensors',
        type: 'clip',
        workerPath: '/runpod-volume/models/clip/t5xxl_fp8_e4m3fn.safetensors'
      },
      {
        name: 'ae.safetensors',
        type: 'vae',
        workerPath: '/runpod-volume/models/vae/ae.safetensors'
      }
    ]
  },
  'flux1-dev': {
    tag: '3.4.0-flux1-dev',
    description: 'FLUX.1 Dev models',
    models: [
      {
        name: 'flux1-dev.safetensors',
        type: 'unet',
        workerPath: '/runpod-volume/models/diffusion_models/flux1-dev.safetensors'
      },
      {
        name: 'clip_l.safetensors',
        type: 'clip',
        workerPath: '/runpod-volume/models/clip/clip_l.safetensors'
      },
      {
        name: 't5xxl_fp8_e4m3fn.safetensors',
        type: 'clip',
        workerPath: '/runpod-volume/models/clip/t5xxl_fp8_e4m3fn.safetensors'
      },
      {
        name: 'ae.safetensors',
        type: 'vae',
        workerPath: '/runpod-volume/models/vae/ae.safetensors'
      }
    ]
  }
}

/**
 * Get the pre-installed models for a specific RunPod variant
 */
export function getPreinstalledModels(variant: string): PreinstalledModel[] {
  const variantConfig = RUNPOD_VARIANTS[variant]
  return variantConfig?.models || []
}

/**
 * Check if a model is pre-installed in the specified RunPod variant
 */
export function isModelPreinstalled(modelName: string, variant: string): boolean {
  const models = getPreinstalledModels(variant)
  return models.some(model => model.name === modelName)
}

/**
 * Get all pre-installed model names for a variant
 */
export function getPreinstalledModelNames(variant: string): string[] {
  return getPreinstalledModels(variant).map(model => model.name)
}

/**
 * Auto-detect RunPod variant from environment or endpoint configuration
 * This is a placeholder - in practice, you'd determine this from your RunPod endpoint setup
 */
export function detectRunPodVariant(): string {
  // Check if there's an explicit variant configured
  const configuredVariant = process.env.RUNPOD_VARIANT
  if (configuredVariant && RUNPOD_VARIANTS[configuredVariant]) {
    return configuredVariant
  }

  // For now, default to flux1-dev since that's what the workflow expects
  // In a real implementation, you might:
  // 1. Query the RunPod API to get endpoint details
  // 2. Parse the Docker image name from endpoint configuration
  // 3. Map image tag to variant name
  return 'flux1-dev'
}
