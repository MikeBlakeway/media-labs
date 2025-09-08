import { useState } from 'react'
import { z } from 'zod'
import { FieldSpecSchema } from '@/lib/templates.schema'
import type { ExportApiWorkflow } from '@/lib/workflow.infer'

const RegisterResponseSchema = z.object({
  ok: z.boolean(),
  slug: z.string(),
  fields: z.array(FieldSpecSchema)
})

type RegistrationStatus = 'idle' | 'registering' | 'registered'

interface RegistrationRequest {
  slug: string
  name: string
  workflow: ExportApiWorkflow
}

/**
 * Custom hook for workflow registration
 * Handles the POST request to register a new workflow with validation and state management
 */
export function useWorkflowRegistration() {
  const [status, setStatus] = useState<RegistrationStatus>('idle')
  const [error, setError] = useState<string>('')
  const [resultSlug, setResultSlug] = useState<string>('')

  const register = async (request: RegistrationRequest): Promise<boolean> => {
    const { slug, name, workflow } = request

    // Validate inputs
    if (slug.length < 2 || name.length < 2 || !workflow) {
      setError('Invalid registration data: slug and name must be at least 2 characters')
      return false
    }

    try {
      setStatus('registering')
      setError('')

      const res = await fetch('/api/workflows/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, name, workflow })
      })

      const dataUnknown = await res.json()
      const data = RegisterResponseSchema.safeParse(dataUnknown)

      if (!res.ok || !data.success || data.data.ok !== true) {
        const errorMessage = data.success
          ? 'Registration failed'
          : `Invalid server response: ${JSON.stringify(dataUnknown)}`
        setError(errorMessage)
        setStatus('idle')
        return false
      }

      setResultSlug(data.data.slug)
      setStatus('registered')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      setStatus('idle')
      return false
    }
  }

  const reset = () => {
    setStatus('idle')
    setError('')
    setResultSlug('')
  }

  return {
    status,
    error,
    resultSlug,
    registering: status === 'registering',
    registered: status === 'registered',
    register,
    reset
  }
}
