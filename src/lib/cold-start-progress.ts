/**
 * Enhanced Progress Tracking for B2 Cold Start Operations
 *
 * Provides real-time progress updates, ETA calculations, and performance metrics
 * for model downloads from B2 cold storage to RunPod volumes.
 */

export interface ColdStartProgress {
  modelPath: string
  status: 'queued' | 'downloading' | 'completed' | 'failed'
  progress: number // 0-1
  startTime?: string
  endTime?: string
  estimatedTimeRemaining?: number // seconds
  downloadSpeed?: number // bytes per second
  totalBytes?: number
  downloadedBytes?: number
  error?: string
  retryCount?: number
}

export interface ColdStartMetrics {
  totalModels: number
  completedModels: number
  failedModels: number
  overallProgress: number
  estimatedCompletionTime?: string
  averageDownloadSpeed?: number
  totalBytesDownloaded: number
  totalTimeElapsed: number
  coldStartTarget: number // 30 seconds
  performanceRating: 'excellent' | 'good' | 'acceptable' | 'poor'
}

export class ColdStartProgressTracker {
  private modelProgress = new Map<string, ColdStartProgress>()
  private startTime: Date | null = null
  private readonly targetTimeSeconds = 30

  /**
   * Start tracking a new cold start operation
   */
  startColdStart(modelPaths: string[]): void {
    this.startTime = new Date()
    this.modelProgress.clear()

    // Initialize progress for all models
    for (const modelPath of modelPaths) {
      this.modelProgress.set(modelPath, {
        modelPath,
        status: 'queued',
        progress: 0,
        retryCount: 0
      })
    }

    console.log(`[ColdStartProgress] Started tracking ${modelPaths.length} models`)
  }

  /**
   * Update progress for a specific model
   */
  updateModelProgress(modelPath: string, update: Partial<ColdStartProgress>): void {
    const current = this.modelProgress.get(modelPath)
    if (!current) {
      console.warn(`[ColdStartProgress] Model ${modelPath} not found in tracker`)
      return
    }

    const updated: ColdStartProgress = {
      ...current,
      ...update
    }

    // Auto-set timestamps
    if (update.status === 'downloading' && !current.startTime) {
      updated.startTime = new Date().toISOString()
    }

    if (update.status === 'completed' || update.status === 'failed') {
      updated.endTime = new Date().toISOString()
      updated.progress = update.status === 'completed' ? 1 : current.progress
    }

    // Calculate ETA and download speed
    if (updated.startTime && updated.status === 'downloading') {
      const elapsedMs = Date.now() - new Date(updated.startTime).getTime()
      const elapsedSeconds = elapsedMs / 1000

      if (updated.downloadedBytes && updated.totalBytes && elapsedSeconds > 0) {
        updated.downloadSpeed = updated.downloadedBytes / elapsedSeconds
        const remainingBytes = updated.totalBytes - updated.downloadedBytes
        updated.estimatedTimeRemaining = remainingBytes / updated.downloadSpeed
        updated.progress = updated.downloadedBytes / updated.totalBytes
      }
    }

    this.modelProgress.set(modelPath, updated)
  }

  /**
   * Get current metrics for the cold start operation
   */
  getMetrics(): ColdStartMetrics {
    const models = Array.from(this.modelProgress.values())
    const completedModels = models.filter(m => m.status === 'completed').length
    const failedModels = models.filter(m => m.status === 'failed').length
    const downloadingModels = models.filter(m => m.status === 'downloading')

    // Calculate overall progress
    const totalProgress = models.reduce((sum, m) => sum + m.progress, 0)
    const overallProgress = models.length > 0 ? totalProgress / models.length : 0

    // Calculate time metrics
    let totalTimeElapsed = 0
    let estimatedCompletionTime: string | undefined

    if (this.startTime) {
      totalTimeElapsed = (Date.now() - this.startTime.getTime()) / 1000

      // Estimate completion based on downloading models
      if (downloadingModels.length > 0) {
        const maxETA = Math.max(...downloadingModels.map(m => m.estimatedTimeRemaining || 0).filter(eta => eta > 0))

        if (maxETA > 0) {
          estimatedCompletionTime = new Date(Date.now() + maxETA * 1000).toISOString()
        }
      }
    }

    // Calculate download metrics
    const totalBytesDownloaded = models.reduce((sum, m) => sum + (m.downloadedBytes || 0), 0)
    const activeSpeeds = models.map(m => m.downloadSpeed || 0).filter(speed => speed > 0)
    const averageDownloadSpeed =
      activeSpeeds.length > 0 ? activeSpeeds.reduce((sum, speed) => sum + speed, 0) / activeSpeeds.length : undefined

    // Performance rating based on progress toward 30s target
    let performanceRating: ColdStartMetrics['performanceRating'] = 'excellent'
    if (totalTimeElapsed > 0) {
      const projectedTotalTime = totalTimeElapsed / overallProgress
      if (projectedTotalTime > this.targetTimeSeconds * 2) {
        performanceRating = 'poor'
      } else if (projectedTotalTime > this.targetTimeSeconds * 1.5) {
        performanceRating = 'acceptable'
      } else if (projectedTotalTime > this.targetTimeSeconds) {
        performanceRating = 'good'
      }
    }

    return {
      totalModels: models.length,
      completedModels,
      failedModels,
      overallProgress,
      estimatedCompletionTime,
      averageDownloadSpeed,
      totalBytesDownloaded,
      totalTimeElapsed,
      coldStartTarget: this.targetTimeSeconds,
      performanceRating
    }
  }

