/**
 * RunPod Retry Logic Implementation
 *
 * Provides robust retry mechanisms with exponential backoff
 * for handling RunPod API failures and timeouts
 */

import type { RetryConfig } from './runpod.config'

export interface RetryError extends Error {
  attempt: number
  lastError: Error
  allErrors: Error[]
}

export interface RetryMetrics {
  totalAttempts: number
  totalDuration: number
  errors: Error[]
  success: boolean
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate backoff delay with exponential backoff and jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.backoffMs * Math.pow(config.backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, config.maxBackoffMs)

  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5)

  return Math.max(0, cappedDelay + jitter)
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Network errors that should be retried
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('enotfound')
  ) {
    return true
  }

  // HTTP status codes that should be retried
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('429')
  ) {
    // Rate limiting
    return true
  }

  // RunPod-specific errors that should be retried
  if (
    message.includes('worker not available') ||
    message.includes('endpoint overloaded') ||
    message.includes('temporary failure')
  ) {
    return true
  }

  return false
}

/**
 * Execute a function with retry logic and timeout
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  operationName = 'RunPod operation'
): Promise<T> {
  const errors: Error[] = []

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation()

      // Log successful retry if this wasn't the first attempt
      if (attempt > 1) {
        console.log(`[RunPod Retry] ${operationName} succeeded on attempt ${attempt}/${config.maxAttempts}`)
      }

      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      errors.push(err)

      console.warn(`[RunPod Retry] ${operationName} failed on attempt ${attempt}/${config.maxAttempts}:`, err.message)

      // Don't retry on last attempt or non-retryable errors
      if (attempt === config.maxAttempts || !isRetryableError(err)) {
        const retryError: RetryError = new Error(
          `${operationName} failed after ${attempt} attempts: ${err.message}`
        ) as RetryError
        retryError.attempt = attempt
        retryError.lastError = err
        retryError.allErrors = errors
        throw retryError
      }

      // Calculate and apply backoff delay
      const backoffMs = calculateBackoff(attempt, config)
      console.log(`[RunPod Retry] Waiting ${backoffMs}ms before retry ${attempt + 1}/${config.maxAttempts}`)
      await sleep(backoffMs)
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error(`${operationName} failed after all retry attempts`)
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName = 'RunPod operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([operation(), timeoutPromise])
}

/**
 * Execute a function with both retry logic and timeout
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  timeoutMs: number,
  operationName = 'RunPod operation'
): Promise<T> {
  return withRetry(() => withTimeout(operation, timeoutMs, operationName), config, operationName)
}

/**
 * Create a fetch wrapper with timeout
 */
export function createTimeoutFetch(timeoutMs: number) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
