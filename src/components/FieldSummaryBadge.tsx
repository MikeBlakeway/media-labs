'use client'

import type { FieldSpec } from '@/lib/templates.types'

interface FieldSummaryBadgeProps {
  fields: FieldSpec[]
  formData: Record<string, string | number | boolean | File | null>
}

/**
 * Helper component to count and summarize non-default field values
 * Shows a count of advanced settings that have been modified from defaults
 */
export function useFieldSummary(
  fields: FieldSpec[],
  formData: Record<string, string | number | boolean | File | null>
) {
  const nonDefaultCount = fields.reduce((count, field) => {
    const currentValue = formData[field.id]
    const defaultValue = field.defaultValue

    // Skip if no current value set
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      return count
    }

    // For file fields, always count as modified if a file is selected
    if (field.type === 'file' && currentValue instanceof File) {
      return count + 1
    }

    // Compare with default value
    if (defaultValue !== undefined && currentValue !== defaultValue) {
      return count + 1
    }

    // If no default is specified but value is set, consider it modified
    if (defaultValue === undefined && currentValue !== '') {
      return count + 1
    }

    return count
  }, 0)

  if (nonDefaultCount === 0) {
    return null
  }

  return nonDefaultCount === 1 ? '1 setting modified' : `${nonDefaultCount} settings modified`
}

/**
 * Component version for direct use in JSX
 */
export function FieldSummaryBadge({ fields, formData }: FieldSummaryBadgeProps) {
  const summaryText = useFieldSummary(fields, formData)

  if (!summaryText) {
    return null
  }

  return (
    <span className='px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full'>
      {summaryText}
    </span>
  )
}
