---
applyTo: 'src/app/api/**'
description: 'API route patterns and Next.js App Router conventions'
---

# API Routes Instructions

## Next.js App Router API Conventions

Maintain consistency in API layer design following established patterns.

### Required Route Structure

#### Runtime Declaration

Every API route must declare Node.js runtime:

```typescript
export const runtime = 'nodejs'
```

#### Standard Route Handler Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  // Define request schema
})

const ResponseSchema = z.object({
  // Define response schema
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Process request using parsed.data
    const result = await processRequest(parsed.data)

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Dynamic Route Handling

#### Parameter Extraction (Next.js 15 Pattern)

```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Handle request with slug parameter
}
```

#### Multi-Parameter Routes

```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await params
  // Handle nested parameters
}
```

### Zod Validation Patterns

#### Input Validation (Required)

```typescript
const parsed = RequestSchema.safeParse(payload)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
// Use parsed.data for type-safe access
```

#### Output Validation (Recommended)

```typescript
const responseData = {
  /* response object */
}
const validatedResponse = ResponseSchema.safeParse(responseData)
if (!validatedResponse.success) {
  console.error('Response validation failed:', validatedResponse.error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
return NextResponse.json(validatedResponse.data, { status: 200 })
```

### Error Handling Standards

#### Standard Error Response Format

```typescript
// 400 - Validation errors
return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

// 404 - Not found
return NextResponse.json({ error: 'Resource not found' }, { status: 404 })

// 500 - Server errors
const message = err instanceof Error ? err.message : 'unknown error'
return NextResponse.json({ error: message }, { status: 500 })
```

#### S3 Error Handling Pattern

```typescript
try {
  await runpodS3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  return true
} catch (err: unknown) {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>

    // Check $response.statusCode
    const rawResp = obj['$response']
    if (rawResp && typeof rawResp === 'object') {
      const statusVal = (rawResp as Record<string, unknown>)['statusCode']
      if (typeof statusVal === 'number' && statusVal === 404) return false
    }

    // Check $metadata.httpStatusCode
    const meta = obj['$metadata']
    if (meta && typeof meta === 'object') {
      const httpStatusCode = (meta as Record<string, unknown>)['httpStatusCode']
      if (typeof httpStatusCode === 'number' && httpStatusCode === 404) return false
    }
  }

  console.error('S3 operation failed', { bucket, key, error: err })
  return false
}
```

### HTTP Method Conventions

#### Supported Methods

- `GET` - Retrieve data (no body expected)
- `POST` - Create/submit data (body required)
- `PUT` - Update/replace data (body required)
- `DELETE` - Remove data (body optional)

#### Method-Specific Patterns

```typescript
// GET - Query parameters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const param = searchParams.get('param')
  // Process query parameters
}

// POST/PUT - Request body
export async function POST(req: NextRequest) {
  const body = await req.json()
  // Process request body
}
```

### Response Standards

#### Success Response Structure

```typescript
// Single resource
{ data: ResourceObject, status: 'success' }

// Collection/list
{ data: ResourceArray, total: number, page: number }

// Action result
{ success: true, message: 'Operation completed' }
```

#### Error Response Structure

```typescript
// Validation error
{ error: { field1: ['message'], field2: ['message'] } }

// General error
{ error: 'Error message' }

// Detailed error
{ error: 'Error message', details: { /* additional context */ } }
```

### File Organization

#### Route Grouping

- Group related routes in directories: `/workflows/`, `/volume/`, `/runpod/`
- Use `route.ts` files for actual handlers
- Create nested routes for specialized endpoints

#### Naming Conventions

- Use kebab-case for directory names
- Use descriptive route names: `/workflows/[slug]/preflight/route.ts`
- Avoid unnecessary nesting

### Security Considerations

#### Input Sanitization

- Always validate with Zod schemas
- Sanitize file names with established patterns
- Validate file types using `isAllowedMime()` function
- Apply size limits using `MAX_UPLOAD_BYTES` constant

#### Credential Handling

- Keep all secrets server-side only
- Never expose RunPod/B2 credentials to browser
- Use environment-based configuration
- Validate credentials at startup

### Performance Patterns

#### Efficient Operations

- Use `HeadObjectCommand` for S3 existence checks
- Apply timeout handling for S3 operations
- Stream file uploads without base64 conversion
- Implement proper caching headers where appropriate

#### Resource Management

- Close database connections properly
- Handle streaming responses correctly
- Use appropriate timeout values
- Log performance metrics for monitoring

### Testing Requirements

#### API Route Testing

```typescript
// Mock request/response objects
const mockRequest = new Request('http://localhost/api/test', {
  method: 'POST',
  body: JSON.stringify(testData)
})

const response = await POST(mockRequest, mockContext)
const body = await response.json()

expect(response.status).toBe(200)
expect(body).toMatchObject(expectedResponse)
```

#### Schema Testing

- Test Zod schemas independently
- Validate both success and failure cases
- Test edge cases and boundary conditions

Refer to [main Copilot instructions](../.github/copilot-instructions.md) for complete API patterns and [project conventions](../../docs/comfyui-worker/conventions.md) for additional standards.
