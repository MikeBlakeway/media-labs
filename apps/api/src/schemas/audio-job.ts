import { z } from 'zod'

// Input file descriptor schema
export const InputFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  path: z.string().min(1, 'File path is required'),
  contentType: z.string().regex(/^audio\//i, 'Must be an audio content type'),
  size: z.number().positive('File size must be positive')
})

// Processing configuration schema
export const ProcessingConfigSchema = z.object({
  mode: z.enum(['separate', 'enhance', 'transcode']),
  presets: z.string().optional()
})

// Audio job creation request schema
export const CreateAudioJobSchema = z.object({
  inputs: z.array(InputFileSchema).min(1, 'At least one input file is required'),
  sampleRate: z.number().int().positive().optional().default(44100),
  channels: z.number().int().min(1).max(32, 'Channels must be between 1 and 32').optional(),
  processing: ProcessingConfigSchema,
  metadata: z.record(z.string(), z.unknown()).optional()
})

// Audio job query parameters schema
export const AudioJobQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED']).optional()
})

// Audio job response schema (for documentation/validation)
export const AudioJobResponseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED']),
  lane: z.literal('AUDIO'),
  inputs: z.array(InputFileSchema).optional(),
  sampleRate: z.number().optional(),
  channels: z.number().optional(),
  processing: ProcessingConfigSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  progressPct: z.number().optional(),
  outputUrl: z.string().optional(),
  resultPaths: z.array(z.string()).optional(),
  failureReason: z.string().optional()
})

// Type exports
export type CreateAudioJobRequest = z.infer<typeof CreateAudioJobSchema>
export type AudioJobQuery = z.infer<typeof AudioJobQuerySchema>
export type AudioJobResponse = z.infer<typeof AudioJobResponseSchema>
export type InputFile = z.infer<typeof InputFileSchema>
export type ProcessingConfig = z.infer<typeof ProcessingConfigSchema>