import request from 'supertest'
import { app } from '../src/app'
import { PrismaClient } from '@prisma/client'
import { broadcastToJob } from '../src/routes/sse'

const prisma = new PrismaClient()

describe('SSE stream endpoint', () => {
  let testJobId: string

  beforeAll(async () => {
    // Create a test job for SSE testing
    const job = await prisma.job.create({
      data: {
        lane: 'VIDEO',
        status: 'QUEUED',
        params: { test: true }
      }
    })
    testJobId = job.id
  })

  afterAll(async () => {
    // Clean up test job
    await prisma.job.delete({
      where: { id: testJobId }
    })
    await prisma.$disconnect()
  })

  describe('GET /api/jobs/stream', () => {
    it('should return 400 when jobId is missing', async () => {
      const response = await request(app)
        .get('/api/jobs/stream')
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toEqual({
        error: 'Missing required parameter: jobId'
      })
    })

    it('should return 404 when job does not exist', async () => {
      const response = await request(app)
        .get('/api/jobs/stream?jobId=nonexistent')
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body).toEqual({
        error: 'Job not found'
      })
    })

    // Note: SSE connection testing is complex with supertest due to streaming nature
    // These tests would be better done with integration testing or manual verification
  })

  describe('GET /api/jobs/stream/stats', () => {
    it('should return connection statistics', async () => {
      const response = await request(app)
        .get('/api/jobs/stream/stats')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body).toHaveProperty('totalJobs')
      expect(response.body).toHaveProperty('connections')
      expect(Array.isArray(response.body.connections)).toBe(true)
    })
  })

  describe('broadcastToJob function', () => {
    it('should handle empty job registry', () => {
      const result = broadcastToJob('nonexistent-job', {
        type: 'test',
        data: { message: 'hello' }
      })
      
      // Should return 0 for no connections
      expect(result).toBe(0)
    })
  })
})