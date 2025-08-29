import { Router, Request, Response } from 'express'
import { Job } from '@prisma/client'
import { jobsRepo } from '../repos/jobsRepo'
import { presignGet } from '../lib/storage'

const router = Router()

/**
 * Transform job data for API response
 * Removes sensitive/internal fields and formats data appropriately
 */
const transformJobForResponse = (job: Job) => {
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
    failureReason: job.failureReason,
    // Video-specific fields
    frames: job.frames,
    fps: job.fps,
    width: job.width,
    height: job.height,
    error: job.error
  }
}

/**
 * Generate presigned download URL for completed jobs
 * Only generates URLs for jobs that have completed successfully and have output
 */
const generateDownloadUrl = async (job: Job): Promise<string | undefined> => {
  // Only generate download URLs for completed jobs with output
  if (job.status !== 'COMPLETED' || !job.outputKey) {
    return undefined
  }

  try {
    // Generate presigned GET URL for downloading the output file
    // Default expiration is 1 hour (3600 seconds)
    const downloadUrl = await presignGet(job.outputKey, 3600)
    return downloadUrl
  } catch (error) {
    console.error(`Failed to generate download URL for job ${job.id}:`, error)
    // Don't throw error, just return undefined so the job details are still returned
    return undefined
  }
}

/**
 * GET /api/jobs/:id - Get job details by ID
 * Returns job data for any lane (VIDEO, AUDIO, etc.)
 * For completed jobs, includes a presigned download URL if available
 */
router.get('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Job ID is required'
      })
    }

    // Retrieve job from database using repository
    const job = await jobsRepo.getById(id)
    
    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      })
    }

    // Transform job data for response
    const responseData = transformJobForResponse(job)

    // For completed jobs, try to generate a presigned download URL
    if (job.status === 'COMPLETED') {
      const downloadUrl = await generateDownloadUrl(job)
      if (downloadUrl) {
        // Add the presigned download URL to the response
        (responseData as any).downloadUrl = downloadUrl
      }
    }

    res.json(responseData)
  } catch (error) {
    console.error('Error fetching job:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch job details'
    })
  }
})

export { router as jobRouter }