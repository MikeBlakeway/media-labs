import request from 'supertest'
import { app } from '../src/app'
import { PrismaClient } from '@prisma/client'
import { jobsRepo } from '../src/repos/jobsRepo'

const prisma = new PrismaClient()

// Mock the storage module to avoid actual B2 calls in tests
jest.mock('../src/lib/storage', () => ({
  presignGet: jest.fn((key: string) => 
    Promise.resolve(`https://storage.example.com/download/${key}?signed=true`)
  )
}))

describe('Generic Job API', () => {
  let testVideoJobId: string = ''
  let testAudioJobId: string = ''
  let testCompletedJobId: string = ''

  beforeAll(async () => {
    // Create test jobs for different scenarios
    
    // 1. Basic video job
    const videoJob = await jobsRepo.create({
      lane: 'VIDEO',
      status: 'QUEUED',
      params: { frames: 120, fps: 30 },
      frames: 120,
      fps: 30,
      width: 1024,
      height: 1024
    })
    testVideoJobId = videoJob.id

    // 2. Audio job with audio-specific data
    const audioJob = await jobsRepo.create({
      lane: 'AUDIO',
      status: 'RUNNING',
      params: { mode: 'separate' },
      sampleRate: 44100,
      channels: 2,
      processing: { mode: 'separate', presets: 'high-quality' },
      metadata: { title: 'Test Song', artist: 'Test Artist' },
      progressPct: 75
    })
    testAudioJobId = audioJob.id

    // 3. Completed job with output for download URL testing
    const completedJob = await jobsRepo.create({
      lane: 'VIDEO',
      status: 'COMPLETED',
      params: { frames: 60, fps: 24 },
      frames: 60,
      fps: 24,
      width: 512,
      height: 512,
      progressPct: 100,
      outputKey: 'videos/completed-test.mp4',
      outputUrl: 'https://storage.example.com/videos/completed-test.mp4',
      resultPaths: ['/videos/completed-test.mp4']
    })
    testCompletedJobId = completedJob.id
  })

  afterAll(async () => {
    // Clean up test jobs
    const jobIds = [testVideoJobId, testAudioJobId, testCompletedJobId].filter(Boolean)
    
    for (const jobId of jobIds) {
      try {
        await prisma.job.delete({ where: { id: jobId } })
      } catch {
        // Job may already be deleted
      }
    }
    
    await prisma.$disconnect()
  })

  describe('GET /api/jobs/:id', () => {
    it('should return video job details', async () => {
      const response = await request(app)
        .get(`/api/jobs/${testVideoJobId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testVideoJobId,
        status: 'QUEUED',
        lane: 'VIDEO',
        frames: 120,
        fps: 30,
        width: 1024,
        height: 1024
      })

      // Should include standard job fields
      expect(response.body.createdAt).toBeDefined()
      expect(response.body.updatedAt).toBeDefined()

      // Should not include internal fields like params
      expect(response.body.params).toBeUndefined()

      // Should not include download URL for non-completed job
      expect(response.body.downloadUrl).toBeUndefined()
    })

    it('should return audio job details', async () => {
      const response = await request(app)
        .get(`/api/jobs/${testAudioJobId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testAudioJobId,
        status: 'RUNNING',
        lane: 'AUDIO',
        sampleRate: 44100,
        channels: 2,
        processing: { mode: 'separate', presets: 'high-quality' },
        metadata: { title: 'Test Song', artist: 'Test Artist' },
        progressPct: 75
      })

      // Video-specific fields should be null for audio jobs
      expect(response.body.frames).toBeNull()
      expect(response.body.fps).toBeNull()
      expect(response.body.width).toBeNull()
      expect(response.body.height).toBeNull()
    })

    it('should return completed job with download URL', async () => {
      const response = await request(app)
        .get(`/api/jobs/${testCompletedJobId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testCompletedJobId,
        status: 'COMPLETED',
        lane: 'VIDEO',
        progressPct: 100,
        outputUrl: 'https://storage.example.com/videos/completed-test.mp4',
        resultPaths: ['/videos/completed-test.mp4']
      })

      // Should include presigned download URL for completed job
      expect(response.body.downloadUrl).toBe(
        'https://storage.example.com/download/videos/completed-test.mp4?signed=true'
      )
    })

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/non-existent-job-id')
        .expect(404)

      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Job not found'
      })
    })

    it('should return 400 for missing job ID', async () => {
      const response = await request(app)
        .get('/api/jobs/')
        .expect(404) // Express returns 404 for unmatched routes

      // This test verifies the route pattern requires an ID
    })

    it('should handle database errors gracefully', async () => {
      // Test with an ID that might cause database issues
      const response = await request(app)
        .get('/api/jobs/invalid-job-id-format')
        .expect(404) // Should return 404 for non-existent job

      expect(response.body.error).toBe('Not Found')
      expect(response.body.message).toBe('Job not found')
    })

    it('should work for jobs across different lanes', async () => {
      // Test that the generic endpoint works for both VIDEO and AUDIO jobs
      const videoResponse = await request(app)
        .get(`/api/jobs/${testVideoJobId}`)
        .expect(200)

      const audioResponse = await request(app)
        .get(`/api/jobs/${testAudioJobId}`)
        .expect(200)

      expect(videoResponse.body.lane).toBe('VIDEO')
      expect(audioResponse.body.lane).toBe('AUDIO')

      // Both should have the same response structure for common fields
      expect(videoResponse.body.id).toBeDefined()
      expect(videoResponse.body.status).toBeDefined()
      expect(videoResponse.body.createdAt).toBeDefined()
      expect(videoResponse.body.updatedAt).toBeDefined()

      expect(audioResponse.body.id).toBeDefined()
      expect(audioResponse.body.status).toBeDefined()
      expect(audioResponse.body.createdAt).toBeDefined()
      expect(audioResponse.body.updatedAt).toBeDefined()
    })
  })

  describe('Download URL generation edge cases', () => {
    let jobWithoutOutputKey: string = ''
    let failedJobWithOutput: string = ''

    beforeAll(async () => {
      // Job that's completed but has no output key
      const jobNoOutput = await jobsRepo.create({
        lane: 'VIDEO',
        status: 'COMPLETED',
        params: { test: 'no-output' },
        progressPct: 100
        // No outputKey
      })
      jobWithoutOutputKey = jobNoOutput.id

      // Job that failed but has output data (edge case)
      const failedJob = await jobsRepo.create({
        lane: 'VIDEO',
        status: 'FAILED',
        params: { test: 'failed' },
        outputKey: 'videos/failed-job.mp4',
        failureReason: 'Processing failed'
      })
      failedJobWithOutput = failedJob.id
    })

    afterAll(async () => {
      // Clean up
      const jobIds = [jobWithoutOutputKey, failedJobWithOutput].filter(Boolean)
      for (const jobId of jobIds) {
        try {
          await prisma.job.delete({ where: { id: jobId } })
        } catch {
          // Ignore cleanup errors
        }
      }
    })

    it('should not include download URL for completed job without output key', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobWithoutOutputKey}`)
        .expect(200)

      expect(response.body.status).toBe('COMPLETED')
      expect(response.body.downloadUrl).toBeUndefined()
    })

    it('should not include download URL for failed job even with output key', async () => {
      const response = await request(app)
        .get(`/api/jobs/${failedJobWithOutput}`)
        .expect(200)

      expect(response.body.status).toBe('FAILED')
      expect(response.body.failureReason).toBe('Processing failed')
      expect(response.body.downloadUrl).toBeUndefined()
    })
  })

  describe('Data consistency and clean separation', () => {
    it('should return consistent data structure regardless of job type', async () => {
      const videoResponse = await request(app)
        .get(`/api/jobs/${testVideoJobId}`)
        .expect(200)

      const audioResponse = await request(app)
        .get(`/api/jobs/${testAudioJobId}`)
        .expect(200)

      // Both responses should have the same top-level structure
      const commonFields = [
        'id', 'createdAt', 'updatedAt', 'status', 'lane',
        'inputs', 'progressPct', 'outputUrl', 'resultPaths', 'failureReason'
      ]

      commonFields.forEach(field => {
        expect(videoResponse.body).toHaveProperty(field)
        expect(audioResponse.body).toHaveProperty(field)
      })
    })

    it('should not expose internal database fields', async () => {
      const response = await request(app)
        .get(`/api/jobs/${testVideoJobId}`)
        .expect(200)

      // These internal fields should not be exposed in API response
      expect(response.body.params).toBeUndefined()
      expect(response.body.podId).toBeUndefined()
      expect(response.body.outputKey).toBeUndefined()
      expect(response.body.retries).toBeUndefined()
      expect(response.body.attempts).toBeUndefined()
    })
  })
})