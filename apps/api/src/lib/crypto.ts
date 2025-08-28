import { createHmac } from 'crypto'
import { loadAppConfig } from '../config/storage'

/**
 * Generate HMAC for callback URL security
 * @param data - Data to sign (usually jobId)
 * @returns HMAC hash as hex string
 * @throws Error if callback secret is not configured
 */
export function generateCallbackHmac(data: string): string {
  const appConfig = loadAppConfig()
  
  if (!appConfig) {
    throw new Error('Application configuration not available - ensure VIDEO_RUN_MODE=cloud and config is set')
  }

  const hmac = createHmac('sha256', appConfig.callbackSecret)
  hmac.update(data)
  return hmac.digest('hex')
}

/**
 * Verify HMAC for callback URL security
 * @param data - Original data that was signed
 * @param receivedHmac - HMAC to verify
 * @returns True if HMAC is valid
 */
export function verifyCallbackHmac(data: string, receivedHmac: string): boolean {
  try {
    const expectedHmac = generateCallbackHmac(data)
    return expectedHmac === receivedHmac
  } catch {
    return false
  }
}

/**
 * Generate a callback URL with HMAC for RunPod webhooks
 * @param baseUrl - Base URL for the application
 * @param jobId - Job ID to include in callback
 * @returns Complete callback URL with HMAC parameter
 */
export function generateCallbackUrl(baseUrl: string, jobId: string): string {
  const hmac = generateCallbackHmac(jobId)
  return `${baseUrl}/api/callbacks/gpu/${jobId}?hmac=${hmac}`
}