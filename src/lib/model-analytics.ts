/**
 * Model Analytics Library
 * 
 * Tracks model usage patterns and provides insights for intelligent preloading.
 * Supports the workflow-based model preloading feature.
 */

import { z } from 'zod'
import type { ModelRequirement } from './workflow.preflight'

// Schema for model usage event
export const ModelUsageEventSchema = z.object({
  modelName: z.string(),
  modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
  workflowSlug: z.string().optional(),
  timestamp: z.string(),
  duration: z.number().optional(), // How long the model was used
  success: z.boolean()
})

export type ModelUsageEvent = z.infer<typeof ModelUsageEventSchema>

// Schema for model priority scoring
export const ModelPrioritySchema = z.object({
  modelName: z.string(),
  modelType: z.enum(['unet', 'clip', 'clip_vision', 'vae', 'lora', 'checkpoints']),
  score: z.number(),
  reasons: z.array(z.string()),
  lastUsed: z.string().optional(),
  usageCount: z.number(),
  averageDuration: z.number().optional(),
  workflows: z.array(z.string()) // Associated workflow slugs
})

export type ModelPriority = z.infer<typeof ModelPrioritySchema>

// Schema for model combination patterns
export const ModelCombinationSchema = z.object({
  models: z.array(z.string()),
  workflows: z.array(z.string()),
  frequency: z.number(),
  lastSeen: z.string(),
  averageSuccess: z.number()
})

export type ModelCombination = z.infer<typeof ModelCombinationSchema>

// Configuration for priority scoring weights
export interface PriorityWeights {
  recentUsage: number      // Weight: 40% - Recent usage frequency
  workflowPopularity: number  // Weight: 30% - Workflow template popularity  
  modelSize: number           // Weight: 20% - Model size/download time
  userPreference: number      // Weight: 10% - User preference/manual pins
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  recentUsage: 0.4,
  workflowPopularity: 0.3,
  modelSize: 0.2,
  userPreference: 0.1
}

/**
 * Calculate priority score for a model based on usage patterns and weights
 */
export function calculateModelPriority(
  modelName: string,
  events: ModelUsageEvent[],
  workflows: string[],
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): ModelPriority {
  const modelEvents = events.filter(e => e.modelName === modelName)
  const reasons: string[] = []
  
  // Recent usage score (last 7 days)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentEvents = modelEvents.filter(e => new Date(e.timestamp) > weekAgo)
  const recentUsageScore = Math.min(recentEvents.length / 10, 1) // Normalize to 0-1
  
  if (recentEvents.length > 0) {
    reasons.push(`Used ${recentEvents.length} times in last week`)
  }
  
  // Workflow popularity score
  const uniqueWorkflows = new Set(modelEvents.map(e => e.workflowSlug).filter(Boolean))
  const workflowPopularityScore = Math.min(uniqueWorkflows.size / 5, 1) // Normalize to 0-1
  
  if (uniqueWorkflows.size > 0) {
    reasons.push(`Used in ${uniqueWorkflows.size} different workflows`)
  }
  
  // Model size/download time score (inverse - smaller models get higher score)
  // This is a placeholder - in reality you'd get actual model sizes
  const estimatedSizeScore = getModelSizeScore(modelName)
  
  if (estimatedSizeScore > 0.7) {
    reasons.push('Small/fast loading model')
  }
  
  // User preference score (placeholder for manual pins)
  const userPreferenceScore = 0 // Could be loaded from user preferences
  
  // Calculate weighted score
  const totalScore = 
    recentUsageScore * weights.recentUsage +
    workflowPopularityScore * weights.workflowPopularity +
    estimatedSizeScore * weights.modelSize +
    userPreferenceScore * weights.userPreference
  
  // Calculate statistics
  const usageCount = modelEvents.length
  const durationsWithValue = modelEvents.filter(e => e.duration !== undefined).map(e => e.duration!)
  const averageDuration = durationsWithValue.length > 0 
    ? durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length 
    : undefined
  
  const lastUsed = modelEvents.length > 0 
    ? modelEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
    : undefined
  
  const modelType = modelEvents[0]?.modelType || inferModelTypeFromName(modelName)
  
  return {
    modelName,
    modelType,
    score: totalScore,
    reasons,
    lastUsed,
    usageCount,
    averageDuration,
    workflows: Array.from(uniqueWorkflows).filter(Boolean) as string[]
  }
}

/**
 * Estimate model size score based on name patterns
 * Higher score = smaller/faster model
 */
function getModelSizeScore(modelName: string): number {
  const name = modelName.toLowerCase()
  
  // Larger models typically have specific indicators
  if (name.includes('xl') || name.includes('large')) return 0.3
  if (name.includes('base') || name.includes('medium')) return 0.6
  if (name.includes('small') || name.includes('mini')) return 0.9
  if (name.includes('flux')) return 0.2 // FLUX models are typically large
  if (name.includes('sd3')) return 0.4 // SD3 models are medium-large
  
  // Default for unknown models
  return 0.5
}

/**
 * Infer model type from filename patterns
 */
