import { Router, Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs/promises'
import { 
  CreateVideoJobSchema, 
  SUPPORTED_IMAGE_TYPES, 
  MAX_IMAGE_SIZE, 
  REQUIRED_IMAGE_COUNT,
  IMAGE_NAMES 
} from '../schemas/video-job'
import { submitToRunPod, RunPodImage } from '../lib/runpod'
import { presignPut } from '../lib/storage'
import { generateCallbackUrl } from '../lib/crypto'
import { loadAppConfig } from '../config/storage'

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
    throw new Error(`Failed to load workflow configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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

// Upload images to storage and get presigned URLs
async function uploadImages(files: Express.Multer.File[], jobId: string): Promise<RunPodImage[]> {
  const images: RunPodImage[] = []
  
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
  images.sort((a, b) => {
    if (a.name === 'start_image.png') return -1
    if (b.name === 'start_image.png') return 1
    return a.name.localeCompare(b.name)
  })
  
  return images
}

// POST /api/jobs - Create and submit video job
router.post('/api/jobs', upload.fields([
  { name: 'startImage', maxCount: 1 },
  { name: 'endImage', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    // Validate files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const allFiles = Object.values(files).flat()
    validateFiles(allFiles)

    // Validate form data
    const validatedParams = CreateVideoJobSchema.parse(req.body)
    
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
      // Generate presigned URL for output video
      const outputKey = `videos/${job.id}.mp4`
      const outputPutUrl = await presignPut(outputKey, 'video/mp4')
      
      // Upload images and get their URLs
      const images = await uploadImages(allFiles, job.id)
      
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
        callbackUrl
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
})

export { router as videoJobRouter }