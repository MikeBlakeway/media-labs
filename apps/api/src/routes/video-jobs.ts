import { Router, Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs/promises'
import {
  CreateVideoJobSchema,
  CreateVideoJobFromUrlsSchema,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  REQUIRED_IMAGE_COUNT
} from '../schemas/video-job'
import { submitToRunPod, RunPodImageWithBuffer } from '../lib/runpod'
import { presignPut } from '../lib/storage'
import { generateCallbackUrl } from '../lib/crypto'
import { loadAppConfig } from '../config/storage'
import { broadcastToJob } from './sse'

const prisma = new PrismaClient()
const router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: REQUIRED_IMAGE_COUNT
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_IMAGE_TYPES.includes(file.mimetype as any)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`))
    }
  }
})

// Load workflow configuration
async function loadWorkflow(): Promise<object> {
  try {
    const workflowPath = path.join(__dirname, '../../workflows/wan2.1_flf2v_720_f16.json')
    const workflowContent = await fs.readFile(workflowPath, 'utf-8')
    return JSON.parse(workflowContent)
  } catch (error) {
    throw new Error(
      `Failed to load workflow configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// Sort images to ensure start_image.png comes first, then end_image.png
function sortImagesByName(images: RunPodImageWithBuffer[]): RunPodImageWithBuffer[] {
  return images.sort((a, b) => {
    if (a.name === 'start_image.png') return -1
    if (b.name === 'start_image.png') return 1
    return a.name.localeCompare(b.name)
  })
}

// Validate file uploads
function validateFiles(files: Express.Multer.File[]): void {
  if (!files || files.length !== REQUIRED_IMAGE_COUNT) {
    throw new Error(`Exactly ${REQUIRED_IMAGE_COUNT} image files are required`)
  }

  // Check if we have the required field names (order doesn't matter)
  const fieldNames = files.map(f => f.fieldname).sort()
  const expectedFieldNames = ['endImage', 'startImage'] // Sorted for comparison
  if (JSON.stringify(fieldNames) !== JSON.stringify(expectedFieldNames)) {
    throw new Error(`Required fields: startImage, endImage. Received: ${files.map(f => f.fieldname).join(', ')}`)
  }
}

// Simulate local fake processing for VIDEO_RUN_MODE=local_fake
async function processLocalFakeJob(jobId: string): Promise<void> {
  console.log(`🎭 Starting local fake processing for job ${jobId}`)

  // Step 1: Mark job as RUNNING immediately
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      progressPct: 10
    }
  })

  // Broadcast initial status update
  broadcastToJob(jobId, {
    type: 'job_status_update',
    data: {
      jobId,
      status: 'RUNNING',
      progressPct: 10,
      outputUrl: null,
      updatedAt: new Date().toISOString()
    }
  })

  // Step 2: Simulate processing delay (30-60 seconds for realistic timing)
  const processingDelay = Math.floor(Math.random() * 30000) + 30000 // 30-60 seconds
  console.log(`🕐 Job ${jobId} will complete in ${processingDelay}ms`)

  setTimeout(async () => {
    try {
      // Step 3: Generate a placeholder MP4 URL (simulated output)
      const outputUrl = `https://placeholder.video/placeholder-${jobId}.mp4`

      // Step 4: Mark job as COMPLETED
      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progressPct: 100,
          outputUrl,
          updatedAt: new Date()
        }
      })

      // Step 5: Broadcast completion status
      broadcastToJob(jobId, {
        type: 'job_status_update',
        data: {
          jobId,
          status: 'COMPLETED',
          progressPct: 100,
          outputUrl: outputUrl,
          updatedAt: updatedJob.updatedAt.toISOString()
        }
      })

      console.log(`✅ Local fake processing completed for job ${jobId}`)
    } catch (error) {
      console.error(`❌ Local fake processing failed for job ${jobId}:`, error)

      // Mark job as failed
      const failedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          failureReason: 'Local fake processing simulation failed',
          updatedAt: new Date()
        }
      })

      // Broadcast failure status
      broadcastToJob(jobId, {
        type: 'job_status_update',
        data: {
          jobId,
          status: 'FAILED',
          progressPct: null,
          outputUrl: null,
          updatedAt: failedJob.updatedAt.toISOString(),
          failureReason: 'Local fake processing simulation failed'
        }
      })
    }
  }, processingDelay)
}

