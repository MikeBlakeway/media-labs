---
applyTo: '**/*.test.ts,**/*.test.tsx,jest.config.js,src/components/__tests__/**'
description: 'Testing patterns and standards for React components and hooks'
---

# Testing Standards Instructions

## Testing Framework Configuration

Maintain consistency in testing approach using Jest with TypeScript support.

### Jest Configuration Standards

#### Required Jest Setup

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
}
```

#### Test Environment Setup

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path'
}))
```

### Hook Testing Patterns

#### Standard Hook Testing Structure

```typescript
import { renderHook, act } from '@testing-library/react'
import { useCustomHook } from '@/hooks/useCustomHook'

describe('useCustomHook', () => {
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useCustomHook())

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle async operations correctly', async () => {
    const { result } = renderHook(() => useCustomHook())

    await act(async () => {
      await result.current.performAction()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeDefined()
  })
})
```

#### Hook Testing Requirements

- Test all return values and their initial states
- Test async operations with proper `act()` wrapping
- Test error scenarios and edge cases
- Mock external dependencies (APIs, localStorage, etc.)
- Verify state updates occur correctly

### Component Testing Patterns

#### Standard Component Testing Structure

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Component } from '@/components/Component'

// Mock the hook dependencies
jest.mock('@/hooks/useCustomHook', () => ({
  useCustomHook: () => ({
    data: mockData,
    loading: false,
    error: null,
    actions: { performAction: jest.fn() }
  })
}))

describe('Component', () => {
  it('should render with correct initial state', () => {
    render(<Component prop1='value1' />)

    expect(screen.getByText('Expected Text')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('should handle user interactions correctly', async () => {
    const mockAction = jest.fn()
    // Update mock to use mockAction

    render(<Component />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledTimes(1)
    })
  })
})
```

#### Component Testing Requirements

- Focus on UI behavior, not business logic
- Mock all hook dependencies
- Test user interactions and event handling
- Test conditional rendering based on hook states
- Test accessibility features and ARIA attributes
- Avoid testing implementation details

### API Route Testing Patterns

#### API Route Testing Structure

```typescript
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/endpoint/route'

describe('/api/endpoint', () => {
  it('should handle valid requests correctly', async () => {
    const mockRequest = new NextRequest('http://localhost/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(mockRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject(expectedResponse)
  })

  it('should validate input and return 400 for invalid data', async () => {
    const mockRequest = new NextRequest('http://localhost/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(mockRequest)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })
})
```

### Schema Validation Testing

#### Zod Schema Testing Requirements

```typescript
import { WorkflowSchema } from '@/lib/workflow.schema'

describe('WorkflowSchema', () => {
  it('should validate correct workflow data', () => {
    const validData = {
      name: 'Test Workflow',
      description: 'Test description',
      parameters: {}
    }

    const result = WorkflowSchema.safeParse(validData)
    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.name).toBe('Test Workflow')
    }
  })

  it('should reject invalid workflow data', () => {
    const invalidData = {
      name: '', // Invalid: empty name
      description: 'Test description'
      // Missing required parameters
    }

    const result = WorkflowSchema.safeParse(invalidData)
    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2)
    }
  })
})
```

### Integration Testing Patterns

#### RunPod Integration Testing

```typescript
import { executeWorkflow } from '@/lib/runpod'

// Mock RunPod API responses
jest.mock('@/lib/runpod', () => ({
  executeWorkflow: jest.fn(),
  checkModelExists: jest.fn()
}))

describe('RunPod Integration', () => {
  it('should execute workflow successfully', async () => {
    const mockExecuteWorkflow = jest.mocked(executeWorkflow)
    mockExecuteWorkflow.mockResolvedValue({
      output: { images: ['base64...'] }
    })

    const result = await executeWorkflow(mockWorkflow)

    expect(result.output.images).toHaveLength(1)
    expect(mockExecuteWorkflow).toHaveBeenCalledWith(mockWorkflow)
  })
})
```

### Mock Patterns and Best Practices

#### External Service Mocking

```typescript
// Mock S3 operations
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn()
  })),
  HeadObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn()
}))

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

beforeEach(() => {
  jest.clearAllMocks()
})
```

#### Environment Variable Mocking

```typescript
describe('Configuration Tests', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should handle missing environment variables', () => {
    delete process.env.RUNPOD_API_KEY

    expect(() => {
      require('@/lib/config')
    }).toThrow('Missing required environment variable')
  })
})
```

### Test Organization and Structure

#### File Naming Conventions

- Unit tests: `ComponentName.test.tsx` or `hookName.test.ts`
- Integration tests: `feature.integration.test.ts`
- Test utilities: `src/__tests__/utils/testHelpers.ts`

#### Test Suite Organization

```typescript
describe('ComponentName', () => {
  describe('rendering', () => {
    // Rendering tests
  })

  describe('user interactions', () => {
    // Interaction tests
  })

  describe('error handling', () => {
    // Error scenario tests
  })
})
```

### Coverage Requirements

#### Minimum Coverage Targets

- Functions: 80%
- Statements: 80%
- Branches: 75%
- Lines: 80%

#### Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Generate coverage report
npm run test -- --coverage --watchAll=false
```

### Testing Commands and Scripts

#### Standard Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

### Video Component Testing

#### Video Player Testing Requirements

```typescript
import { render, screen } from '@testing-library/react'
import { VideoPlayer } from '@/components/VideoPlayer'

describe('VideoPlayer', () => {
  it('should render video element with correct attributes', () => {
    render(<VideoPlayer src='test-video.mp4' />)

    const video = screen.getByRole('video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video.src).toContain('test-video.mp4')
    expect(video.controls).toBe(true)
  })

  it('should handle video loading errors gracefully', () => {
    render(<VideoPlayer src='invalid-video.mp4' />)

    const video = screen.getByRole('video')
    fireEvent.error(video)

    expect(screen.getByText(/error loading video/i)).toBeInTheDocument()
  })
})
```

### Performance Testing Considerations

#### Component Performance Testing

```typescript
import { performance } from 'perf_hooks'

describe('Performance Tests', () => {
  it('should render large lists efficiently', () => {
    const start = performance.now()

    render(<LargeListComponent items={largeItemArray} />)

    const end = performance.now()
    expect(end - start).toBeLessThan(100) // Render in under 100ms
  })
})
```

Refer to [Jest documentation](https://jestjs.io/) for advanced testing patterns and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component testing best practices.
