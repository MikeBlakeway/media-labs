import type { FieldSpec } from '@/lib/templates.types'

/**
 * Categorizes workflow fields into essential (always visible) and advanced (collapsible)
 * based on field types, IDs, and labels.
 */

/**
 * Determines if a field is considered "essential" and should always be visible
 */
function isEssentialField(field: FieldSpec): boolean {
  const { id, label, type, inputKey } = field

  // 1. File uploads are always essential
  if (type === 'file') {
    return true
  }

  // 2. Text prompts are essential
  if (type === 'text' || type === 'string') {
    const lowerLabel = label.toLowerCase()
    const lowerKey = inputKey.toLowerCase()

    // Common prompt field patterns
    if (
      lowerLabel.includes('prompt') ||
      lowerLabel.includes('description') ||
      lowerKey === 'text' ||
      lowerKey === 'prompt' ||
      lowerKey === 'positive' ||
      lowerKey === 'negative'
    ) {
      return true
    }
  }

  // 3. Output size and length parameters are essential
  if (type === 'integer' || type === 'number') {
    const lowerLabel = label.toLowerCase()
    const lowerKey = inputKey.toLowerCase()
    const lowerId = id.toLowerCase()

    // Size parameters
    if (
      lowerLabel.includes('width') ||
      lowerLabel.includes('height') ||
      lowerLabel.includes('size') ||
      lowerKey.includes('width') ||
      lowerKey.includes('height') ||
      lowerId.includes('width') ||
      lowerId.includes('height')
    ) {
      return true
    }

    // Length/duration parameters for video
    if (
      lowerLabel.includes('length') ||
      lowerLabel.includes('duration') ||
      lowerLabel.includes('frames') ||
      lowerLabel.includes('frame_count') ||
      lowerKey.includes('length') ||
      lowerKey.includes('duration') ||
      lowerKey.includes('frames') ||
      lowerId.includes('length') ||
      lowerId.includes('duration') ||
      lowerId.includes('frames')
    ) {
      return true
    }
  }

  // All other fields are considered advanced
  return false
}

/**
 * Categorizes fields into essential and advanced groups
 */
export function categorizeFields(fields: FieldSpec[]): {
  essential: FieldSpec[]
  advanced: FieldSpec[]
} {
  const essential: FieldSpec[] = []
  const advanced: FieldSpec[] = []

  for (const field of fields) {
    if (isEssentialField(field)) {
      essential.push(field)
    } else {
      advanced.push(field)
    }
  }

  return { essential, advanced }
}

/**
 * Gets the count of fields in each category for debugging/logging
 */
export function getFieldCategoryCounts(fields: FieldSpec[]): {
  total: number
  essential: number
  advanced: number
} {
  const { essential, advanced } = categorizeFields(fields)

  return {
    total: fields.length,
    essential: essential.length,
    advanced: advanced.length
  }
}
