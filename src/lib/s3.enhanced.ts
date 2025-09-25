import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'

/**
 * Enhanced S3 object existence checker with retry logic and caching
 * Addresses network instability and provides more reliable model checking
 */

interface CacheEntry {
  exists: boolean
  timestamp: number
  error?: string
}

// In-memory cache with 5-minute TTL
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, CacheEntry>()

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = Math.min(config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt), config.maxDelayMs)
  // Add jitter (±25% of base delay)
  const jitter = baseDelay * 0.25 * (Math.random() - 0.5)
  return Math.round(baseDelay + jitter)
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const errorObj = error as Record<string, unknown>

  // Check status codes from response
  const rawResp = errorObj['$response']
  if (rawResp && typeof rawResp === 'object') {
    const statusCode = (rawResp as Record<string, unknown>)['statusCode']
    if (typeof statusCode === 'number' && (statusCode >= 500 || statusCode === 429)) {
      return true
    }
  }

  const meta = errorObj['$metadata']
  if (meta && typeof meta === 'object') {
    const httpStatusCode = (meta as Record<string, unknown>)['httpStatusCode']
    if (typeof httpStatusCode === 'number' && (httpStatusCode >= 500 || httpStatusCode === 429)) {
      return true
    }
  }

  // Check error codes/names
  const errorCode = errorObj['code'] || errorObj['Code'] || errorObj['name']
  if (typeof errorCode === 'string') {
    const retryableErrors = [
      'ServiceUnavailable',
      'SlowDown',
      'RequestTimeout',
      'NetworkingError',
      'TimeoutError',
      'ConnectionError',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ]
    return retryableErrors.some(retryable => errorCode.includes(retryable))
  }

  return false
}

/**
 * Enhanced S3 object existence check with retry logic and caching
 */
export async function checkS3ObjectExistsWithRetry(
  s3Client: S3Client,
  bucket: string,
  key: string,
  context: string = 'unknown',
  retryConfig: Partial<RetryConfig> = {}
): Promise<{ exists: boolean; error?: string; fromCache: boolean; duration: number }> {
  const startTime = Date.now()
  const cacheKey = `${bucket}/${key}`
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }

  // Check cache first
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      exists: cached.exists,
      error: cached.error,
      fromCache: true,
      duration: Date.now() - startTime
    }
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1, config)
        console.log(`[S3_RETRY] Attempt ${attempt + 1}/${config.maxRetries + 1} for ${key} after ${delay}ms delay`)
        await sleep(delay)
      }

      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key
        })
      )

      // Success - cache the result
      const result = { exists: true, fromCache: false, duration: Date.now() - startTime }
      cache.set(cacheKey, { exists: true, timestamp: Date.now() })
      return result
    } catch (err: unknown) {
      lastError = err

      // Handle status codes from the response/metadata
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>
        const rawResp = errorObj['$response']
        const meta = errorObj['$metadata']

        // Check status from $response first
        let statusCode: number | undefined
        if (rawResp && typeof rawResp === 'object') {
          const statusVal =
            (rawResp as Record<string, unknown>)['statusCode'] ?? (rawResp as Record<string, unknown>)['status']
          if (typeof statusVal === 'number') {
            statusCode = statusVal
          }
        }

        // Fallback to $metadata
        if (statusCode === undefined && meta && typeof meta === 'object') {
          const httpStatusCode =
            (meta as Record<string, unknown>)['httpStatusCode'] ?? (meta as Record<string, unknown>)['statusCode']
          if (typeof httpStatusCode === 'number') {
            statusCode = httpStatusCode
          }
        }

        // Handle specific status codes
        if (statusCode === 404) {
          const result = { exists: false, fromCache: false, duration: Date.now() - startTime }
          cache.set(cacheKey, { exists: false, timestamp: Date.now() })
          return result
        }

        // CRITICAL: Handle deserialization errors - some S3 providers return 200 but throw due to XML parsing issues
        if (statusCode !== undefined && statusCode >= 200 && statusCode < 300) {
          console.log(`[S3_ENHANCED] Deserialization error with HTTP ${statusCode} - treating as success for ${key}`)
          const result = { exists: true, fromCache: false, duration: Date.now() - startTime }
          cache.set(cacheKey, { exists: true, timestamp: Date.now() })
          return result
        }
      }

      // Check if error is retryable
      if (!isRetryableError(err) || attempt === config.maxRetries) {
        // Not retryable or max retries reached
        break
      }

      // Log retry attempt
      const errorObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}
      const rawResp = errorObj['$response']
      const meta = errorObj['$metadata']
      const status =
        rawResp && typeof rawResp === 'object'
          ? (rawResp as Record<string, unknown>)['statusCode']
          : meta && typeof meta === 'object'
          ? (meta as Record<string, unknown>)['httpStatusCode']
          : undefined
      const code = errorObj['code'] || errorObj['Code'] || errorObj['name']
      const message = errorObj['message']

      console.warn(`[S3_RETRY] Retryable error on attempt ${attempt + 1} for ${key}:`, {
        status,
        code,
        message,
        bucket,
        fullError: JSON.stringify(errorObj, null, 2).substring(0, 500)
      })
    }
  }

  // All retries failed - process the last error
  const errorInfo = processS3Error(lastError, bucket, key, context)

  // Cache negative results for shorter time to allow recovery
  cache.set(cacheKey, {
    exists: false,
    timestamp: Date.now(),
    error: errorInfo.error
  })

  // Clean expired cache entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean cache
    cleanExpiredCache()
  }

  return {
    exists: false,
    error: errorInfo.error,
    fromCache: false,
    duration: Date.now() - startTime
  }
}

