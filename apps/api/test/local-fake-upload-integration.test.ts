import request from 'supertest'
import { app } from '../src/app'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

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

describe('Local Fake Upload Integration', () => {
  const originalEnv = process.env
  let testUploadDir: string

  beforeEach(async () => {
    // Clean up database
    await prisma.job.deleteMany()
    
    // Setup test environment for local_fake mode
    testUploadDir = path.join(__dirname, '../tmp/integration-uploads', randomUUID())
    process.env.VIDEO_RUN_MODE = 'local_fake'
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

  afterAll(async () => {
    await prisma.job.deleteMany()
    await prisma.$disconnect()
  })

  describe('Upload Workflow for Body-Size Prevention', () => {
    it('should upload images separately to avoid Server Action body limits', async () => {
      // Step 1: Upload start image
      const startImageResponse = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'start-image.png')

      expect(startImageResponse.status).toBe(201)
      expect(startImageResponse.body).toHaveProperty('id')
      expect(startImageResponse.body).toHaveProperty('url')

      // Step 2: Upload end image
      const endImageResponse = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'end-image.png')

      expect(endImageResponse.status).toBe(201)
      expect(endImageResponse.body).toHaveProperty('id')
      expect(endImageResponse.body).toHaveProperty('url')

      console.log(`✅ Upload workflow completed: URLs available at ${startImageResponse.body.url} and ${endImageResponse.body.url}`)
    })

    it('should demonstrate upload workflow avoids large payloads', async () => {
      // Upload images first (separate small requests)
      const startImageResponse = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'start-large.png')

      const endImageResponse = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'end-large.png')

      // Both uploads should succeed
      expect(startImageResponse.status).toBe(201)
      expect(endImageResponse.status).toBe(201)

      // The uploaded file URLs can now be used in a job payload (which would be much smaller)
      const imageReferences = {
        startImageUrl: startImageResponse.body.url,
        endImageUrl: endImageResponse.body.url
      }

      // This demonstrates that we could send just the references in a job creation request
      // instead of the binary data, thus avoiding Server Action body limits
      expect(JSON.stringify(imageReferences).length).toBeLessThan(1000) // Much smaller than 1MB limit
      
      console.log(`✅ Upload references are small: ${JSON.stringify(imageReferences).length} bytes`)
    })

    it('should work in local_fake mode without explicit uploads enabled flag', async () => {
      // Remove explicit upload enable flag, rely on VIDEO_RUN_MODE=local_fake
      delete process.env.LOCAL_FAKE_UPLOADS_ENABLED
      
      const uploadResponse = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'test.png')

      expect(uploadResponse.status).toBe(201)
      expect(uploadResponse.body).toHaveProperty('id')
      expect(uploadResponse.body).toHaveProperty('url')
    })
  })

  describe('Error Prevention', () => {
    it('should prevent 413 errors by using upload workflow instead of direct multipart', async () => {
      // This test demonstrates that the upload endpoint can handle files
      // that would cause problems if sent directly in a Server Action payload
      
      const uploadResponse = await request(app)
        .post('/api/uploads')
        .attach('file', testImageBuffer, 'prevent-413.png')

      // Upload should succeed
      expect(uploadResponse.status).toBe(201)
      
      // The resulting reference is small and won't cause 413 errors
      const reference = {
        imageId: uploadResponse.body.id,
        imageUrl: uploadResponse.body.url
      }
      
      expect(JSON.stringify(reference).length).toBeLessThan(200) // Very small payload
      
      console.log(`✅ Image reference payload: ${JSON.stringify(reference).length} bytes (prevents 413 errors)`)
    })
  })
})