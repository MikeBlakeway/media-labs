import { Router, Request, Response } from 'express'
import { verifyCallbackHmac } from '../lib/crypto'
import { broadcastToJob } from './sse'
import { jobsRepo, UpdateJobData } from '../repos/jobsRepo'

const router = Router()

// Types for RunPod callback payload based on official documentation
// Body equals GET /status/{job_id} response format
interface RunPodCallbackPayload {
  id: string                    // RunPod job ID
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT'
  delayTime?: number           // Delay time in milliseconds
  executionTime?: number       // Execution time in milliseconds  
  input?: any                  // Original input (present in webhook, not webhookV2)
  workerId?: string           // Worker ID (occasionally present)
  output?: {
    // ComfyUI v5.0.0+ format
    images?: Array<{
      filename: string
      type: 'base64' | 's3_url'
      data: string
    }>
    errors?: string[]
    // Legacy/generic formats
    output_url?: string        // Direct output URL
    message?: string          // Base64 data or message
    status?: string           // Worker-defined status
    error?: string            // Error message if failed
    [key: string]: any        // Worker-defined output shape
  }
  [key: string]: any          // Allow for additional fields
}

// POST /api/callbacks/gpu/:jobId - Secure webhook endpoint for RunPod job completion callbacks
router.post('/api/callbacks/gpu/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params
  const hmac = req.query.hmac as string
  const payload: RunPodCallbackPayload = req.body

  console.log(`📞 Received callback for job ${jobId}`, {
    hmac: hmac ? `${hmac.substring(0, 8)}...` : 'missing',
    status: payload.status,
    runPodJobId: payload.id,
    delayTime: payload.delayTime,
    executionTime: payload.executionTime
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
    const job = await jobsRepo.getById(jobId)

    if (!job) {
      console.warn(`🔍 Job not found: ${jobId}`)
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      })
    }

    // 4. Prepare update data based on callback status
    const updateData: UpdateJobData = {}

    let progressPct: number | undefined = undefined
    let outputUrl: string | undefined = undefined

    switch (payload.status) {
      case 'COMPLETED':
        updateData.status = 'COMPLETED'
        updateData.progressPct = 100
        progressPct = 100
        
        // Extract output URL from various possible formats
        if (payload.output) {
          // ComfyUI v5.0.0+ format with images array
          if (payload.output.images && payload.output.images.length > 0) {
            const firstImage = payload.output.images[0]
            if (firstImage.type === 's3_url') {
              updateData.outputUrl = firstImage.data
              outputUrl = firstImage.data
            }
          }
          // Legacy/direct output_url format
          else if (payload.output.output_url) {
            updateData.outputUrl = payload.output.output_url
            outputUrl = payload.output.output_url
          }
          // Base64 message format (older tutorials)
          else if (payload.output.message && payload.output.message.startsWith('data:')) {
            // For base64 data, we might want to handle differently
            console.log(`📄 Job ${jobId} completed with base64 output`)
          }
        }
        
        console.log(`✅ Job ${jobId} completed successfully`)
        break

      case 'FAILED':
        updateData.status = 'FAILED'
        
        // Extract error from various possible formats
        let errorMessage = 'Job failed during processing'
        if (payload.output) {
          if (payload.output.errors && payload.output.errors.length > 0) {
            errorMessage = payload.output.errors.join('; ')
          } else if (payload.output.error) {
            errorMessage = payload.output.error
          }
        }
        updateData.failureReason = errorMessage
        
        console.log(`❌ Job ${jobId} failed:`, errorMessage)
        break

      case 'IN_PROGRESS':
        updateData.status = 'RUNNING'
        // Note: RunPod doesn't send explicit progress percentage
        // Progress is inferred from status transitions
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

      case 'TIMED_OUT':
        updateData.status = 'FAILED'
        updateData.failureReason = 'Job timed out'
        console.log(`⏰ Job ${jobId} timed out`)
        break

      default:
        console.warn(`❓ Unknown status for job ${jobId}:`, payload.status)
        // Don't update status for unknown statuses, but still broadcast
        break
    }

    // 5. Update job in database
    const updatedJob = await jobsRepo.update(jobId, updateData)

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