import { z } from 'zod'

// RunPod configuration schema
export const RunPodConfigSchema = z.object({
  apiKey: z.string().min(1, 'RunPod API key is required'),
  endpointId: z.string().min(1, 'RunPod endpoint ID is required'),
  region: z.string().min(1, 'RunPod region is required').optional(),
})

// RunPod configuration type
export type RunPodConfig = z.infer<typeof RunPodConfigSchema>

/**
 * Load and validate RunPod configuration from environment variables
 * @returns Validated RunPod configuration
 * @throws Error if configuration is invalid or missing in cloud mode
 */
export function loadRunPodConfig(): RunPodConfig | null {
  const videoRunMode = process.env.VIDEO_RUN_MODE

  // If not in cloud mode, return null (RunPod not needed)
  if (videoRunMode !== 'cloud') {
    return null
  }

  const config = {
    apiKey: process.env.RUNPOD_API_KEY,
    endpointId: process.env.RUNPOD_ENDPOINT_ID,
    region: process.env.RUNPOD_REGION,
  }

  try {
    return RunPodConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.issues.map(issue => issue.path.join('.')).join(', ')
      throw new Error(
        `RunPod configuration validation failed in cloud mode. Missing or invalid fields: ${missingFields}. ` +
        'Please ensure RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, and RUNPOD_REGION are set.'
      )
    }
    throw error
  }
}

/**
 * Validate that RunPod configuration is available when running in cloud mode
 * Should be called during application startup
 */
export function validateRunPodConfig(): void {
  const videoRunMode = process.env.VIDEO_RUN_MODE

  if (videoRunMode === 'cloud') {
    try {
      const config = loadRunPodConfig()
      if (!config) {
        throw new Error('RunPod configuration is required in cloud mode but could not be loaded')
      }
      console.log('✅ RunPod configuration validated successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ RunPod configuration validation failed:', message)
      process.exit(1)
    }
  } else {
    console.log(`ℹ️  Video run mode: ${videoRunMode || 'local_fake'} - RunPod configuration not required`)
  }
}