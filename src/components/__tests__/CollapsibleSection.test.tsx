// Note: This test file is created for ML-002 story completion
// Basic unit tests for the logic functions used in the CollapsibleSection feature.

import { categorizeFields, getFieldCategoryCounts } from '../../lib/field-categorization'
import type { FieldSpec } from '../../lib/templates.types'

// Utility function from FieldSummaryBadge for testing
function useFieldSummary(fields: FieldSpec[], formData: Record<string, string | number | boolean | File | null>) {
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

describe('Field Categorization', () => {
  const createField = (id: string, label: string, type: FieldSpec['type'], inputKey: string = 'value'): FieldSpec => ({
    id,
    label,
    type,
    required: false,
    nodeId: '1',
    inputKey,
    defaultValue: undefined
  })

  describe('categorizeFields', () => {
    it('categorizes file fields as essential', () => {
      const fields = [createField('upload1', 'Input Image', 'file'), createField('upload2', 'Input Video', 'file')]

      const { essential, advanced } = categorizeFields(fields)

      expect(essential).toHaveLength(2)
      expect(advanced).toHaveLength(0)
      expect(essential[0].type).toBe('file')
      expect(essential[1].type).toBe('file')
    })

    it('categorizes prompt fields as essential', () => {
      const fields = [
        createField('prompt1', 'Positive Prompt', 'text', 'text'),
        createField('prompt2', 'Negative Description', 'string', 'prompt'),
        createField('other', 'Some Other Text', 'text', 'other')
      ]

      const { essential, advanced } = categorizeFields(fields)

      expect(essential).toHaveLength(2)
      expect(advanced).toHaveLength(1)
      expect(essential.map(f => f.id)).toEqual(['prompt1', 'prompt2'])
      expect(advanced[0].id).toBe('other')
    })

    it('categorizes size fields as essential', () => {
      const fields = [
        createField('width', 'Width', 'integer', 'width'),
        createField('height', 'Height', 'integer', 'height'),
        createField('frames', 'Frame Count', 'number', 'frames'),
        createField('steps', 'Steps', 'integer', 'steps')
      ]

      const { essential, advanced } = categorizeFields(fields)

      expect(essential).toHaveLength(3)
      expect(advanced).toHaveLength(1)
      expect(essential.map(f => f.id)).toEqual(['width', 'height', 'frames'])
      expect(advanced[0].id).toBe('steps')
    })

    it('categorizes advanced fields correctly', () => {
      const fields = [
        createField('model', 'Model Name', 'select'),
        createField('cfg', 'CFG Scale', 'number'),
        createField('seed', 'Seed', 'integer'),
        createField('sampler', 'Sampler', 'select')
      ]

      const { essential, advanced } = categorizeFields(fields)

      expect(essential).toHaveLength(0)
      expect(advanced).toHaveLength(4)
    })

    it('handles mixed field types', () => {
      const fields = [
        createField('image', 'Input Image', 'file'),
        createField('prompt', 'Prompt', 'text', 'text'),
        createField('width', 'Width', 'integer', 'width'),
        createField('model', 'Model', 'select'),
        createField('cfg', 'CFG Scale', 'number')
      ]

      const { essential, advanced } = categorizeFields(fields)

      expect(essential).toHaveLength(3)
      expect(advanced).toHaveLength(2)
      expect(essential.map(f => f.id)).toEqual(['image', 'prompt', 'width'])
      expect(advanced.map(f => f.id)).toEqual(['model', 'cfg'])
    })
  })

  describe('getFieldCategoryCounts', () => {
    it('returns correct counts', () => {
      const fields = [
        createField('image', 'Input Image', 'file'),
        createField('prompt', 'Prompt', 'text', 'text'),
        createField('model', 'Model', 'select'),
        createField('cfg', 'CFG Scale', 'number')
      ]

      const counts = getFieldCategoryCounts(fields)

      expect(counts).toEqual({
        total: 4,
        essential: 2,
        advanced: 2
      })
    })

    it('handles empty field list', () => {
      const counts = getFieldCategoryCounts([])

      expect(counts).toEqual({
        total: 0,
        essential: 0,
        advanced: 0
      })
    })
  })
})

describe('Field Summary', () => {
  const createField = (
    id: string,
    label: string,
    type: FieldSpec['type'],
    defaultValue?: string | number | boolean
  ): FieldSpec => ({
    id,
    label,
    type,
    required: false,
    nodeId: '1',
    inputKey: 'value',
    defaultValue
  })

  describe('useFieldSummary', () => {
    it('returns null when no fields are modified', () => {
      const fields = [
        createField('field1', 'Field 1', 'string', 'default'),
        createField('field2', 'Field 2', 'number', 10)
      ]
      const formData = {
        field1: 'default',
        field2: 10
      }

      const summary = useFieldSummary(fields, formData)
      expect(summary).toBeNull()
    })

    it('counts modified fields correctly', () => {
      const fields = [
        createField('field1', 'Field 1', 'string', 'default'),
        createField('field2', 'Field 2', 'number', 10),
        createField('field3', 'Field 3', 'string')
      ]
      const formData = {
        field1: 'changed',
        field2: 10,
        field3: 'set'
      }

      const summary = useFieldSummary(fields, formData)
      expect(summary).toBe('2 settings modified')
    })

    it('handles single modified field', () => {
      const fields = [createField('field1', 'Field 1', 'string', 'default')]
      const formData = {
        field1: 'changed'
      }

      const summary = useFieldSummary(fields, formData)
      expect(summary).toBe('1 setting modified')
    })

    it('counts file fields as modified when set', () => {
      const fields = [createField('upload', 'Upload', 'file')]
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const formData = {
        upload: mockFile
      }

      const summary = useFieldSummary(fields, formData)
      expect(summary).toBe('1 setting modified')
    })

    it('ignores empty values', () => {
      const fields = [createField('field1', 'Field 1', 'string'), createField('field2', 'Field 2', 'string')]
      const formData = {
        field1: '',
        field2: null
      }

      const summary = useFieldSummary(fields, formData)
      expect(summary).toBeNull()
    })
  })
})
