import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { app } from '../src/app'

const prisma = new PrismaClient()

describe('Video Jobs Local Fake Mode', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    jest.resetModules()
    process.env = { ...originalEnv }
    process.env.VIDEO_RUN_MODE = 'local_fake'
    // Use the same database as other tests
    process.env.DATABASE_URL = 'file:./prisma/dev.db'
    
    // Clean up database
    await prisma.job.deleteMany()
  })

  afterAll(async () => {
    process.env = originalEnv
    await prisma.$disconnect()
  })

  it('should create and process job in local_fake mode', async () => {
    // Create fake image files
    const startImageBuffer = Buffer.from('fake-start-image-data')
    const endImageBuffer = Buffer.from('fake-end-image-data')

    // Submit job
    const response = await request(app)
      .post('/api/jobs')
      .attach('startImage', startImageBuffer, 'start.png')
      .attach('endImage', endImageBuffer, 'end.png')
      .field('frames', '16')
      .field('fps', '8')
      .field('resolution', '720p')
      .expect(201)

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'QUEUED'
    })

    const jobId = response.body.id

    // Check job was created in database
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    expect(job).toBeTruthy()
    expect(['QUEUED', 'RUNNING']).toContain(job?.status) // In local fake mode, processing starts quickly
    expect(job?.lane).toBe('VIDEO')
    expect(job?.params).toMatchObject({
      frames: 16,
      fps: 8,
      resolution: '720p'
    })

    // Wait a bit for the fake processing to start
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check that job status was updated (could be RUNNING or COMPLETED in local fake mode)
    const runningJob = await prisma.job.findUnique({
      where: { id: jobId }
    })

    // In local fake mode, the job processes very quickly (100ms), so it might already be completed
    expect(['RUNNING', 'COMPLETED']).toContain(runningJob?.status)
    
    if (runningJob?.status === 'RUNNING') {
      expect(runningJob?.progressPct).toBe(10)
    } else if (runningJob?.status === 'COMPLETED') {
      expect(runningJob?.progressPct).toBe(100)
      expect(runningJob?.outputUrl).toMatch(/https:\/\/placeholder\.video\/placeholder-.*\.mp4/)
    }
  }, 10000)

  it('should handle validation errors same as cloud mode', async () => {
    const startImageBuffer = Buffer.from('fake-start-image-data')

    // Missing endImage should fail validation
    const response = await request(app)
      .post('/api/jobs')
      .attach('startImage', startImageBuffer, 'start.png')
      .field('frames', '16')
      .expect(500) // This should fail because validateFiles will throw

    expect(response.body.error).toBe('Internal server error')
    expect(response.body.message).toContain('Exactly 2 image files are required')
  })

  it('should handle invalid frame count', async () => {
    const startImageBuffer = Buffer.from('fake-start-image-data')
    const endImageBuffer = Buffer.from('fake-end-image-data')

    // Invalid frame count (too high)
    const response = await request(app)
      .post('/api/jobs')
      .attach('startImage', startImageBuffer, 'start.png')
      .attach('endImage', endImageBuffer, 'end.png')
      .field('frames', '200') // exceeds max of 120
      .expect(400)

    expect(response.body.error).toBe('Validation failed')
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'frames',
          message: expect.stringContaining('120')
        })
      ])
    )
  })

  it('should use simulated image URLs in local_fake mode', async () => {
    // Mock console.log to capture the simulated URLs
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    const startImageBuffer = Buffer.from('fake-start-image-data')
    const endImageBuffer = Buffer.from('fake-end-image-data')

    await request(app)
      .post('/api/jobs')
      .attach('startImage', startImageBuffer, 'start.png')
      .attach('endImage', endImageBuffer, 'end.png')
      .field('frames', '16')
      .expect(201)

    // Verify that simulated image uploads were logged with new base64 format
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/🎭 Simulated image upload: start_image\.png \(\d+ bytes\) -> base64 \(\d+ chars\)/)
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/🎭 Simulated image upload: end_image\.png \(\d+ bytes\) -> base64 \(\d+ chars\)/)
    )

    consoleSpy.mockRestore()
  })

  it('should not require RunPod or B2 configuration in local_fake mode', async () => {
    // Ensure no cloud config env vars are set
    delete process.env.RUNPOD_API_KEY
    delete process.env.RUNPOD_ENDPOINT_ID
    delete process.env.RUNPOD_REGION
    delete process.env.B2_ENDPOINT
    delete process.env.B2_REGION
    delete process.env.B2_BUCKET
    delete process.env.B2_ACCESS_KEY_ID
    delete process.env.B2_SECRET_ACCESS_KEY
    delete process.env.PUBLIC_BASE_URL
    delete process.env.CALLBACK_SECRET

    const startImageBuffer = Buffer.from('fake-start-image-data')
    const endImageBuffer = Buffer.from('fake-end-image-data')

    // This should work fine without any cloud configuration
    const response = await request(app)
      .post('/api/jobs')
      .attach('startImage', startImageBuffer, 'start.png')
      .attach('endImage', endImageBuffer, 'end.png')
      .field('frames', '16')
      .expect(201)

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'QUEUED'
    })
  })
})