import { Router, Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../schemas/video-job'

const router = Router()

// Upload response schema
export const UploadResponseSchema = z.object({
  id: z.string(),
  url: z.string()
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1 // Single file per upload
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_IMAGE_TYPES.includes(file.mimetype as any)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`))
    }
  }
})

// Helper function to ensure upload directory exists
async function ensureUploadDir(uploadPath: string): Promise<void> {
  try {
    await fs.access(uploadPath)
  } catch {
    await fs.mkdir(uploadPath, { recursive: true })
  }
}

// Helper function to get upload directory path
function getUploadDir(): string {
  return process.env.UPLOADS_DIR || './storage/uploads'
}

// Helper function to check if uploads are enabled
function isUploadsEnabled(): boolean {
  return process.env.LOCAL_FAKE_UPLOADS_ENABLED === 'true' || 
         process.env.VIDEO_RUN_MODE === 'local_fake' || 
         process.env.VIDEO_RUN_MODE === 'cloud'
}

/**
 * POST /api/uploads
 * Upload a single image file and return a stable URL reference
 */
router.post('/api/uploads', (req: Request, res: Response, next) => {
  // Handle multer upload with custom error handling
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Handle multer-specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
          })
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Unexpected file field. Expected field name "file"'
          })
        }
      }
      
      // Handle file type errors
      if (err.message && err.message.includes('Unsupported file type')) {
        return res.status(400).json({
          error: err.message
        })
      }
      
      // Handle other errors
      return res.status(500).json({
        error: 'Upload failed',
        message: err.message
      })
    }
    
    // Continue to main handler
    next()
  })
}, async (req: Request, res: Response) => {
  try {
    // Check if uploads are enabled
    if (!isUploadsEnabled()) {
      return res.status(403).json({
        error: 'Uploads are not enabled. Set LOCAL_FAKE_UPLOADS_ENABLED=true, VIDEO_RUN_MODE=local_fake, or VIDEO_RUN_MODE=cloud'
      })
    }

    // Validate file was provided
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided. Expected a file field named "file"'
      })
    }

    // Generate unique ID and filename
    const uploadId = randomUUID()
    const fileExtension = path.extname(req.file.originalname) || '.png'
    const fileName = `${uploadId}${fileExtension}`
    
    // Create storage path
    const uploadDir = getUploadDir()
    const filePath = path.join(uploadDir, fileName)
    
    // Ensure upload directory exists
    await ensureUploadDir(uploadDir)
    
    // Save file to disk
    await fs.writeFile(filePath, req.file.buffer)
    
    // Generate URL for the uploaded file
    // In local_fake mode, this would be a local file reference
    const fileUrl = `/uploads/${fileName}`
    
    // Return success response
    const response: UploadResponse = {
      id: uploadId,
      url: fileUrl
    }
    
    console.log(`📁 Uploaded file: ${req.file.originalname} -> ${fileName} (${req.file.size} bytes)`)
    
    res.status(201).json(response)
    
  } catch (error) {
    console.error('Upload failed:', error)
    res.status(500).json({
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export { router as uploadRouter }