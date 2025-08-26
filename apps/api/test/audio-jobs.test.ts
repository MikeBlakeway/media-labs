import request from 'supertest'
import { app } from '../src/app'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Audio Job API', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.job.deleteMany()
  })

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.job.deleteMany()
    await prisma.$disconnect()
  })

  describe('POST /api/audio/jobs', () => {
    const validJobData = {
      inputs: [
        {
          name: 'test-audio.mp3',
          path: '/uploads/test-audio.mp3',
          contentType: 'audio/mpeg',
          size: 1024000
        }
      ],
      sampleRate: 44100,
      channels: 2,
      processing: {
        mode: 'separate' as const
      },
      metadata: {
        title: 'Test Audio',
        artist: 'Test Artist'
      }
    }

    it('should create a new audio job with valid data', async () => {
      const response = await request(app)
        .post('/api/audio/jobs')
        .send(validJobData)
        .expect('Content-Type', /json/)
        .expect(201)

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'QUEUED',
        lane: 'AUDIO',
        sampleRate: 44100,
        channels: 2,
        processing: {
          mode: 'separate'
        },
        metadata: {
          title: 'Test Audio',
          artist: 'Test Artist'
        }
      })

      expect(response.body.createdAt).toBeDefined()
      expect(response.body.updatedAt).toBeDefined()
    })

    it('should create job with default sampleRate when not provided', async () => {
      const jobDataWithoutSampleRate = {
        ...validJobData,
        sampleRate: undefined
      }
      delete jobDataWithoutSampleRate.sampleRate

      const response = await request(app)
        .post('/api/audio/jobs')
        .send(jobDataWithoutSampleRate)
        .expect(201)

      expect(response.body.sampleRate).toBe(44100)
    })

    it('should reject job with invalid audio content type', async () => {
      const invalidJobData = {
        ...validJobData,
        inputs: [
          {
            name: 'test.txt',
            path: '/uploads/test.txt',
            contentType: 'text/plain',
            size: 1024
          }
        ]
      }

      const response = await request(app)
        .post('/api/audio/jobs')
        .send(invalidJobData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'inputs.0.contentType',
            message: 'Must be an audio content type'
          })
        ])
      )
    })

    it('should reject job with invalid processing mode', async () => {
      const invalidJobData = {
        ...validJobData,
        processing: {
          mode: 'invalid-mode'
        }
      }

      const response = await request(app)
        .post('/api/audio/jobs')
        .send(invalidJobData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })

    it('should reject job with negative sample rate', async () => {
      const invalidJobData = {
        ...validJobData,
        sampleRate: -1000
      }

      const response = await request(app)
        .post('/api/audio/jobs')
        .send(invalidJobData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })

    it('should reject job with too many channels', async () => {
      const invalidJobData = {
        ...validJobData,
        channels: 50
      }

      const response = await request(app)
        .post('/api/audio/jobs')
        .send(invalidJobData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'channels',
            message: 'Channels must be between 1 and 32'
          })
        ])
      )
    })

    it('should reject job with empty inputs array', async () => {
      const invalidJobData = {
        ...validJobData,
        inputs: []
      }

      const response = await request(app)
        .post('/api/audio/jobs')
        .send(invalidJobData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })
  })

  describe('GET /api/audio/jobs', () => {
    beforeEach(async () => {
      // Create test jobs
      await prisma.job.createMany({
        data: [
          {
            lane: 'AUDIO',
            status: 'COMPLETED',
            sampleRate: 44100,
            channels: 2,
            processing: { mode: 'separate' },
            params: {},
            inputs: [{ name: 'test1.mp3', path: '/test1.mp3', contentType: 'audio/mpeg', size: 1024 }]
          },
          {
            lane: 'AUDIO',
            status: 'RUNNING',
            sampleRate: 48000,
            channels: 1,
            processing: { mode: 'enhance' },
            params: {},
            inputs: [{ name: 'test2.wav', path: '/test2.wav', contentType: 'audio/wav', size: 2048 }]
          },
          {
            lane: 'VIDEO', // Non-audio job to test filtering
            status: 'QUEUED',
            params: {}
          }
        ]
      })
    })

    it('should return paginated list of audio jobs only', async () => {
      const response = await request(app)
        .get('/api/audio/jobs')
        .expect(200)

      expect(response.body.jobs).toHaveLength(2)
      expect(response.body.jobs.every((job: any) => job.lane === 'AUDIO')).toBe(true)
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      })
    })

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get('/api/audio/jobs?status=COMPLETED')
        .expect(200)

      expect(response.body.jobs).toHaveLength(1)
      expect(response.body.jobs[0].status).toBe('COMPLETED')
    })

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/audio/jobs?page=1&limit=1')
        .expect(200)

      expect(response.body.jobs).toHaveLength(1)
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      })
    })

    it('should return jobs in descending order by creation date', async () => {
      const response = await request(app)
        .get('/api/audio/jobs')
        .expect(200)

      const jobs = response.body.jobs
      for (let i = 0; i < jobs.length - 1; i++) {
        const currentDate = new Date(jobs[i].createdAt)
        const nextDate = new Date(jobs[i + 1].createdAt)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    })

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/audio/jobs?page=invalid')
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })
  })

  describe('GET /api/audio/jobs/:id', () => {
    let testJobId: string

    beforeEach(async () => {
      const job = await prisma.job.create({
        data: {
          lane: 'AUDIO',
          status: 'COMPLETED',
          sampleRate: 44100,
          channels: 2,
          processing: { mode: 'separate', presets: 'high-quality' },
          metadata: { title: 'Test Song' },
          params: {},
          inputs: [{ name: 'test.mp3', path: '/test.mp3', contentType: 'audio/mpeg', size: 1024 }],
          outputUrl: 'https://example.com/output.zip',
          resultPaths: ['/stems/vocals.wav', '/stems/instruments.wav']
        }
      })
      testJobId = job.id
    })

    it('should return audio job details', async () => {
      const response = await request(app)
        .get(`/api/audio/jobs/${testJobId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testJobId,
        status: 'COMPLETED',
        lane: 'AUDIO',
        sampleRate: 44100,
        channels: 2,
        processing: {
          mode: 'separate',
          presets: 'high-quality'
        },
        metadata: {
          title: 'Test Song'
        },
        outputUrl: 'https://example.com/output.zip',
        resultPaths: ['/stems/vocals.wav', '/stems/instruments.wav']
      })
    })

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/audio/jobs/non-existent-id')
        .expect(404)

      expect(response.body.error).toBe('Not found')
      expect(response.body.message).toBe('Audio job not found')
    })

    it('should return 404 for video job ID (lane filtering)', async () => {
      // Create a video job
      const videoJob = await prisma.job.create({
        data: {
          lane: 'VIDEO',
          status: 'QUEUED',
          params: {}
        }
      })

      const response = await request(app)
        .get(`/api/audio/jobs/${videoJob.id}`)
        .expect(404)

      expect(response.body.error).toBe('Not found')
    })
  })
})