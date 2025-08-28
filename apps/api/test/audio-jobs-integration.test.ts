import request from 'supertest'
import { app } from '../src/app'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Audio Job Integration Tests', () => {
  beforeEach(async () => {
    await prisma.job.deleteMany()
  })

  afterAll(async () => {
    await prisma.job.deleteMany()
    await prisma.$disconnect()
  })

  describe('Complete job lifecycle', () => {
    it('should create, list, and retrieve audio job', async () => {
      // 1. Create a new audio job
      const createResponse = await request(app)
        .post('/api/audio/jobs')
        .send({
          inputs: [
            {
              name: 'test-song.mp3',
              path: '/uploads/test-song.mp3',
              contentType: 'audio/mpeg',
              size: 3145728
            }
          ],
          sampleRate: 48000,
          channels: 2,
          processing: {
            mode: 'separate',
            presets: 'studio-quality'
          },
          metadata: {
            title: 'Test Song for Separation',
            artist: 'Test Artist',
            duration: 180
          }
        })
        .expect(201)

      const jobId = createResponse.body.id
      expect(jobId).toBeDefined()
      expect(createResponse.body.status).toBe('QUEUED')
      expect(createResponse.body.lane).toBe('AUDIO')

      // 2. Verify job appears in list
      const listResponse = await request(app)
        .get('/api/audio/jobs')
        .expect(200)

      expect(listResponse.body.jobs).toHaveLength(1)
      expect(listResponse.body.jobs[0].id).toBe(jobId)
      expect(listResponse.body.pagination.total).toBe(1)

      // 3. Get detailed job information
      const detailResponse = await request(app)
        .get(`/api/audio/jobs/${jobId}`)
        .expect(200)

      expect(detailResponse.body).toMatchObject({
        id: jobId,
        status: 'QUEUED',
        lane: 'AUDIO',
        sampleRate: 48000,
        channels: 2,
        processing: {
          mode: 'separate',
          presets: 'studio-quality'
        },
        metadata: {
          title: 'Test Song for Separation',
          artist: 'Test Artist',
          duration: 180
        }
      })

      // 4. Simulate job status updates (normally done by worker)
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'RUNNING',
          progressPct: 50
        }
      })

      const runningResponse = await request(app)
        .get(`/api/audio/jobs/${jobId}`)
        .expect(200)

      expect(runningResponse.body.status).toBe('RUNNING')
      expect(runningResponse.body.progressPct).toBe(50)

      // 5. Complete the job with results
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progressPct: 100,
          outputUrl: `https://storage.example.com/outputs/${jobId}.zip`,
          resultPaths: [
            `/stems/${jobId}/vocals.wav`,
            `/stems/${jobId}/instruments.wav`,
            `/stems/${jobId}/bass.wav`,
            `/stems/${jobId}/drums.wav`
          ]
        }
      })

      const completedResponse = await request(app)
        .get(`/api/audio/jobs/${jobId}`)
        .expect(200)

      expect(completedResponse.body.status).toBe('COMPLETED')
      expect(completedResponse.body.progressPct).toBe(100)
      expect(completedResponse.body.outputUrl).toBe(`https://storage.example.com/outputs/${jobId}.zip`)
      expect(completedResponse.body.resultPaths).toEqual([
        `/stems/${jobId}/vocals.wav`,
        `/stems/${jobId}/instruments.wav`,
        `/stems/${jobId}/bass.wav`,
        `/stems/${jobId}/drums.wav`
      ])

      // 6. Verify filtering by status works
      const completedJobsResponse = await request(app)
        .get('/api/audio/jobs?status=COMPLETED')
        .expect(200)

      expect(completedJobsResponse.body.jobs).toHaveLength(1)
      expect(completedJobsResponse.body.jobs[0].status).toBe('COMPLETED')

      const queuedJobsResponse = await request(app)
        .get('/api/audio/jobs?status=QUEUED')
        .expect(200)

      expect(queuedJobsResponse.body.jobs).toHaveLength(0)
    })

    const createJobs = async (jobs: Array<{ inputs: Array<{ name: string, path: string, contentType: string, size: number }>, processing: { mode: string } }>) =>
      Promise.all(
        jobs.map(job =>
          request(app)
            .post('/api/audio/jobs')
            .send(job)
        )
      );

    // Create multiple jobs
    const jobsToCreate = Array.from({ length: 15 }, (_, i) => ({
      inputs: [
        {
          name: `test-${i}.mp3`,
          path: `/uploads/test-${i}.mp3`,
          contentType: 'audio/mpeg',
          size: 1024000 + i * 1000
        }
      ],
      processing: {
        mode: i % 2 === 0 ? 'separate' : 'enhance'
      }
    }));

    await createJobs(jobsToCreate);

      // Test pagination
      const page1Response = await request(app)
        .get('/api/audio/jobs?page=1&limit=10')
        .expect(200)

      expect(page1Response.body.jobs).toHaveLength(10)
      expect(page1Response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      })

      const page2Response = await request(app)
        .get('/api/audio/jobs?page=2&limit=10')
        .expect(200)

      expect(page2Response.body.jobs).toHaveLength(5)
      expect(page2Response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNext: false,
        hasPrev: true
      })

      // Verify jobs are in descending order by creation date
      const allJobs = [
        ...page1Response.body.jobs,
        ...page2Response.body.jobs
      ]

      for (let i = 0; i < allJobs.length - 1; i++) {
        const currentDate = new Date(allJobs[i].createdAt)
        const nextDate = new Date(allJobs[i + 1].createdAt)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    })

    it('should handle different processing modes', async () => {
      const modes = ['separate', 'enhance', 'transcode']
      const jobIds = []

      // Create jobs with different processing modes
      for (const mode of modes) {
        const response = await request(app)
          .post('/api/audio/jobs')
          .send({
            inputs: [
              {
                name: `${mode}-test.wav`,
                path: `/uploads/${mode}-test.wav`,
                contentType: 'audio/wav',
                size: 2048000
              }
            ],
            processing: { mode }
          })
          .expect(201)

        jobIds.push(response.body.id)
        expect(response.body.processing.mode).toBe(mode)
      }

      // Verify all jobs were created
      const listResponse = await request(app)
        .get('/api/audio/jobs')
        .expect(200)

      expect(listResponse.body.jobs).toHaveLength(3)

      // Verify each job has the correct processing mode
      for (let i = 0; i < jobIds.length; i++) {
        const detailResponse = await request(app)
          .get(`/api/audio/jobs/${jobIds[i]}`)
          .expect(200)

        expect(detailResponse.body.processing.mode).toBe(modes[i])
      }
    })
  })
})