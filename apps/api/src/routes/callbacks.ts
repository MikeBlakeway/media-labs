import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { verifyCallbackHmac } from '../lib/crypto'
import { broadcastToJob } from './sse'

const router = Router()
const prisma = new PrismaClient()

// Types for RunPod callback payload based on common webhook patterns
interface RunPodCallbackPayload {
  id: string                    // RunPod job ID
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'IN_QUEUE' | 'CANCELLED'
  progress?: number             // Progress percentage (0-100) for IN_PROGRESS status
  output?: {
    output_url?: string         // URL to the generated video/output
    error?: string              // Error message if failed
  }
  executionTime?: number        // Execution time in milliseconds
  [key: string]: any           // Allow for additional fields
}

// POST /api/callbacks/gpu/:jobId - Secure webhook endpoint for RunPod job completion callbacks
router.post('/api/callbacks/gpu/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params
  const hmac = req.query.hmac as string
  const payload: RunPodCallbackPayload = req.body

  console.log(`📞 Received callback for job ${jobId}`, {
    hmac: hmac ? `${hmac.substring(0, 8)}...` : 'missing',
    status: payload.status,
    runPodJobId: payload.id
  })

  try {
    // 1. Verify HMAC for security
    if (!hmac) {
      console.warn(`🚫 Missing HMAC for job ${jobId}`)
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Missing HMAC verification'
      })
    }

    if (!verifyCallbackHmac(jobId, hmac)) {
      console.warn(`🚫 Invalid HMAC for job ${jobId}`)
      return res.status(403).json({
        error: 'Forbidden', 
        message: 'Invalid HMAC verification'
      })
    }

    // 2. Validate payload
    if (!payload || !payload.id || !payload.status) {
      console.warn(`📋 Invalid payload for job ${jobId}:`, payload)
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid callback payload - missing required fields'
      })
    }

    // 3. Find the job in database
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      console.warn(`🔍 Job not found: ${jobId}`)
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      })
    }

    // 4. Prepare update data based on callback status
    let updateData: any = {
      updatedAt: new Date()
    }

    let progressPct: number | undefined
    let outputUrl: string | undefined

    switch (payload.status) {
      case 'COMPLETED':
        updateData.status = 'COMPLETED'
        updateData.progressPct = 100
        progressPct = 100
        
        // Extract output URL if available
        if (payload.output?.output_url) {
          updateData.outputUrl = payload.output.output_url
          outputUrl = payload.output.output_url
        }
        
        console.log(`✅ Job ${jobId} completed successfully`)
        break

      case 'FAILED':
        updateData.status = 'FAILED'
        updateData.failureReason = payload.output?.error || 'Job failed during processing'
        console.log(`❌ Job ${jobId} failed:`, payload.output?.error)
        break

      case 'IN_PROGRESS':
        updateData.status = 'RUNNING'
        // Extract progress if available in payload
        if (payload.progress !== undefined) {
          updateData.progressPct = Math.max(0, Math.min(100, payload.progress))
          progressPct = updateData.progressPct
        }
        console.log(`🔄 Job ${jobId} in progress`)
        break

      case 'IN_QUEUE':
        updateData.status = 'QUEUED'
        console.log(`⏳ Job ${jobId} queued`)
        break

      case 'CANCELLED':
        updateData.status = 'CANCELED'
        console.log(`🛑 Job ${jobId} cancelled`)
        break

      default:
        console.warn(`❓ Unknown status for job ${jobId}:`, payload.status)
        // Don't update status for unknown statuses, but still broadcast
        break
    }

    // 5. Update job in database
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: updateData
    })

    // 6. Broadcast SSE update to connected clients
    const sseMessage = {
      type: 'job_status_update',
      data: {
        jobId,
        status: updatedJob.status,
        progressPct: updatedJob.progressPct,
        outputUrl: updatedJob.outputUrl,
        updatedAt: updatedJob.updatedAt.toISOString(),
        ...(updatedJob.status === 'FAILED' && { failureReason: updatedJob.failureReason })
      }
    }

    const clientsNotified = broadcastToJob(jobId, sseMessage)
    
    console.log(`📡 Broadcasted update for job ${jobId} to ${clientsNotified} clients`)

    // 7. Return success response
    res.status(200).json({
      success: true,
      jobId,
      status: updatedJob.status,
      clientsNotified
    })

  } catch (error) {
    console.error(`💥 Callback processing error for job ${jobId}:`, error)
    
    // Return error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error processing callback'
    })
  }
})

export { router as callbackRouter }