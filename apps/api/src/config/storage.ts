import { z } from 'zod'

// B2 Storage configuration schema
export const StorageConfigSchema = z.object({
  endpoint: z.string().url('B2 endpoint must be a valid URL'),
  region: z.string().min(1, 'B2 region is required'),
  bucket: z.string().min(1, 'B2 bucket name is required'),
  accessKeyId: z.string().min(1, 'B2 access key ID is required'),
  secretAccessKey: z.string().min(1, 'B2 secret access key is required'),
})

// Additional configuration for the application
export const AppConfigSchema = z.object({
  publicBaseUrl: z.string().url('Public base URL must be a valid URL'),
  callbackSecret: z.string().min(1, 'Callback secret is required for HMAC verification'),
})

// Combined storage configuration type
export type StorageConfig = z.infer<typeof StorageConfigSchema>
export type AppConfig = z.infer<typeof AppConfigSchema>

/**
 * Load and validate B2 storage configuration from environment variables
 * @returns Validated storage configuration
 * @throws Error if configuration is invalid or missing in cloud mode
 */
export function loadStorageConfig(): StorageConfig | null {
  const videoRunMode = process.env.VIDEO_RUN_MODE

  // If not in cloud mode, return null (B2 storage not needed)
  if (videoRunMode !== 'cloud') {
    return null
  }

  const config = {
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    bucket: process.env.B2_BUCKET,
    accessKeyId: process.env.B2_ACCESS_KEY_ID,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
  }

  try {
    return StorageConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.issues.map(issue => issue.path.join('.')).join(', ')
      throw new Error(
        `B2 storage configuration validation failed in cloud mode. Missing or invalid fields: ${missingFields}. ` +
        'Please ensure B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_ACCESS_KEY_ID, and B2_SECRET_ACCESS_KEY are set.'
      )
    }
    throw error
  }
}

/**
 * Load and validate application configuration from environment variables
 * @returns Validated application configuration
 * @throws Error if configuration is invalid or missing in cloud mode
 */
export function loadAppConfig(): AppConfig | null {
  const videoRunMode = process.env.VIDEO_RUN_MODE

  // If not in cloud mode, return null (app config not needed)
  if (videoRunMode !== 'cloud') {
    return null
  }

  const config = {
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    callbackSecret: process.env.CALLBACK_SECRET,
  }

  try {
    return AppConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.issues.map(issue => issue.path.join('.')).join(', ')
      throw new Error(
        `Application configuration validation failed in cloud mode. Missing or invalid fields: ${missingFields}. ` +
        'Please ensure PUBLIC_BASE_URL and CALLBACK_SECRET are set.'
      )
    }
    throw error
  }
}

/**
 * Validate that storage and app configuration is available when running in cloud mode
 * Should be called during application startup
 */
export function validateStorageConfig(): void {
  const videoRunMode = process.env.VIDEO_RUN_MODE

  if (videoRunMode === 'cloud') {
    try {
      const storageConfig = loadStorageConfig()
      const appConfig = loadAppConfig()
      
      if (!storageConfig) {
        throw new Error('Storage configuration is required in cloud mode but could not be loaded')
      }
      if (!appConfig) {
        throw new Error('Application configuration is required in cloud mode but could not be loaded')
      }
      
      console.log('✅ Storage and application configuration validated successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Storage/App configuration validation failed:', message)
      process.exit(1)
    }
  } else {
    console.log(`ℹ️  Video run mode: ${videoRunMode || 'local_fake'} - Storage configuration not required`)
  }
}