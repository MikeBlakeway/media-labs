import { JobsRepository, CreateJobData, UpdateJobData } from '../src/repos/jobsRepo'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const jobsRepo = new JobsRepository()

describe('JobsRepository', () => {
  // Test data
  let testJobId: string = ''

  afterAll(async () => {
    // Clean up test data
    if (testJobId) {
      try {
        await prisma.job.delete({ where: { id: testJobId } })
      } catch {
        // Job may already be deleted
      }
    }
    await prisma.$disconnect()
  })

  describe('create', () => {
    it('should create a new job with all required fields', async () => {
      const createData: CreateJobData = {
        lane: 'VIDEO',
        status: 'QUEUED',
        params: { test: 'param' },
        frames: 120,
        fps: 30,
        width: 1024,
        height: 1024
      }

      const job = await jobsRepo.create(createData)
      testJobId = job.id

      expect(job).toBeDefined()
      expect(job.id).toBeDefined()
      expect(job.lane).toBe('VIDEO')
      expect(job.status).toBe('QUEUED')
      expect(job.params).toEqual({ test: 'param' })
      expect(job.frames).toBe(120)
      expect(job.fps).toBe(30)
      expect(job.width).toBe(1024)
      expect(job.height).toBe(1024)
      expect(job.retries).toBe(0)
      expect(job.attempts).toBe(0)
      expect(job.createdAt).toBeDefined()
      expect(job.updatedAt).toBeDefined()
    })

    it('should create an audio job with audio-specific fields', async () => {
      const createData: CreateJobData = {
        lane: 'AUDIO',
        params: { mode: 'separate' },
        sampleRate: 44100,
        channels: 2,
        processing: { mode: 'separate', presets: 'high-quality' },
        metadata: { title: 'Test Song', artist: 'Test Artist' }
      }

      const job = await jobsRepo.create(createData)

      expect(job.lane).toBe('AUDIO')
      expect(job.status).toBe('QUEUED') // Default status
      expect(job.sampleRate).toBe(44100)
      expect(job.channels).toBe(2)
      expect(job.processing).toEqual({ mode: 'separate', presets: 'high-quality' })
      expect(job.metadata).toEqual({ title: 'Test Song', artist: 'Test Artist' })

      // Clean up
      await prisma.job.delete({ where: { id: job.id } })
    })

    it('should handle creation errors gracefully', async () => {
      // Test with invalid lane value (type assertion to force invalid data)
      const invalidData = {
        lane: 'INVALID_LANE' as any, // Invalid lane value
        params: { test: 'param' }
      } as CreateJobData

      await expect(jobsRepo.create(invalidData)).rejects.toThrow('Failed to create job')
    })
  })

  describe('getById', () => {
    it('should retrieve an existing job by ID', async () => {
      const job = await jobsRepo.getById(testJobId)

      expect(job).toBeDefined()
      expect(job?.id).toBe(testJobId)
      expect(job?.lane).toBe('VIDEO')
      expect(job?.status).toBe('QUEUED')
    })

    it('should return null for non-existent job', async () => {
      const job = await jobsRepo.getById('non-existent-id')
      expect(job).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      // Test with malformed ID that might cause database error
      const job = await jobsRepo.getById('')
      expect(job).toBeNull()
    })
  })

  describe('update', () => {
    it('should update an existing job', async () => {
      const updateData: UpdateJobData = {
        status: 'RUNNING',
        progressPct: 50,
        outputKey: 'videos/test-output.mp4'
      }

      const updatedJob = await jobsRepo.update(testJobId, updateData)

      expect(updatedJob.id).toBe(testJobId)
      expect(updatedJob.status).toBe('RUNNING')
      expect(updatedJob.progressPct).toBe(50)
      expect(updatedJob.outputKey).toBe('videos/test-output.mp4')
      expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(updatedJob.createdAt.getTime())
    })

    it('should update job to completed with output URL', async () => {
      const updateData: UpdateJobData = {
        status: 'COMPLETED',
        progressPct: 100,
        outputUrl: 'https://storage.example.com/videos/test-output.mp4',
        resultPaths: ['/videos/test-output.mp4']
      }

      const updatedJob = await jobsRepo.update(testJobId, updateData)

      expect(updatedJob.status).toBe('COMPLETED')
      expect(updatedJob.progressPct).toBe(100)
      expect(updatedJob.outputUrl).toBe('https://storage.example.com/videos/test-output.mp4')
      expect(updatedJob.resultPaths).toEqual(['/videos/test-output.mp4'])
    })

    it('should throw error for non-existent job', async () => {
      const updateData: UpdateJobData = {
        status: 'RUNNING'
      }

      await expect(jobsRepo.update('non-existent-id', updateData)).rejects.toThrow('Job not found')
    })
  })

  describe('exists', () => {
    it('should return true for existing job', async () => {
      const exists = await jobsRepo.exists(testJobId)
      expect(exists).toBe(true)
    })

    it('should return false for non-existent job', async () => {
      const exists = await jobsRepo.exists('non-existent-id')
      expect(exists).toBe(false)
    })
  })

  describe('getByLane', () => {
    let audioJobId: string = ''
    let videoJobId2: string = ''

    beforeAll(async () => {
      // Create additional test jobs for lane filtering
      const audioJob = await jobsRepo.create({
        lane: 'AUDIO',
        params: { test: 'audio' },
        status: 'COMPLETED'
      })
      audioJobId = audioJob.id

      const videoJob2 = await jobsRepo.create({
        lane: 'VIDEO',
        params: { test: 'video2' },
        status: 'FAILED'
      })
      videoJobId2 = videoJob2.id
    })

    afterAll(async () => {
      // Clean up additional test jobs
      if (audioJobId) {
        await prisma.job.delete({ where: { id: audioJobId } })
      }
      if (videoJobId2) {
        await prisma.job.delete({ where: { id: videoJobId2 } })
      }
    })

    it('should get all jobs for a specific lane', async () => {
      const result = await jobsRepo.getByLane('VIDEO')

      expect(result.jobs).toBeDefined()
      expect(result.total).toBeGreaterThanOrEqual(2) // testJobId and videoJobId2
      expect(result.jobs.every(job => job.lane === 'VIDEO')).toBe(true)
    })

    it('should filter jobs by status within a lane', async () => {
      const result = await jobsRepo.getByLane('VIDEO', { status: 'COMPLETED' })

      expect(result.jobs).toBeDefined()
      expect(result.jobs.every(job => job.lane === 'VIDEO' && job.status === 'COMPLETED')).toBe(true)
    })

    it('should support pagination', async () => {
      const result = await jobsRepo.getByLane('VIDEO', { skip: 0, take: 1 })

      expect(result.jobs).toBeDefined()
      expect(result.jobs.length).toBe(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('should support custom ordering', async () => {
      const result = await jobsRepo.getByLane('VIDEO', { 
        orderBy: 'updatedAt', 
        orderDirection: 'asc' 
      })

      expect(result.jobs).toBeDefined()
      if (result.jobs.length > 1) {
        // Check that jobs are ordered by updatedAt in ascending order
        for (let i = 1; i < result.jobs.length; i++) {
          expect(result.jobs[i].updatedAt.getTime()).toBeGreaterThanOrEqual(
            result.jobs[i-1].updatedAt.getTime()
          )
        }
      }
    })
  })

  describe('job lifecycle persistence', () => {
    it('should survive server restarts (data persists)', async () => {
      // Create a new repository instance to simulate server restart
      const newRepo = new JobsRepository()
      
      // The job should still exist after "restart"
      const job = await newRepo.getById(testJobId)
      expect(job).toBeDefined()
      expect(job?.id).toBe(testJobId)
      expect(job?.status).toBe('COMPLETED') // From earlier update test
    })
  })
})