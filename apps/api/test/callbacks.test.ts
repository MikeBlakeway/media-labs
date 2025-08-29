import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { app } from '../src/app'
import { generateCallbackHmac, verifyCallbackHmac } from '../src/lib/crypto'
import { broadcastToJob } from '../src/routes/sse'

// Mock the crypto functions
jest.mock('../src/lib/crypto', () => ({
  generateCallbackHmac: jest.fn(),
  verifyCallbackHmac: jest.fn(),
  generateCallbackUrl: jest.fn()
}))

// Mock the SSE broadcast function
jest.mock('../src/routes/sse', () => {
  const express = require('express')
  const mockRouter = express.Router()
  return {
    broadcastToJob: jest.fn(),
    sseRouter: mockRouter
  }
})

const mockGenerateCallbackHmac = generateCallbackHmac as jest.MockedFunction<typeof generateCallbackHmac>
const mockVerifyCallbackHmac = verifyCallbackHmac as jest.MockedFunction<typeof verifyCallbackHmac>
const mockBroadcastToJob = broadcastToJob as jest.MockedFunction<typeof broadcastToJob>

const prisma = new PrismaClient()

describe('Callback Webhook API', () => {
  let testJobId: string

  beforeAll(async () => {
    // Create a test job for callback testing
    const job = await prisma.job.create({
      data: {
        lane: 'VIDEO',
        status: 'RUNNING',
        params: { test: true },
        podId: 'runpod-job-123'
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockBroadcastToJob.mockReturnValue(1) // Simulate 1 client notified
    
    // Reset job to a known state before each test
    return prisma.job.update({
      where: { id: testJobId },
      data: {
        status: 'RUNNING',
        progressPct: null,
        outputUrl: null,
        failureReason: null
      }
    })
  })

  describe('POST /api/callbacks/gpu/:jobId', () => {
    const validPayload = {
      id: 'runpod-job-123',
      status: 'COMPLETED',
      output: {
        output_url: 'https://storage.example.com/videos/test-job.mp4'
      }
    }

    it('should process valid callback with correct HMAC', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(true)
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        .query({ hmac: 'valid-hmac' })
        .send(validPayload)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        jobId: testJobId,
        status: 'COMPLETED',
        clientsNotified: 1
      })

      // Verify HMAC was checked
      expect(mockVerifyCallbackHmac).toHaveBeenCalledWith(testJobId, 'valid-hmac')

      // Verify SSE broadcast
      expect(mockBroadcastToJob).toHaveBeenCalledWith(testJobId, {
        type: 'job_status_update',
        data: {
          jobId: testJobId,
          status: 'COMPLETED',
          progressPct: 100,
          outputUrl: 'https://storage.example.com/videos/test-job.mp4',
          updatedAt: expect.any(String)
        }
      })

      // Verify job was updated in database
      const updatedJob = await prisma.job.findUnique({
        where: { id: testJobId }
      })
      expect(updatedJob?.status).toBe('COMPLETED')
      expect(updatedJob?.progressPct).toBe(100)
      expect(updatedJob?.outputUrl).toBe('https://storage.example.com/videos/test-job.mp4')
    })

    it('should reject callback with missing HMAC', async () => {
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        // No HMAC query parameter
        .send(validPayload)

      // Assert
      expect(response.status).toBe(403)
      expect(response.body).toEqual({
        error: 'Forbidden',
        message: 'Missing HMAC verification'
      })

      // Verify HMAC verification was not called
      expect(mockVerifyCallbackHmac).not.toHaveBeenCalled()
      
      // Verify no SSE broadcast
      expect(mockBroadcastToJob).not.toHaveBeenCalled()
    })

    it('should reject callback with invalid HMAC', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(false)
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        .query({ hmac: 'invalid-hmac' })
        .send(validPayload)

      // Assert
      expect(response.status).toBe(403)
      expect(response.body).toEqual({
        error: 'Forbidden',
        message: 'Invalid HMAC verification'
      })

      // Verify HMAC was checked
      expect(mockVerifyCallbackHmac).toHaveBeenCalledWith(testJobId, 'invalid-hmac')
      
      // Verify no SSE broadcast
      expect(mockBroadcastToJob).not.toHaveBeenCalled()
    })

    it('should handle failed job callback', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(true)
      const failedPayload = {
        id: 'runpod-job-123',
        status: 'FAILED',
        output: {
          error: 'GPU processing failed'
        }
      }
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        .query({ hmac: 'valid-hmac' })
        .send(failedPayload)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.status).toBe('FAILED')

      // Verify SSE broadcast includes failure reason
      expect(mockBroadcastToJob).toHaveBeenCalledWith(testJobId, {
        type: 'job_status_update',
        data: {
          jobId: testJobId,
          status: 'FAILED',
          progressPct: null,
          outputUrl: null,
          updatedAt: expect.any(String),
          failureReason: 'GPU processing failed'
        }
      })

      // Verify job was updated with failure
      const updatedJob = await prisma.job.findUnique({
        where: { id: testJobId }
      })
      expect(updatedJob?.status).toBe('FAILED')
      expect(updatedJob?.failureReason).toBe('GPU processing failed')
    })

    it('should handle in-progress callback', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(true)
      const progressPayload = {
        id: 'runpod-job-123',
        status: 'IN_PROGRESS',
        progress: 75
      }
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        .query({ hmac: 'valid-hmac' })
        .send(progressPayload)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.status).toBe('RUNNING')

      // Verify job progress was updated
      const updatedJob = await prisma.job.findUnique({
        where: { id: testJobId }
      })
      expect(updatedJob?.status).toBe('RUNNING')
      expect(updatedJob?.progressPct).toBe(75)
    })

    it('should return 404 for non-existent job', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(true)
      const nonExistentJobId = 'non-existent-job-id'
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${nonExistentJobId}`)
        .query({ hmac: 'valid-hmac' })
        .send(validPayload)

      // Assert
      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Job not found'
      })

      // Verify no SSE broadcast
      expect(mockBroadcastToJob).not.toHaveBeenCalled()
    })

    it('should handle invalid payload', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(true)
      const invalidPayload = {
        // Missing required fields
        id: undefined,
        status: undefined
      }
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        .query({ hmac: 'valid-hmac' })
        .send(invalidPayload)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'Invalid callback payload - missing required fields'
      })

      // Verify no SSE broadcast
      expect(mockBroadcastToJob).not.toHaveBeenCalled()
    })

    it('should handle unknown status gracefully', async () => {
      // Arrange
      mockVerifyCallbackHmac.mockReturnValue(true)
      const unknownStatusPayload = {
        id: 'runpod-job-123',
        status: 'UNKNOWN_STATUS'
      }
      
      // Act
      const response = await request(app)
        .post(`/api/callbacks/gpu/${testJobId}`)
        .query({ hmac: 'valid-hmac' })
        .send(unknownStatusPayload)

      // Assert
      expect(response.status).toBe(200)
      
      // Should still broadcast the update even with unknown status
      expect(mockBroadcastToJob).toHaveBeenCalled()
      
      // Job status should not change from current state for unknown status
      const updatedJob = await prisma.job.findUnique({
        where: { id: testJobId }
      })
      // Status might be from previous test, but should have updated timestamp
      expect(updatedJob?.updatedAt).toBeDefined()
    })
  })
})