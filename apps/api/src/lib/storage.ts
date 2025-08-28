import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { loadStorageConfig } from '../config/storage'

/**
 * S3 client instance for B2 storage operations
 * Configured with B2-specific settings when in cloud mode
 */
let s3Client: S3Client | null = null

/**
 * Initialize S3 client with B2 configuration
 * Returns null if not in cloud mode (B2 storage not needed)
 */
function getS3Client(): S3Client | null {
  if (s3Client) {
    return s3Client
  }

  const config = loadStorageConfig()
  if (!config) {
    return null // Not in cloud mode
  }

  s3Client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // Required for B2 compatibility
  })

  return s3Client
}

/**
 * Generate a presigned URL for uploading an object to B2
 * @param key - The object key/path in the bucket
 * @param contentType - MIME type of the content (e.g., 'video/mp4')
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Promise<string> - The presigned upload URL
 * @throws Error if storage is not configured or URL generation fails
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client()
  if (!client) {
    throw new Error('Storage not configured - VIDEO_RUN_MODE must be "cloud" with valid B2 configuration')
  }

  const config = loadStorageConfig()
  if (!config) {
    throw new Error('Storage configuration not available')
  }

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  })

  try {
    const url = await getSignedUrl(client, command, { expiresIn })
    return url
  } catch (error) {
    throw new Error(`Failed to generate presigned PUT URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a presigned URL for downloading an object from B2
 * @param key - The object key/path in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Promise<string> - The presigned download URL
 * @throws Error if storage is not configured or URL generation fails
 */
export async function presignGet(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client()
  if (!client) {
    throw new Error('Storage not configured - VIDEO_RUN_MODE must be "cloud" with valid B2 configuration')
  }

  const config = loadStorageConfig()
  if (!config) {
    throw new Error('Storage configuration not available')
  }

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })

  try {
    const url = await getSignedUrl(client, command, { expiresIn })
    return url
  } catch (error) {
    throw new Error(`Failed to generate presigned GET URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Reset the S3 client instance (useful for testing)
 * @internal
 */
export function resetS3Client(): void {
  s3Client = null
}