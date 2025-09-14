/**
 * Model Preloading Service
 * 
 * Handles intelligent model preloading from B2 cold storage to RunPod volume
 * based on workflow patterns and user intent.
 */

import { z } from 'zod'
import type { ModelRequirement } from './workflow.preflight'
import type { ModelPriority } from './model-analytics'

// Schema for preloading request
export const PreloadRequestSchema = z.object({
  models: z.array(z.object({
    modelName: z.string(),
    modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
    priority: z.number().min(0).max(1),
    workflowSlug: z.string().optional()
  })),
  trigger: z.enum(['template_selection', 'form_completion', 'background_warming', 'manual_request']),
  cancelExisting: z.boolean().default(false)
})

export type PreloadRequest = z.infer<typeof PreloadRequestSchema>

// Schema for preloading status
export const PreloadStatusSchema = z.object({
  modelName: z.string(),
  modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
  status: z.enum(['queued', 'downloading', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  estimatedTimeRemaining: z.number().optional(), // seconds
  downloadSpeed: z.number().optional(), // bytes per second
  error: z.string().optional(),
  s3Key: z.string(),
  workerPath: z.string(),
  priority: z.number()
})

export type PreloadStatus = z.infer<typeof PreloadStatusSchema>

// Schema for preloading queue management
export const PreloadQueueSchema = z.object({
  active: z.array(PreloadStatusSchema),
  queued: z.array(PreloadStatusSchema),
  completed: z.array(PreloadStatusSchema),
  failed: z.array(PreloadStatusSchema),
  totalProgress: z.number().min(0).max(1),
  estimatedCompletion: z.string().optional()
})

export type PreloadQueue = z.infer<typeof PreloadQueueSchema>

// Schema for preloading configuration
export const PreloadConfigSchema = z.object({
  maxConcurrentDownloads: z.number().min(1).max(10).default(3),
  maxQueueSize: z.number().min(1).max(100).default(20),
  priorityThreshold: z.number().min(0).max(1).default(0.3),
  backgroundWarmingEnabled: z.boolean().default(true),
  backgroundWarmingHours: z.array(z.number().min(0).max(23)).default([2, 3, 4]), // 2-4 AM
  retryAttempts: z.number().min(0).max(10).default(3),
  retryDelaySeconds: z.number().min(1).max(300).default(30)
})

export type PreloadConfig = z.infer<typeof PreloadConfigSchema>

// Default configuration
export const DEFAULT_PRELOAD_CONFIG: PreloadConfig = {
  maxConcurrentDownloads: 3,
  maxQueueSize: 20,
  priorityThreshold: 0.3,
  backgroundWarmingEnabled: true,
  backgroundWarmingHours: [2, 3, 4],
  retryAttempts: 3,
  retryDelaySeconds: 30
}

/**
 * Model Preloading Service Class
 * 
 * Manages the preloading queue and coordinates model downloads
 */
export class ModelPreloadingService {
  private config: PreloadConfig
  private queue: Map<string, PreloadStatus> = new Map()
  private activeDownloads: Set<string> = new Set()
  
  constructor(config: PreloadConfig = DEFAULT_PRELOAD_CONFIG) {
    this.config = config
  }
  
  /**
   * Add models to the preloading queue
   */
  async queuePreload(request: PreloadRequest): Promise<{ success: boolean; queued: string[]; skipped: string[] }> {
    const queued: string[] = []
    const skipped: string[] = []
    
    // Validate request
    const parsed = PreloadRequestSchema.safeParse(request)
    if (!parsed.success) {
      throw new Error(`Invalid preload request: ${parsed.error.message}`)
    }
    
    // Cancel existing downloads if requested
    if (request.cancelExisting) {
      await this.cancelAllPreloading()
    }
    
    // Filter models based on priority threshold and queue capacity
    const eligibleModels = request.models
      .filter(m => m.priority >= this.config.priorityThreshold)
      .sort((a, b) => b.priority - a.priority) // Sort by priority descending
    
    const currentQueueSize = Array.from(this.queue.values())
      .filter(status => status.status === 'queued' || status.status === 'downloading').length
    
    const availableSlots = this.config.maxQueueSize - currentQueueSize
    const modelsToQueue = eligibleModels.slice(0, availableSlots)
    
    // Add models to queue
    for (const model of modelsToQueue) {
      const modelKey = `${model.modelType}:${model.modelName}`
      
      // Skip if already in queue or completed
      const existing = this.queue.get(modelKey)
      if (existing && ['queued', 'downloading', 'completed'].includes(existing.status)) {
        skipped.push(model.modelName)
        continue
      }
      
      // Create preload status
      const status: PreloadStatus = {
        modelName: model.modelName,
        modelType: model.modelType,
        status: 'queued',
        progress: 0,
        startTime: undefined,
        endTime: undefined,
        estimatedTimeRemaining: undefined,
        downloadSpeed: undefined,
        error: undefined,
        s3Key: `models/${model.modelType}/${model.modelName}`,
        workerPath: `/runpod-volume/models/${model.modelType}/${model.modelName}`,
        priority: model.priority
      }
      
      this.queue.set(modelKey, status)
      queued.push(model.modelName)
    }
    
    // Track skipped models due to capacity
    for (const model of eligibleModels.slice(availableSlots)) {
      skipped.push(model.modelName)
    }
    
    // Start processing queue
    void this.processQueue()
    
    return { success: true, queued, skipped }
  }
  
  /**
   * Get current preloading status
   */
  getPreloadStatus(): PreloadQueue {
    const statuses = Array.from(this.queue.values())
    
    const active = statuses.filter(s => s.status === 'downloading')
    const queued = statuses.filter(s => s.status === 'queued')
    const completed = statuses.filter(s => s.status === 'completed')
    const failed = statuses.filter(s => s.status === 'failed')
    
    // Calculate total progress
    const totalModels = statuses.length
    const totalProgress = totalModels > 0 
      ? statuses.reduce((sum, s) => sum + s.progress, 0) / totalModels 
      : 0
    
    // Estimate completion time
    const remainingModels = active.length + queued.length
    const estimatedCompletion = remainingModels > 0 && active.length > 0
      ? this.estimateCompletionTime(active)
      : undefined
    
    return {
      active: active.sort((a, b) => b.priority - a.priority),
      queued: queued.sort((a, b) => b.priority - a.priority),
      completed: completed.sort((a, b) => 
        new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime()
      ),
      failed: failed.sort((a, b) => 
        new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime()
      ),
      totalProgress,
      estimatedCompletion
    }
  }
  
  /**
   * Get status for a specific model
   */
  getModelStatus(modelName: string, modelType: string): PreloadStatus | null {
    const modelKey = `${modelType}:${modelName}`
    return this.queue.get(modelKey) || null
  }
  
  /**
   * Cancel preloading for specific models
   */
  async cancelPreload(modelNames: string[]): Promise<{ success: boolean; cancelled: string[] }> {
    const cancelled: string[] = []
    
    for (const [key, status] of this.queue) {
      if (modelNames.includes(status.modelName) && 
          ['queued', 'downloading'].includes(status.status)) {
        
        status.status = 'cancelled'
        status.endTime = new Date().toISOString()
        this.activeDownloads.delete(key)
        cancelled.push(status.modelName)
      }
    }
    
    return { success: true, cancelled }
  }
  
  /**
   * Cancel all preloading
   */
  async cancelAllPreloading(): Promise<{ success: boolean; cancelled: string[] }> {
    const cancelled: string[] = []
    
    for (const [key, status] of this.queue) {
      if (['queued', 'downloading'].includes(status.status)) {
        status.status = 'cancelled'
        status.endTime = new Date().toISOString()
        this.activeDownloads.delete(key)
        cancelled.push(status.modelName)
      }
    }
    
    return { success: true, cancelled }
  }
  
  /**
   * Process the preloading queue
   */
  private async processQueue(): Promise<void> {
    const availableSlots = this.config.maxConcurrentDownloads - this.activeDownloads.size
    if (availableSlots <= 0) return
    
    // Get queued items sorted by priority
    const queuedItems = Array.from(this.queue.entries())
      .filter(([, status]) => status.status === 'queued')
      .sort(([, a], [, b]) => b.priority - a.priority)
      .slice(0, availableSlots)
    
    // Start downloads
    for (const [key, status] of queuedItems) {
      this.activeDownloads.add(key)
      status.status = 'downloading'
      status.startTime = new Date().toISOString()
      
      // Start download in background
      void this.downloadModel(key, status)
    }
  }
  
  /**
   * Download a single model
   */
  private async downloadModel(key: string, status: PreloadStatus): Promise<void> {
    try {
      // Simulate model download progress
      // In a real implementation, this would call the actual download service
      await this.simulateModelDownload(status)
      
      status.status = 'completed'
      status.progress = 1
      status.endTime = new Date().toISOString()
      
    } catch (error) {
      status.status = 'failed'
      status.error = error instanceof Error ? error.message : 'Unknown error'
      status.endTime = new Date().toISOString()
      
      console.error(`Model download failed for ${status.modelName}:`, error)
    } finally {
      this.activeDownloads.delete(key)
      
      // Continue processing queue
      void this.processQueue()
    }
  }
  
  /**
   * Simulate model download with progress updates
   */
  private async simulateModelDownload(status: PreloadStatus): Promise<void> {
    const totalSteps = 100
    const stepDuration = 50 // ms per step
    
    // Estimate total time based on model type (larger models take longer)
    const baseTime = this.getEstimatedDownloadTime(status.modelType)
    const stepTime = baseTime / totalSteps
    
    for (let step = 0; step <= totalSteps; step++) {
      if (status.status === 'cancelled') {
        throw new Error('Download cancelled')
      }
      
      status.progress = step / totalSteps
      status.estimatedTimeRemaining = (totalSteps - step) * stepTime / 1000 // Convert to seconds
      status.downloadSpeed = 1024 * 1024 * (Math.random() * 10 + 5) // 5-15 MB/s
      
      await new Promise(resolve => setTimeout(resolve, stepDuration))
    }
  }
  
  /**
   * Get estimated download time for different model types
   */
  private getEstimatedDownloadTime(modelType: string): number {
    // Estimated times in milliseconds
    const times = {
      'unet': 30000,        // 30 seconds
      'checkpoints': 25000,  // 25 seconds  
      'clip': 10000,        // 10 seconds
      'clip_vision': 15000, // 15 seconds
      'vae': 8000,          // 8 seconds
      'lora': 5000          // 5 seconds
    }
    
    return times[modelType as keyof typeof times] || 15000
  }
  
  /**
   * Estimate completion time based on active downloads
   */
  private estimateCompletionTime(activeDownloads: PreloadStatus[]): string {
    if (activeDownloads.length === 0) return new Date().toISOString()
    
    const maxTimeRemaining = Math.max(
      ...activeDownloads.map(d => d.estimatedTimeRemaining || 0)
    )
    
    const completionTime = new Date(Date.now() + maxTimeRemaining * 1000)
    return completionTime.toISOString()
  }
  
  /**
   * Clear completed and failed downloads from queue
   */
  clearHistory(): { cleared: number } {
    const beforeSize = this.queue.size
    
    for (const [key, status] of this.queue) {
      if (['completed', 'failed', 'cancelled'].includes(status.status)) {
        this.queue.delete(key)
      }
    }
    
    const cleared = beforeSize - this.queue.size
    return { cleared }
  }
}

// Global service instance
let globalPreloadingService: ModelPreloadingService | null = null

/**
 * Get the global preloading service instance
 */
export function getPreloadingService(): ModelPreloadingService {
  if (!globalPreloadingService) {
    globalPreloadingService = new ModelPreloadingService()
  }
  return globalPreloadingService
}

/**
 * Initialize preloading service with custom configuration
 */
export function initializePreloadingService(config?: Partial<PreloadConfig>): ModelPreloadingService {
  const fullConfig = { ...DEFAULT_PRELOAD_CONFIG, ...config }
  globalPreloadingService = new ModelPreloadingService(fullConfig)
  return globalPreloadingService
}

/**
 * Convert ModelPriority array to PreloadRequest format
 */
export function createPreloadRequest(
  priorities: ModelPriority[],
  trigger: PreloadRequest['trigger'],
  workflowSlug?: string
): PreloadRequest {
  return {
    models: priorities.map(p => ({
      modelName: p.modelName,
      modelType: p.modelType,
      priority: p.score,
      workflowSlug
    })),
    trigger,
    cancelExisting: trigger === 'manual_request' // Only cancel for manual requests
  }
}

/**
 * Check if a model is already preloaded or in progress
 */
export function isModelPreloaded(modelName: string, modelType: string): boolean {
  const service = getPreloadingService()
  const status = service.getModelStatus(modelName, modelType)
  return status?.status === 'completed' || false
}

/**
 * Get estimated ready time for a workflow based on required models
 */
export function estimateWorkflowReadyTime(requirements: ModelRequirement[]): {
  readyNow: boolean
  estimatedTime: string | null
  pendingModels: string[]
} {
  const service = getPreloadingService()
  const pendingModels: string[] = []
  let maxWaitTime = 0
  
  for (const req of requirements) {
    const status = service.getModelStatus(req.name, req.type)
    
    if (!status || status.status === 'failed') {
      // Model not queued or failed - would need to start download
      pendingModels.push(req.name)
      maxWaitTime = Math.max(maxWaitTime, 30) // Assume 30 seconds for new download
    } else if (status.status === 'downloading' || status.status === 'queued') {
      // Model in progress
      pendingModels.push(req.name)
      maxWaitTime = Math.max(maxWaitTime, status.estimatedTimeRemaining || 30)
    }
    // If status === 'completed', model is ready
  }
  
  const readyNow = pendingModels.length === 0
  const estimatedTime = readyNow ? null : new Date(Date.now() + maxWaitTime * 1000).toISOString()
  
  return { readyNow, estimatedTime, pendingModels }
}