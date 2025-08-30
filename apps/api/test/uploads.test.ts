import request from 'supertest'
import { app } from '../src/app'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

describe('Upload API', () => {
  const originalEnv = process.env
  const testUploadsDir = `/tmp/test-uploads-${uuidv4()}`

  beforeEach(async () => {
    jest.resetModules()
    process.env = { ...originalEnv }
    process.env.VIDEO_RUN_MODE = 'local_fake'
    process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'true'
    process.env.UPLOADS_DIR = testUploadsDir
    process.env.DATABASE_URL = 'file:./test.db'
    
    // Clean up test uploads directory
    try {
      await fs.rm(testUploadsDir, { recursive: true, force: true })
    } catch {
      // Directory might not exist, ignore
    }
  })

  afterEach(async () => {
    process.env = originalEnv
    
    // Clean up test uploads directory
    try {
      await fs.rm(testUploadsDir, { recursive: true, force: true })
    } catch {
      // Directory might not exist, ignore
    }
  })

  describe('POST /api/uploads', () => {
    it('should upload a single image file and return URL', async () => {
      const testImageBuffer = Buffer.from('fake-image-data')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('files', testImageBuffer, 'test-image.png')
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        uploads: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            url: expect.stringMatching(/^\/uploads\/.+\.png$/),
            originalName: 'test-image.png',
            size: testImageBuffer.length,
            contentType: 'image/png'
          })
        ])
      })

      // Verify file was actually stored
      const uploadedFilename = response.body.uploads[0].url.split('/').pop()
      const filePath = path.join(testUploadsDir, uploadedFilename)
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
      expect(fileExists).toBe(true)
      
      // Verify file contents
      const storedContent = await fs.readFile(filePath)
      expect(storedContent).toEqual(testImageBuffer)
    })

    it('should upload multiple image files and return URLs', async () => {
      const startImageBuffer = Buffer.from('fake-start-image-data')
      const endImageBuffer = Buffer.from('fake-end-image-data')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('files', startImageBuffer, 'start.png')
        .attach('files', endImageBuffer, 'end.jpg')
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        uploads: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            url: expect.stringMatching(/^\/uploads\/.+\.png$/),
            originalName: 'start.png',
            size: startImageBuffer.length,
            contentType: 'image/png'
          }),
          expect.objectContaining({
            id: expect.any(String),
            url: expect.stringMatching(/^\/uploads\/.+\.jpg$/),
            originalName: 'end.jpg',
            size: endImageBuffer.length,
            contentType: 'image/jpeg'
          })
        ])
      })

      expect(response.body.uploads).toHaveLength(2)
    })

    it('should reject requests with no files', async () => {
      const response = await request(app)
        .post('/api/uploads')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Validation Error',
        message: 'No files provided'
      })
    })

    it('should reject requests with too many files', async () => {
      const testImageBuffer = Buffer.from('fake-image-data')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('files', testImageBuffer, 'test1.png')
        .attach('files', testImageBuffer, 'test2.png')
        .attach('files', testImageBuffer, 'test3.png')
        .expect(500) // Multer rejects this before our handler

      // Just verify it fails appropriately
      expect(response.status).toBe(500)
    })

    it('should reject unsupported file types', async () => {
      const testFileBuffer = Buffer.from('fake-text-data')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('files', testFileBuffer, 'test.txt')
        .expect(500) // Multer rejects this before our handler

      // Just verify it fails appropriately  
      expect(response.status).toBe(500)
    })

    it('should reject requests when not in local_fake mode', async () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'false'
      
      const testImageBuffer = Buffer.from('fake-image-data')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('files', testImageBuffer, 'test.png')
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: 'Upload endpoint is not available in this mode'
      })
    })

    it('should work when LOCAL_FAKE_UPLOADS_ENABLED=true even in cloud mode', async () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'true'
      
      const testImageBuffer = Buffer.from('fake-image-data')
      
      const response = await request(app)
        .post('/api/uploads')
        .attach('files', testImageBuffer, 'test.png')
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        uploads: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringMatching(/^\/uploads\/.+\.png$/),
            originalName: 'test.png'
          })
        ])
      })
    })
  })
})