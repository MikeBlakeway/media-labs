/**
 * RunPod Configuration Management
 *
 * Centralized configuration for timeouts, retries, and environment settings
 * following RunPod best practices from docs/runpod/
 */

function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[RunPod Config] Missing one of: ${names.join(', ')}`)
}

function optionalInt(name: string, defaultValue: number): number {
  const value = process.env[name]
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

function optionalBool(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

// Log levels supported by RunPod
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

/**
 * RunPod Environment Configuration
 * Organized by function following best practices
 */
export const RunPodConfig = {
  // API Configuration
  api: {
    key: () => req('RUNPOD_API_KEY'),
    baseUrl: process.env.RUNPOD_API_BASE_URL ?? 'https://api.runpod.ai/v2'
  },

  // Endpoint Configuration
  endpoints: {
    primary: () => req('RUNPOD_ENDPOINT_ID'),
    fallback: process.env.RUNPOD_FALLBACK_ENDPOINT_ID
  },

  // Timeout Configuration (in milliseconds)
  timeouts: {
    sync: optionalInt('RUNPOD_SYNC_TIMEOUT_MS', 90000), // 90 seconds (RunPod default)
    async: optionalInt('RUNPOD_ASYNC_TIMEOUT_MS', 300000), // 5 minutes for long tasks
    status: optionalInt('RUNPOD_STATUS_TIMEOUT_MS', 10000), // 10 seconds for status checks
    cancel: optionalInt('RUNPOD_CANCEL_TIMEOUT_MS', 15000) // 15 seconds for cancellation
  },

  // Retry Configuration
  retries: {
    maxAttempts: optionalInt('RUNPOD_MAX_RETRIES', 3),
    backoffMs: optionalInt('RUNPOD_RETRY_BACKOFF_MS', 1000),
    backoffMultiplier: optionalInt('RUNPOD_RETRY_BACKOFF_MULTIPLIER', 2),
    maxBackoffMs: optionalInt('RUNPOD_MAX_BACKOFF_MS', 30000)
  },

  // Local Development Configuration
  local: {
    enabled: optionalBool('USE_LOCAL_WORKER', false),
    url: process.env.LOCAL_WORKER_URL ?? 'http://localhost:8000',
    port: optionalInt('LOCAL_WORKER_PORT', 8000),
    logLevel: (process.env.RUNPOD_LOG_LEVEL ?? 'INFO') as LogLevel,
    verbose: optionalBool('RUNPOD_VERBOSE', false)
  },

  // S3 Storage Configuration (existing pattern)
  storage: {
    bucket: () => req('RUNPOD_VOLUME_ID'),
    region: () => req('RUNPOD_S3_REGION'),
    endpoint: () => req('RUNPOD_S3_ENDPOINT'),
    accessKeyId: () => req('RUNPOD_S3_ACCESS_KEY_ID'),
    secretAccessKey: () => req('RUNPOD_S3_SECRET_ACCESS_KEY')
  },

  // Webhook Configuration
  webhooks: {
    secret: process.env.RUNPOD_WEBHOOK_SECRET,
    url: process.env.RUNPOD_WEBHOOK_URL,
    enabled: optionalBool('RUNPOD_WEBHOOKS_ENABLED', false)
  }
} as const

/**
 * Retry configuration for specific operation types
 */
export interface RetryConfig {
  maxAttempts: number
  backoffMs: number
  backoffMultiplier: number
  maxBackoffMs: number
}

/**
 * Get retry configuration for a specific operation
 */
export function getRetryConfig(operation: 'sync' | 'async' | 'status' | 'cancel' = 'async'): RetryConfig {
  const base = RunPodConfig.retries

  // Customize retry behavior per operation type
  switch (operation) {
    case 'sync':
      return { ...base, maxAttempts: Math.min(base.maxAttempts, 2) } // Fewer retries for sync
    case 'status':
      return { ...base, maxAttempts: Math.min(base.maxAttempts, 5), backoffMs: 500 } // More frequent, shorter backoff
    case 'cancel':
      return { ...base, maxAttempts: 1 } // Don't retry cancellation
    case 'async':
    default:
      return base
  }
}

/**
 * Get timeout for a specific operation
 */
export function getTimeout(operation: 'sync' | 'async' | 'status' | 'cancel' = 'async'): number {
  switch (operation) {
    case 'sync':
      return RunPodConfig.timeouts.sync
    case 'status':
      return RunPodConfig.timeouts.status
    case 'cancel':
      return RunPodConfig.timeouts.cancel
    case 'async':
    default:
      return RunPodConfig.timeouts.async
  }
}

/**
 * Validate required environment variables on startup
 */
export function validateRunPodConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    // Test required API configuration
    RunPodConfig.api.key()
    RunPodConfig.endpoints.primary()

    // Test required storage configuration if not using local worker
    if (!RunPodConfig.local.enabled) {
      RunPodConfig.storage.bucket()
      RunPodConfig.storage.region()
      RunPodConfig.storage.endpoint()
      RunPodConfig.storage.accessKeyId()
      RunPodConfig.storage.secretAccessKey()
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message)
    }
  }

  // Validate timeout values
  if (RunPodConfig.timeouts.sync < 1000) {
    errors.push('RUNPOD_SYNC_TIMEOUT_MS must be at least 1000ms')
  }

  if (RunPodConfig.retries.maxAttempts < 1) {
    errors.push('RUNPOD_MAX_RETRIES must be at least 1')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
