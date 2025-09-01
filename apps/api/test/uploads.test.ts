import request from 'supertest'
import { app } from '../src/app'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

// Test image data (minimal PNG)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // bit depth, color type, etc.
  0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
  0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, // image data
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
])

describe('Upload API', () => {
  const originalEnv = process.env
  let testUploadDir: string

  beforeEach(async () => {
    // Setup test environment
    testUploadDir = path.join(__dirname, '../tmp/test-uploads', randomUUID())
    process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'true'
    process.env.UPLOADS_DIR = testUploadDir
    
    // Ensure test upload directory exists
    await fs.mkdir(testUploadDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Restore environment
    process.env = originalEnv
  })

  describe('POST /api/uploads', () => {
    it('should upload a valid image file and return ID and URL', async () => {
      const response = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'test-image.png')

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('url')
      expect(typeof response.body.id).toBe('string')
      expect(typeof response.body.url).toBe('string')
      expect(response.body.url).toMatch(/^\/uploads\//)

      // Verify file was actually saved
      const fileName = response.body.url.replace('/uploads/', '')
      const savedFile = path.join(testUploadDir, fileName)
      await expect(fs.access(savedFile)).resolves.not.toThrow()
    })

    it('should reject requests with no file', async () => {
      const response = await request(app)
        .post('/api/uploads')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('No file provided')
    })

    it('should reject unsupported file types', async () => {
      const textBuffer = Buffer.from('This is not an image', 'utf-8')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('file', textBuffer, 'test.txt')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject files that are too large', async () => {
      // Create a large buffer (larger than MAX_IMAGE_SIZE)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB > 10MB limit
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('file', largeBuffer, 'large-image.png')

      expect(response.status).toBe(400)
    })

    it('should return 403 when uploads are disabled', async () => {
      process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'false'
      process.env.VIDEO_RUN_MODE = 'disabled' // Invalid mode
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'test-image.png')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Uploads are not enabled')
    })

    it('should work when VIDEO_RUN_MODE=local_fake even without explicit enable flag', async () => {
      process.env.LOCAL_FAKE_UPLOADS_ENABLED = undefined as any
      process.env.VIDEO_RUN_MODE = 'local_fake'
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'test-image.png')

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('url')
    })

    it('should work when VIDEO_RUN_MODE=cloud', async () => {
      process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'false'
      process.env.VIDEO_RUN_MODE = 'cloud'
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'test-image.png')

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('url')
      expect(typeof response.body.id).toBe('string')
      expect(typeof response.body.url).toBe('string')
      expect(response.body.url).toMatch(/^\/uploads\//)
    })
  })
})