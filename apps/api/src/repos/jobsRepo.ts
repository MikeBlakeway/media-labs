import { PrismaClient, Job, JobStatus, JobLane } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Interface for creating a new job
 */
export interface CreateJobData {
  lane: JobLane
  status?: JobStatus
  params: any // JSON
  inputs?: any // JSON - Array of input file descriptors
  sampleRate?: number // For audio jobs
  channels?: number // For audio jobs
  processing?: any // JSON - Processing configuration
  metadata?: any // JSON - Additional metadata
  podId?: string
  progressPct?: number
  outputKey?: string
  outputUrl?: string
  resultPaths?: any // JSON - Array of result file paths/URLs
  failureReason?: string
  retries?: number
  attempts?: number
  // Video-specific fields for FLF2V integration
  frames?: number
  fps?: number
  width?: number
  height?: number
  error?: string
}

/**
 * Interface for updating an existing job
 */
export interface UpdateJobData {
  status?: JobStatus
  params?: any // JSON
  inputs?: any // JSON
  sampleRate?: number
  channels?: number
  processing?: any // JSON
  metadata?: any // JSON
  podId?: string
  progressPct?: number
  outputKey?: string
  outputUrl?: string
  resultPaths?: any // JSON
  failureReason?: string
  retries?: number
  attempts?: number
  // Video-specific fields for FLF2V integration
  frames?: number
  fps?: number
  width?: number
  height?: number
  error?: string
}

/**
 * Repository for job data access operations
 * Provides clean separation of data access logic from route handlers
 */
export class JobsRepository {
  /**
   * Create a new job in the database
   * @param data - The job data to create
   * @returns Promise<Job> - The created job
   * @throws Error if creation fails
   */
  async create(data: CreateJobData): Promise<Job> {
    try {
      const job = await prisma.job.create({
        data: {
          lane: data.lane,
          status: data.status || 'QUEUED',
          params: data.params,
          inputs: data.inputs,
          sampleRate: data.sampleRate,
          channels: data.channels,
          processing: data.processing,
          metadata: data.metadata,
          podId: data.podId,
          progressPct: data.progressPct,
          outputKey: data.outputKey,
          outputUrl: data.outputUrl,
          resultPaths: data.resultPaths,
          failureReason: data.failureReason,
          retries: data.retries || 0,
          attempts: data.attempts || 0,
          frames: data.frames,
          fps: data.fps,
          width: data.width,
          height: data.height,
          error: data.error
        }
      })
      return job
    } catch (error) {
      throw new Error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update an existing job in the database
   * @param id - The job ID to update
   * @param data - The job data to update
   * @returns Promise<Job> - The updated job
   * @throws Error if job not found or update fails
   */
  async update(id: string, data: UpdateJobData): Promise<Job> {
    try {
      const job = await prisma.job.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          ...data
        }
      })
      return job
    } catch (error) {
      if (error instanceof Error && error.message.includes('No record was found for an update')) {
        throw new Error(`Job not found: ${id}`)
      }
      throw new Error(`Failed to update job: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a job by its ID
   * @param id - The job ID to retrieve
   * @returns Promise<Job | null> - The job if found, null otherwise
   * @throws Error if retrieval fails
   */
  async getById(id: string): Promise<Job | null> {
    try {
      const job = await prisma.job.findUnique({
        where: { id }
      })
      return job
    } catch (error) {
      throw new Error(`Failed to retrieve job: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a job exists by ID
   * @param id - The job ID to check
   * @returns Promise<boolean> - True if job exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    try {
      const job = await this.getById(id)
      return job !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Get jobs by lane with optional filters
   * @param lane - The job lane to filter by
   * @param options - Optional filtering and pagination options
   * @returns Promise<{jobs: Job[], total: number}> - Jobs and total count
   */
  async getByLane(
    lane: JobLane,
    options: {
      status?: JobStatus
      skip?: number
      take?: number
      orderBy?: 'createdAt' | 'updatedAt'
      orderDirection?: 'asc' | 'desc'
    } = {}
  ): Promise<{ jobs: Job[], total: number }> {
    try {
      const where: any = { lane }
      if (options.status) {
        where.status = options.status
      }

      const orderBy = options.orderBy || 'createdAt'
      const orderDirection = options.orderDirection || 'desc'

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          skip: options.skip,
          take: options.take,
          orderBy: { [orderBy]: orderDirection }
        }),
        prisma.job.count({ where })
      ])

      return { jobs, total }
    } catch (error) {
      throw new Error(`Failed to retrieve jobs by lane: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Close the database connection
   * Should be called when shutting down the application
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}

// Export a singleton instance for use across the application
export const jobsRepo = new JobsRepository()