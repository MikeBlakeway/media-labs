/**
 * Form Field Components
 *
 * Reusable form field components extracted from WorkflowContainer.
 * Handles different field types with consistent styling.
 */

import type { FieldSpec } from '@/lib/templates.types'

// Extract field type from template meta
type FieldType = FieldSpec

interface FormFieldProps {
  field: FieldType
  value: string | number | boolean | File | null
  onChange: (value: string | number | boolean | File | null) => void
  enhancedLabel: string
}

/**
 * Renders a form field based on its type
 */
export function FormField({ field, value, onChange, enhancedLabel }: FormFieldProps) {
  const baseInputClasses =
    'block w-full px-3 py-2 bg-input border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-primary dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

  return (
    <div key={field.id}>
      <label className='block text-sm font-medium text-secondary mb-1'>
        {enhancedLabel}
        {field.required && <span className='text-red-500 dark:text-red-400 ml-1'>*</span>}
      </label>

      {renderFieldInput()}

      {field.help && <p className='mt-1 text-xs text-muted'>{field.help}</p>}
    </div>
  )

  function renderFieldInput() {
    switch (field.type) {
      case 'file':
        return (
          <input
            type='file'
            onChange={e => {
              const file = e.target.files?.[0] || null
              onChange(file)
            }}
            className='block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-400 dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800'
          />
        )

      case 'select':
        return (
          <select value={String(value)} onChange={e => onChange(e.target.value)} className={baseInputClasses}>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'boolean':
        return (
          <input
            type='checkbox'
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked)}
            className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-input rounded dark:border-slate-600 dark:bg-slate-800'
          />
        )

      case 'text':
        return (
          <textarea
            value={String(value)}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className={baseInputClasses}
          />
        )

      case 'integer':
      case 'number':
        return (
          <input
            type='number'
            value={String(value)}
            onChange={e => onChange(Number(e.target.value))}
            className={baseInputClasses}
          />
        )

      default:
        return (
          <input
            type='text'
            value={String(value)}
            onChange={e => onChange(e.target.value)}
            className={baseInputClasses}
          />
        )
    }
  }
}

/**
 * Renders the form fields section
 */
interface FormFieldsSectionProps {
  fields: FieldType[]
  formData: Record<string, string | number | boolean | File | null>
  errors: string[]
  onFieldChange: (fieldId: string, value: string | number | boolean | File | null) => void
  getEnhancedLabel: (field: FieldType, allFields: FieldType[]) => string
}

export function FormFieldsSection({
  fields,
  formData,
  errors,
  onFieldChange,
  getEnhancedLabel
}: FormFieldsSectionProps) {
  return (
    <div className='bg-card rounded-lg border border-default p-4'>
      <h3 className='font-medium text-primary mb-4'>Workflow Parameters</h3>

      {errors.length > 0 && (
        <div className='mb-4 bg-red-50 border border-red-200 rounded p-3 dark:bg-red-900/20 dark:border-red-800'>
          <div className='text-red-800 text-sm dark:text-red-300'>
            {errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        </div>
      )}

      <div className='space-y-4'>
        {fields.map(field => {
          const enhancedLabel = getEnhancedLabel(field, fields)
          const value = formData[field.id]

          return (
            <FormField
              key={field.id}
              field={field}
              value={value}
              onChange={newValue => onFieldChange(field.id, newValue)}
              enhancedLabel={enhancedLabel}
            />
          )
        })}
      </div>
    </div>
  )
}