// Upload images to storage and get presigned URLs (or simulate in local_fake mode)
async function uploadImages(files: Express.Multer.File[], jobId: string): Promise<RunPodImageWithBuffer[]> {
  const videoRunMode = process.env.VIDEO_RUN_MODE

  if (videoRunMode === 'local_fake') {
    // In local fake mode, return simulated URLs with actual file buffers for RunPod submission
    const images: RunPodImageWithBuffer[] = []

    for (const file of files) {
      let imageName: string
      if (file.fieldname === 'startImage') {
        imageName = 'start_image.png'
      } else if (file.fieldname === 'endImage') {
        imageName = 'end_image.png'
      } else {
        throw new Error(`Unexpected field name: ${file.fieldname}`)
      }

      // Create simulated URLs for local fake mode but include the actual buffer
      const imageUrl = `https://placeholder.images/temp/${jobId}/${imageName}`

      images.push({
        name: imageName,
        url: imageUrl,
        buffer: file.buffer // Include actual file buffer for base64 conversion
      })

      console.log(`🎭 Simulated image upload: ${imageName} -> ${imageUrl} (with ${Math.round(file.buffer.length / 1024)}KB buffer)`)
    }

    // Ensure images are in the correct order
    return sortImagesByName(images)
  }

  // Cloud mode: actual upload to B2 storage
  const images: RunPodImageWithBuffer[] = []

  // Map each file to its corresponding image name based on fieldname
  for (const file of files) {
    let imageName: string
    if (file.fieldname === 'startImage') {
      imageName = 'start_image.png'
    } else if (file.fieldname === 'endImage') {
      imageName = 'end_image.png'
    } else {
      throw new Error(`Unexpected field name: ${file.fieldname}`)
    }

    const imageKey = `temp/${jobId}/${imageName}`

    try {
      // Get presigned URL for upload
      const uploadUrl = await presignPut(imageKey, file.mimetype)

      // Upload file to storage using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: (file.buffer instanceof Buffer
          ? file.buffer.buffer.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength)
          : file.buffer) as BodyInit,
        headers: {
          'Content-Type': file.mimetype,
          'Content-Length': file.size.toString()
        }
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload ${imageName}: ${uploadResponse.statusText}`)
      }

      // Create the public URL for RunPod to access
      // Note: This would typically be a signed GET URL, but for simplicity using the PUT URL base
      const imageUrl = uploadUrl.split('?')[0] // Remove query parameters to get base URL

      images.push({
        name: imageName,
        url: imageUrl
      })
    } catch (error) {
      throw new Error(`Failed to upload ${imageName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Ensure images are in the correct order (start_image.png first, then end_image.png)
  return sortImagesByName(images)
}

// Create RunPod images from URLs (for URL-based workflow)
function createImagesFromUrls(startImageUrl: string, endImageUrl: string): RunPodImageWithBuffer[] {
  const images: RunPodImageWithBuffer[] = [
    {
      name: 'start_image.png',
      url: startImageUrl
    },
    {
      name: 'end_image.png',
      url: endImageUrl
    }
  ]

  return sortImagesByName(images)
}

// POST /api/jobs - Create and submit video job (supports both multipart and JSON)
router.post(
  '/api/jobs',
  (req: Request, res: Response, next) => {
    // Check content type to determine processing mode
    const contentType = req.headers['content-type'] || ''

    if (contentType.includes('application/json')) {
      // Handle JSON-based job creation with URL references
      next()
    } else {
      // Handle multipart file upload
      upload.fields([
        { name: 'startImage', maxCount: 1 },
        { name: 'endImage', maxCount: 1 }
      ])(req, res, next)
    }
  },
  async (req: Request, res: Response) => {
    try {
      const contentType = req.headers['content-type'] || ''
      let images: RunPodImageWithBuffer[] = []
      let validatedParams: any
      // allFiles is only populated for multipart requests; keep it optional here
      let allFiles: Express.Multer.File[] | undefined = undefined

      if (contentType.includes('application/json')) {
        // Handle JSON-based job creation with URL references
        console.log('📄 Processing JSON job creation with URL references')

        // Validate JSON payload
        const urlJobData = CreateVideoJobFromUrlsSchema.parse(req.body)
        validatedParams = {
          frames: urlJobData.frames,
          fps: urlJobData.fps,
          resolution: urlJobData.resolution
        }

        // Create images from URLs
        images = createImagesFromUrls(urlJobData.startImageUrl, urlJobData.endImageUrl)

        console.log(`🔗 Using image URLs: start=${urlJobData.startImageUrl}, end=${urlJobData.endImageUrl}`)
      } else {
        // Handle multipart file upload (existing logic)
        console.log('📁 Processing multipart file upload')

        // Validate files
        const files = req.files as { [fieldname: string]: Express.Multer.File[] }
        const filesFlat = Object.values(files).flat()
        validateFiles(filesFlat)

        // Assign only within this branch
        allFiles = filesFlat

        // Validate form data
        validatedParams = CreateVideoJobSchema.parse(req.body)

        // Images will be uploaded after job creation to use the real job ID
      }

      // Load workflow configuration
      const workflow = await loadWorkflow()

      // Create job in database
      const job = await prisma.job.create({
        data: {
          lane: 'VIDEO',
          status: 'QUEUED',
          params: validatedParams
        }
      })

      try {
        // Check if we're in local fake mode
        const videoRunMode = process.env.VIDEO_RUN_MODE

        if (videoRunMode === 'local_fake') {
          console.log(`🎭 Using local fake mode for job ${job.id}`)

          // For URL-based requests, images are already ready
          // For multipart requests, we need to upload them
          if (contentType.includes('application/json')) {
            console.log('🔗 Using provided image URLs for local fake mode')
          } else {
            // Upload images locally for multipart requests
            if (!allFiles) {
              throw new Error('Missing uploaded files for multipart request')
            }
            images = await uploadImages(allFiles, job.id)
          }

          // Start local fake processing asynchronously
          processLocalFakeJob(job.id)

          // Return success response immediately
          res.status(201).json({
            id: job.id,
            status: 'QUEUED'
          })

          return
        }

        // Cloud mode processing
        console.log(`☁️ Using cloud mode for job ${job.id}`)

        // Generate presigned URL for output video
        const outputKey = `videos/${job.id}.mp4`
        const outputPutUrl = await presignPut(outputKey, 'video/mp4')

        // For URL-based requests, images are already ready
        // For multipart requests, we need to upload them
        if (!contentType.includes('application/json')) {
          if (!allFiles) {
            throw new Error('Missing uploaded files for multipart request')
          }
          images = await uploadImages(allFiles, job.id)
        }

        // Generate callback URL with HMAC
        const appConfig = loadAppConfig()
        if (!appConfig) {
          throw new Error('Application configuration not available')
        }
        const callbackUrl = generateCallbackUrl(appConfig.publicBaseUrl, job.id)

        // Submit job to RunPod
        const runpodResponse = await submitToRunPod({
          jobId: job.id,
          workflow,
          images,
          outputPutUrl,
          callbackUrl,
          videoParams: {
            frames: validatedParams.frames,
            fps: validatedParams.fps,
          },
          resolution: validatedParams.resolution
        })

        // Update job with RunPod details
        await prisma.job.update({
          where: { id: job.id },
          data: {
            podId: runpodResponse.id,
            status: runpodResponse.status === 'IN_QUEUE' ? 'QUEUED' : 'RUNNING',
            outputKey
          }
        })

        // Return success response
        res.status(201).json({
          id: job.id,
          status: runpodResponse.status === 'IN_QUEUE' ? 'QUEUED' : 'RUNNING'
        })
      } catch (error) {
        // If submission fails, mark job as failed
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            failureReason: error instanceof Error ? error.message : 'Unknown error during submission'
          }
        })
        throw error
      }
    } catch (error) {
      console.error('Video job creation failed:', error)

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        })
      }

      if (error instanceof Error && error.message.includes('Unsupported file type')) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: error.message
        })
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

export { router as videoJobRouter }
