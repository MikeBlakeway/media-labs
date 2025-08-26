import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { ZodError } from 'zod'
import {
  CreateAudioJobSchema,
  AudioJobQuerySchema,
  type CreateAudioJobRequest,
  type AudioJobQuery
} from '../schemas/audio-job'

const router = Router()
const prisma = new PrismaClient()

// Helper function to handle validation errors
const handleValidationError = (error: ZodError, res: Response) => {
  const errors = error.issues.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
  
  res.status(400).json({
    error: 'Validation failed',
    details: errors
  })
}

// Helper function to transform job data for response
const transformJobForResponse = (job: any) => {
  return {
    id: job.id,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    status: job.status,
    lane: job.lane,
    inputs: job.inputs,
    sampleRate: job.sampleRate,
    channels: job.channels,
    processing: job.processing,
    metadata: job.metadata,
    progressPct: job.progressPct,
    outputUrl: job.outputUrl,
    resultPaths: job.resultPaths,
    failureReason: job.failureReason
  }
}

// POST /api/audio/jobs - Create a new audio job
router.post('/api/audio/jobs', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData: CreateAudioJobRequest = CreateAudioJobSchema.parse(req.body)
    
    // Create job in database
    const job = await prisma.job.create({
      data: {
        lane: 'AUDIO',
        inputs: validatedData.inputs as any,
        sampleRate: validatedData.sampleRate,
        channels: validatedData.channels,
        processing: validatedData.processing as any,
        metadata: validatedData.metadata as any,
        params: {} // Legacy field - keeping for compatibility
      }
    })
    
    // TODO: Enqueue job for processing (EPIC-002 integration)
    
    res.status(201).json(transformJobForResponse(job))
  } catch (error) {
    if (error instanceof ZodError) {
      handleValidationError(error, res)
    } else {
      console.error('Error creating audio job:', error)
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create audio job'
      })
    }
  }
})

// GET /api/audio/jobs - List audio jobs with pagination and filtering
router.get('/api/audio/jobs', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const query: AudioJobQuery = AudioJobQuerySchema.parse(req.query)
    
    const { page, limit, status } = query
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = { lane: 'AUDIO' }
    if (status) {
      where.status = status
    }
    
    // Fetch jobs with pagination
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.job.count({ where })
    ])
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1
    
    res.json({
      jobs: jobs.map(transformJobForResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    })
  } catch (error) {
    if (error instanceof ZodError) {
      handleValidationError(error, res)
    } else {
      console.error('Error fetching audio jobs:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch audio jobs'
      })
    }
  }
})

// GET /api/audio/jobs/:id - Get specific audio job details
router.get('/api/audio/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    if (!id) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Job ID is required'
      })
    }
    
    const job = await prisma.job.findFirst({
      where: {
        id,
        lane: 'AUDIO'
      }
    })
    
    if (!job) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Audio job not found'
      })
    }
    
    res.json(transformJobForResponse(job))
  } catch (error) {
    console.error('Error fetching audio job:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch audio job'
    })
  }
})

export { router as audioJobRouter }