  /**
   * Get progress for all models
   */
  getAllProgress(): ColdStartProgress[] {
    return Array.from(this.modelProgress.values())
  }

  /**
   * Get progress for a specific model
   */
  getModelProgress(modelPath: string): ColdStartProgress | undefined {
    return this.modelProgress.get(modelPath)
  }

  /**
   * Check if cold start is complete
   */
  isComplete(): boolean {
    const models = Array.from(this.modelProgress.values())
    return models.length > 0 && models.every(m => m.status === 'completed' || m.status === 'failed')
  }

  /**
   * Check if cold start met the performance target
   */
  metPerformanceTarget(): boolean {
    if (!this.isComplete() || !this.startTime) return false

    const metrics = this.getMetrics()
    return metrics.totalTimeElapsed <= this.targetTimeSeconds && metrics.failedModels === 0
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.modelProgress.clear()
    this.startTime = null
  }

  /**
   * Get summary report
   */
  getSummaryReport(): {
    success: boolean
    totalTime: number
    modelsDownloaded: number
    modelsFailed: number
    averageSpeed?: number
    performanceRating: string
    metTarget: boolean
  } {
    const metrics = this.getMetrics()

    return {
      success: metrics.failedModels === 0 && metrics.completedModels > 0,
      totalTime: metrics.totalTimeElapsed,
      modelsDownloaded: metrics.completedModels,
      modelsFailed: metrics.failedModels,
      averageSpeed: metrics.averageDownloadSpeed,
      performanceRating: metrics.performanceRating,
      metTarget: this.metPerformanceTarget()
    }
  }
}

// Global instance for tracking cold start operations
export const coldStartTracker = new ColdStartProgressTracker()

/**
 * Enhanced download function with progress tracking
 */
export async function downloadWithProgress(
  modelPath: string,
  s3Key: string,
  workerPath: string,
  tracker: ColdStartProgressTracker = coldStartTracker
): Promise<{ success: boolean; error?: string }> {
  tracker.updateModelProgress(modelPath, {
    status: 'downloading',
    startTime: new Date().toISOString()
  })

  try {
    // Start the download via volume worker
    const response = await fetch('/api/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'b2_download',
        args: { s3Key, workerPath }
      })
    })

    if (!response.ok) {
      throw new Error(`Volume worker API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.ok) {
      throw new Error(result.error || 'Download failed')
    }

    tracker.updateModelProgress(modelPath, {
      status: 'completed',
      progress: 1,
      totalBytes: result.totalBytes,
      downloadedBytes: result.totalBytes,
      downloadSpeed: result.averageSpeed
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    tracker.updateModelProgress(modelPath, {
      status: 'failed',
      error: errorMessage
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Parallel download optimization
 */
export async function downloadModelsParallel(
  models: Array<{ modelPath: string; s3Key: string; workerPath: string }>,
  maxConcurrency: number = 3
): Promise<{
  completed: number
  failed: number
  totalTime: number
  metTarget: boolean
}> {
  const tracker = new ColdStartProgressTracker()
  tracker.startColdStart(models.map(m => m.modelPath))

  console.log(
    `[ColdStartProgress] Starting parallel download of ${models.length} models (max concurrency: ${maxConcurrency})`
  )

  // Create semaphore for concurrency control
  const semaphore: Promise<unknown>[] = Array.from({ length: maxConcurrency }, () => Promise.resolve())
  let semaphoreIndex = 0

  // Start all downloads with concurrency control
  const downloadPromises = models.map(async model => {
    // Wait for an available slot
    await semaphore[semaphoreIndex]
    const currentSlot = semaphoreIndex
    semaphoreIndex = (semaphoreIndex + 1) % maxConcurrency

    // Update semaphore slot with this download
    const downloadPromise = downloadWithProgress(model.modelPath, model.s3Key, model.workerPath, tracker)
    semaphore[currentSlot] = downloadPromise

    return downloadPromise
  })

  // Wait for all downloads to complete
  await Promise.all(downloadPromises)

  const summary = tracker.getSummaryReport()
  return {
    completed: summary.modelsDownloaded,
    failed: summary.modelsFailed,
    totalTime: summary.totalTime,
    metTarget: summary.metTarget
  }
}
