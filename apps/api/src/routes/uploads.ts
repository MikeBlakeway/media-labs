import { Router, Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { 
  SUPPORTED_IMAGE_TYPES, 
  MAX_IMAGE_SIZE 
} from '../schemas/video-job'

const router = Router()

// Environment configuration
const UPLOADS_DIR = process.env.UPLOADS_DIR || './storage/uploads'
const LOCAL_FAKE_UPLOADS_ENABLED = process.env.LOCAL_FAKE_UPLOADS_ENABLED === 'true'
const VIDEO_RUN_MODE = process.env.VIDEO_RUN_MODE

// Validation schema for upload response
const UploadResponseSchema = z.object({
  id: z.string(),
  url: z.string().min(1), // Use string validation instead of URL since we're using relative paths
  originalName: z.string(),
  size: z.number(),
  contentType: z.string()
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 2 // Allow up to 2 files (start and end images)
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_IMAGE_TYPES.includes(file.mimetype as any)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`))
    }
  }
})

/**
 * Ensure uploads directory exists
 */
async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR)
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  }
}

/**
 * Store uploaded file to disk and return URL
 */
async function storeFile(file: Express.Multer.File): Promise<{
  id: string
  url: string
  originalName: string
  size: number
  contentType: string
}> {
  // Get current uploads directory (might change in tests)
  const currentUploadsDir = process.env.UPLOADS_DIR || './storage/uploads'
  
  // Generate unique filename
  const fileId = uuidv4()
  const extension = path.extname(file.originalname)
  const filename = `${fileId}${extension}`
  const filePath = path.join(currentUploadsDir, filename)
  
  // Ensure uploads directory exists
  try {
    await fs.access(currentUploadsDir)
  } catch {
    await fs.mkdir(currentUploadsDir, { recursive: true })
  }
  
  // Write file to disk
  await fs.writeFile(filePath, file.buffer)
  
  // Generate URL (relative path for local development)
  const url = `/uploads/${filename}`
  
  return {
    id: fileId,
    url,
    originalName: file.originalname,
    size: file.size,
    contentType: file.mimetype
  }
}

/**
 * POST /api/uploads - Upload files and return URLs
 * 
 * Accepts multipart/form-data with file(s) and returns stable URLs
 * Only enabled in local_fake mode or when LOCAL_FAKE_UPLOADS_ENABLED=true
 */
router.post('/api/uploads', upload.array('files', 2), async (req: Request, res: Response) => {
  try {
    // Get current environment values (they might change between requests in tests)
    const currentVideoRunMode = process.env.VIDEO_RUN_MODE
    const currentLocalFakeEnabled = process.env.LOCAL_FAKE_UPLOADS_ENABLED === 'true'
    
    // Check if uploads are enabled
    if (currentVideoRunMode !== 'local_fake' && !currentLocalFakeEnabled) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Upload endpoint is not available in this mode'
      })
    }
    
    // Validate files
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No files provided'
      })
    }
    
    if (files.length > 2) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Maximum 2 files allowed'
      })
    }
    
    console.log(`📁 Processing ${files.length} file upload(s) in local_fake mode`)
    
    // Store files and generate URLs
    const uploadResults = await Promise.all(
      files.map(file => storeFile(file))
    )
    
    // Validate response format
    const validatedResults = uploadResults.map(result => 
      UploadResponseSchema.parse(result)
    )
    
    console.log(`✅ Successfully stored ${validatedResults.length} file(s)`)
    
    res.status(201).json({
      success: true,
      uploads: validatedResults
    })
    
  } catch (error) {
    console.error('❌ Upload error:', error)
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File Too Large',
          message: `File size exceeds ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`
        })
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too Many Files',
          message: 'Maximum 2 files allowed'
        })
      }
      // Handle other multer errors
      return res.status(400).json({
        error: 'Upload Error',
        message: error.message
      })
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid upload response format',
        details: error.issues
      })
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process file upload'
    })
  }
})

export { router as uploadsRouter }