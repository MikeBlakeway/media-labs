import { z } from 'zod'

// Resolution mapping utility
export function mapResolutionToPixels(resolution: '720p' | '1080p'): { width: number; height: number } {
  switch (resolution) {
    case '720p':
      return { width: 1280, height: 720 }
    case '1080p':
      return { width: 1920, height: 1080 }
    default:
      throw new Error(`Unsupported resolution: ${resolution}`)
  }
}

// Video job input parameters schema
export const VideoJobParamsSchema = z.object({
  frames: z.number().int().min(4).max(120).optional().default(16),
  fps: z.number().min(1).max(60).optional().default(8),
  resolution: z.enum(['720p', '1080p']).optional().default('720p')
})

// Video job creation request schema (for multipart form data)
export const CreateVideoJobSchema = z.object({
  // File validation will happen at multer level, but we can validate metadata
  frames: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(4).max(120)).optional().default(16),
  fps: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(60)).optional().default(8),
  resolution: z.enum(['720p', '1080p']).optional().default('720p')
})

// Video job creation request schema (for URL-based job creation)
export const CreateVideoJobFromUrlsSchema = z.object({
  startImageUrl: z.string().min(1, 'Start image URL is required'),
  endImageUrl: z.string().min(1, 'End image URL is required'),
  frames: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(4).max(120)).optional().default(16),
  fps: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(60)).optional().default(8),
  resolution: z.enum(['720p', '1080p']).optional().default('720p')
})

// Video job response schema
export const VideoJobResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED']),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  params: VideoJobParamsSchema.optional(),
  progressPct: z.number().optional(),
  outputUrl: z.string().optional(),
  failureReason: z.string().optional()
})

// Type exports
export type CreateVideoJobRequest = z.infer<typeof CreateVideoJobSchema>
export type CreateVideoJobFromUrlsRequest = z.infer<typeof CreateVideoJobFromUrlsSchema>
export type VideoJobParams = z.infer<typeof VideoJobParamsSchema>
export type VideoJobResponse = z.infer<typeof VideoJobResponseSchema>

// Supported image file types
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'] as const
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const REQUIRED_IMAGE_COUNT = 2
export const IMAGE_NAMES = ['start_image.png', 'end_image.png'] as const