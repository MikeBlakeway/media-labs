import request from 'supertest'
import { app } from '../src/app'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

// Mock external dependencies
jest.mock('../src/lib/runpod')
jest.mock('../src/lib/storage')
jest.mock('../src/lib/crypto')
jest.mock('../src/config/storage')

const mockSubmitToRunPod = require('../src/lib/runpod').submitToRunPod as jest.MockedFunction<any>
const mockConvertImageToBase64 = require('../src/lib/runpod').convertImageToBase64 as jest.MockedFunction<any>
const mockInjectWorkflowParameters = require('../src/lib/runpod').injectWorkflowParameters as jest.MockedFunction<any>
const mockPresignPut = require('../src/lib/storage').presignPut as jest.MockedFunction<any>
const mockGenerateCallbackUrl = require('../src/lib/crypto').generateCallbackUrl as jest.MockedFunction<any>
const mockLoadAppConfig = require('../src/config/storage').loadAppConfig as jest.MockedFunction<any>

describe('Video Job API', () => {
  const originalVideoRunMode = process.env.VIDEO_RUN_MODE

  beforeEach(async () => {
    // Set up cloud mode for these tests
    process.env.VIDEO_RUN_MODE = 'cloud'
    
    // Clean up database before each test
    await prisma.job.deleteMany()
    
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup default mock responses
    mockPresignPut.mockResolvedValue('https://storage.example.com/presigned-upload-url')
    mockSubmitToRunPod.mockResolvedValue({
      id: 'runpod-job-123',
      status: 'IN_QUEUE'
    })
    mockConvertImageToBase64.mockResolvedValue('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    mockInjectWorkflowParameters.mockReturnValue({ test: 'workflow' })
    mockGenerateCallbackUrl.mockReturnValue('https://api.example.com/callbacks/gpu/test-job?hmac=abc123')
    mockLoadAppConfig.mockReturnValue({
      publicBaseUrl: 'https://api.example.com',
      callbackSecret: 'test-secret'
    })
    
    // Mock fetch for file uploads
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      statusText: 'OK'
    })
  })

  afterAll(async () => {
    // Restore original environment
    process.env.VIDEO_RUN_MODE = originalVideoRunMode
    
    // Clean up and disconnect
    await prisma.job.deleteMany()
    await prisma.$disconnect()
  })

  describe('POST /api/jobs', () => {
    // Create test image buffers
    const createTestImageBuffer = (name: string): Buffer => {
      // Simple PNG header for a 1x1 pixel image
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ])
      return pngHeader
    }

    it('should create a video job with valid images and parameters', async () => {
      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      const response = await request(app)
        .post('/api/jobs')
        .field('frames', '16')
        .field('fps', '8')
        .field('resolution', '720p')
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('status')
      expect(response.body.status).toBe('QUEUED')

      // Verify job was created in database
      const job = await prisma.job.findFirst({
        where: { id: response.body.id }
      })
      expect(job).toBeTruthy()
      expect(job?.lane).toBe('VIDEO')
      expect(job?.status).toBe('QUEUED')
      expect(job?.params).toEqual({
        frames: 16,
        fps: 8,
        resolution: '720p'
      })
    })

    it('should create a video job with default parameters when not provided', async () => {
      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      const response = await request(app)
        .post('/api/jobs')
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.status).toBe('QUEUED')

      // Verify default parameters were applied
      const job = await prisma.job.findFirst({
        where: { id: response.body.id }
      })
      expect(job?.params).toEqual({
        frames: 16,
        fps: 8,
        resolution: '720p'
      })
    })

    it('should reject request with missing images', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .field('frames', '16')
        .expect(500)

      expect(response.body.error).toBe('Internal server error')
      expect(response.body.message).toContain('Exactly 2 image files are required')
    })

    it('should reject request with only one image', async () => {
      const startImage = createTestImageBuffer('start.png')

      const response = await request(app)
        .post('/api/jobs')
        .attach('startImage', startImage, 'start.png')
        .expect(500)

      expect(response.body.error).toBe('Internal server error')
      expect(response.body.message).toContain('Exactly 2 image files are required')
    })

    // Note: When wrong field names are used, multer silently ignores them
    // This results in an empty files array and is handled by the "missing images" validation

    it('should reject request with invalid parameters', async () => {
      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      const response = await request(app)
        .post('/api/jobs')
        .field('frames', 'invalid')
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'frames',
            message: expect.stringContaining('Invalid')
          })
        ])
      )
    })

    it('should reject request with out-of-range parameters', async () => {
      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      const response = await request(app)
        .post('/api/jobs')
        .field('frames', '200') // Too high
        .field('fps', '0') // Too low
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })

    it('should call external services with correct parameters', async () => {
      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      await request(app)
        .post('/api/jobs')
        .field('frames', '24')
        .field('fps', '12')
        .field('resolution', '1080p')
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(201)

      // Verify presignPut was called for output video
      expect(mockPresignPut).toHaveBeenCalledWith(
        expect.stringMatching(/^videos\/.*\.mp4$/),
        'video/mp4'
      )

      // Verify submitToRunPod was called
      expect(mockSubmitToRunPod).toHaveBeenCalledWith({
        jobId: expect.any(String),
        workflow: expect.any(Object),
        images: [
          { name: 'start_image.png', image: expect.any(String) },
          { name: 'end_image.png', image: expect.any(String) }
        ],
        outputPutUrl: expect.any(String),
        callbackUrl: expect.any(String)
      })

      // Verify callback URL was generated
      expect(mockGenerateCallbackUrl).toHaveBeenCalled()
    })

    it('should handle RunPod submission failure gracefully', async () => {
      mockSubmitToRunPod.mockRejectedValue(new Error('RunPod API error'))

      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      const response = await request(app)
        .post('/api/jobs')
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(500)

      expect(response.body.error).toBe('Internal server error')
      expect(response.body.message).toContain('RunPod API error')

      // Verify job was marked as failed in database
      const jobs = await prisma.job.findMany()
      expect(jobs).toHaveLength(1)
      expect(jobs[0].status).toBe('FAILED')
      expect(jobs[0].failureReason).toContain('RunPod API error')
    })

    it('should handle storage upload failure gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Storage Error'
      })

      const startImage = createTestImageBuffer('start.png')
      const endImage = createTestImageBuffer('end.png')

      const response = await request(app)
        .post('/api/jobs')
        .attach('startImage', startImage, 'start.png')
        .attach('endImage', endImage, 'end.png')
        .expect(500)

      expect(response.body.error).toBe('Internal server error')
      expect(response.body.message).toContain('Failed to upload')

      // Verify job was marked as failed in database
      const jobs = await prisma.job.findMany()
      expect(jobs).toHaveLength(1)
      expect(jobs[0].status).toBe('FAILED')
    })
  })
})