function inferModelTypeFromName(modelName: string): ModelPriority['modelType'] {
  const name = modelName.toLowerCase()
  
  if (name.includes('unet') || name.includes('diffusion')) return 'unet'
  if (name.includes('clip') && name.includes('vision')) return 'clip_vision'
  if (name.includes('clip')) return 'clip'
  if (name.includes('vae')) return 'vae'
  if (name.includes('lora')) return 'lora'
  
  // Default to checkpoints for .safetensors files
  return 'checkpoints'
}

/**
 * Find frequently used model combinations from usage events
 */
export function findModelCombinations(events: ModelUsageEvent[]): ModelCombination[] {
  const combinationMap = new Map<string, {
    models: Set<string>,
    workflows: Set<string>,
    occurrences: Date[],
    successes: number
  }>()
  
  // Group events by workflow and timestamp (within 1 hour window)
  const sessionEvents = new Map<string, ModelUsageEvent[]>()
  
  for (const event of events) {
    if (!event.workflowSlug) continue
    
    const hour = new Date(event.timestamp)
    hour.setMinutes(0, 0, 0) // Round to hour
    const sessionKey = `${event.workflowSlug}-${hour.getTime()}`
    
    if (!sessionEvents.has(sessionKey)) {
      sessionEvents.set(sessionKey, [])
    }
    sessionEvents.get(sessionKey)!.push(event)
  }
  
  // Analyze combinations within each session
  for (const sessionEventList of sessionEvents.values()) {
    const models = new Set(sessionEventList.map(e => e.modelName))
    const workflows = new Set(sessionEventList.map(e => e.workflowSlug).filter(Boolean) as string[])
    const allSuccessful = sessionEventList.every(e => e.success)
    
    if (models.size < 2) continue // Need at least 2 models for a combination
    
    const sortedModels = Array.from(models).sort()
    const combinationKey = sortedModels.join(',')
    
    if (!combinationMap.has(combinationKey)) {
      combinationMap.set(combinationKey, {
        models: new Set(sortedModels),
        workflows: new Set(),
        occurrences: [],
        successes: 0
      })
    }
    
    const combination = combinationMap.get(combinationKey)!
    workflows.forEach(w => combination.workflows.add(w))
    combination.occurrences.push(new Date(sessionEventList[0].timestamp))
    if (allSuccessful) combination.successes++
  }
  
  // Convert to result format and filter by frequency
  const results: ModelCombination[] = []
  
  for (const data of combinationMap.values()) {
    if (data.occurrences.length >= 2) { // Must occur at least twice
      const lastSeen = data.occurrences.sort((a, b) => b.getTime() - a.getTime())[0]
      
      results.push({
        models: Array.from(data.models),
        workflows: Array.from(data.workflows),
        frequency: data.occurrences.length,
        lastSeen: lastSeen.toISOString(),
        averageSuccess: data.successes / data.occurrences.length
      })
    }
  }
  
  // Sort by frequency descending
  return results.sort((a, b) => b.frequency - a.frequency)
}

/**
 * Get models that should be preloaded for a specific workflow
 */
export function getPreloadCandidates(
  workflowSlug: string,
  requirements: ModelRequirement[],
  events: ModelUsageEvent[],
  combinations: ModelCombination[]
): ModelPriority[] {
  const requiredModels = new Set(requirements.map(r => r.name))
  const additionalCandidates = new Set<string>()
  
  // Find models frequently used with this workflow
  const workflowEvents = events.filter(e => e.workflowSlug === workflowSlug)
  const frequentModels = workflowEvents
    .filter(e => !requiredModels.has(e.modelName))
    .reduce((acc, event) => {
      acc.set(event.modelName, (acc.get(event.modelName) || 0) + 1)
      return acc
    }, new Map<string, number>())
  
  // Add frequently used models (used more than 3 times with this workflow)
  for (const [model, count] of frequentModels) {
    if (count >= 3) {
      additionalCandidates.add(model)
    }
  }
  
  // Find models from combinations that include required models
  for (const combination of combinations) {
    const hasRequiredModel = combination.models.some(m => requiredModels.has(m))
    const includesWorkflow = combination.workflows.includes(workflowSlug)
    
    if ((hasRequiredModel || includesWorkflow) && combination.frequency >= 3) {
      combination.models.forEach(m => {
        if (!requiredModels.has(m)) {
          additionalCandidates.add(m)
        }
      })
    }
  }
  
  // Calculate priorities for all candidates
  const allCandidates = [...requiredModels, ...additionalCandidates]
  const priorities = allCandidates.map(modelName => 
    calculateModelPriority(modelName, events, [workflowSlug])
  )
  
  // Sort by priority score descending
  return priorities.sort((a, b) => b.score - a.score)
}

/**
 * Track a model usage event
 */
export function trackModelUsage(event: Omit<ModelUsageEvent, 'timestamp'>): ModelUsageEvent {
  const fullEvent: ModelUsageEvent = {
    ...event,
    timestamp: new Date().toISOString()
  }
  
  // Validate the event
  const parsed = ModelUsageEventSchema.safeParse(fullEvent)
  if (!parsed.success) {
    console.error('Invalid model usage event:', parsed.error)
    throw new Error('Invalid model usage event')
  }
  
  // In a real implementation, this would persist to a database
  console.log('Model usage tracked:', fullEvent)
  
  return fullEvent
}