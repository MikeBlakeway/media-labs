import { z } from 'zod'

export const FieldSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['file', 'string', 'text', 'integer', 'number', 'select', 'boolean']),
  required: z.boolean(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(z.string()).optional(),
  nodeId: z.string(),
  inputKey: z.string(),
  help: z.string().optional()
})

export const TemplateMetaSchema = z.object({
  slug: z.string(),
  name: z.string(),
  fields: z.array(FieldSpecSchema)
})
export type TemplateMeta = z.infer<typeof TemplateMetaSchema>

export const TemplatesListSchema = z.array(
  z.object({
    slug: z.string(),
    name: z.string()
  })
)
export type TemplatesList = z.infer<typeof TemplatesListSchema>