/**
 * Process S3 error and extract meaningful error information
 */
function processS3Error(err: unknown, bucket: string, key: string, context: string): { error: string } {
  if (!err || typeof err !== 'object') {
    return { error: 'Unknown error' }
  }

  const errorObj = err as Record<string, unknown>

  // Check status codes
  const rawResp = errorObj['$response']
  const meta = errorObj['$metadata']
  const statusCode =
    rawResp && typeof rawResp === 'object'
      ? (rawResp as Record<string, unknown>)['statusCode']
      : meta && typeof meta === 'object'
      ? (meta as Record<string, unknown>)['httpStatusCode']
      : undefined

  if (typeof statusCode === 'number') {
    // Don't log 2xx status codes as failures - these are usually deserialization issues
    if (statusCode >= 200 && statusCode < 300) {
      console.log(`[S3_ENHANCED] HTTP ${statusCode} with error - likely deserialization issue for ${key}`)
      return { error: `HTTP ${statusCode}` }
    }

    console.warn(`S3 HEAD request failed [${context}]`, {
      bucket,
      key,
      status: statusCode,
      source: rawResp && typeof rawResp === 'object' ? '$response.statusCode' : '$metadata.httpStatusCode'
    })
    return { error: `HTTP ${statusCode}` }
  }

  // Check error codes
  const errorCode = errorObj['code'] || errorObj['Code'] || errorObj['name']
  if (typeof errorCode === 'string') {
    if (['NotFound', 'NoSuchKey', 'NotFoundException'].includes(errorCode)) {
      return { error: 'Not found' }
    }
    return { error: errorCode }
  }

  const message = typeof errorObj['message'] === 'string' ? errorObj['message'] : String(err)
  console.error(`S3 HEAD request failed [${context}]`, { bucket, key, message })
  return { error: message }
}

/**
 * Clean expired entries from cache
 */
function cleanExpiredCache(): void {
  const now = Date.now()
  const toDelete: string[] = []

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      toDelete.push(key)
    }
  }

  toDelete.forEach(key => cache.delete(key))

  if (toDelete.length > 0) {
    console.log(`[S3_CACHE] Cleaned ${toDelete.length} expired cache entries`)
  }
}

/**
 * Clear cache for specific key or all entries
 */
export function clearS3Cache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    console.log('[S3_CACHE] Cleared all cache entries')
  } else {
    const toDelete: string[] = []
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        toDelete.push(key)
      }
    }
    toDelete.forEach(key => cache.delete(key))
    console.log(`[S3_CACHE] Cleared ${toDelete.length} cache entries matching "${pattern}"`)
  }
}

/**
 * Get cache statistics for debugging
 */
export function getS3CacheStats(): {
  totalEntries: number
  hitRate: number
  oldestEntry: number
  newestEntry: number
} {
  const now = Date.now()
  let oldest = now
  let newest = 0

  for (const entry of cache.values()) {
    oldest = Math.min(oldest, entry.timestamp)
    newest = Math.max(newest, entry.timestamp)
  }

  return {
    totalEntries: cache.size,
    hitRate: 0, // Would need to track hits vs misses to calculate this
    oldestEntry: oldest === now ? 0 : now - oldest,
    newestEntry: newest === 0 ? 0 : now - newest
  }
}

/**
 * Backward compatibility - wrapper for existing checkS3ObjectExists function
 */
export async function checkS3ObjectExists(
  s3Client: S3Client,
  bucket: string,
  key: string,
  context: string = 'unknown'
): Promise<{ exists: boolean; error?: string }> {
  const result = await checkS3ObjectExistsWithRetry(s3Client, bucket, key, context)
  return {
    exists: result.exists,
    error: result.error
  }
}
