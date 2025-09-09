# React Hooks Reference

## Overview

The media-labs project uses a hooks-based architecture to manage workflow execution, file uploads, form state, and job processing. All hooks are centrally exported from `src/hooks/index.ts` and follow consistent TypeScript patterns.

## Import Pattern

```typescript
import { useWorkflowTemplate, useJobManagement } from '@/hooks'
```

## Hook Categories

### Template & Workflow Management

- **useWorkflowTemplate** - Load workflow metadata and definitions
- **useWorkflowsList** - Manage available workflows list
- **useWorkflowRegistration** - Register new workflows
- **useWorkflowManagement** - General workflow operations
- **useWorkflowEditor** - Edit workflow configurations

### Form Management

- **useWorkflowForm** - Form state, validation, field operations
- **useFieldLabeling** - Dynamic field labeling and descriptions

### Job Management & Execution

- **useJobManagement** - Job submission, polling, status tracking
- **useWorkflowRunner** - Execute workflows with mode selection
- **useWorkflowRunnerJob** - Specific job execution logic
- **useEnhancedPolling** - Advanced polling with backoff strategies

### File Upload & Storage

- **useFileUpload** - File upload with progress tracking
- **useUploadCard** - Upload UI state management

### Validation & Checks

- **useWorkflowPreflight** - Pre-execution validation
- **useManualPreflight** - Manual validation controls

### Results & Display

- **useResultHistory** - Result history management
- **useResultsDisplay** - Result presentation logic
- **useOutputProcessor** - Process and transform outputs

### Progress & UI State

- **useProgressCalculation** - Calculate execution progress
- **useProgressTimer** - Timer-based progress tracking

## Core Hook APIs

### useWorkflowTemplate(slug: string)

Loads workflow metadata and definitions.

```typescript
interface UseWorkflowTemplateResult {
  meta: TemplateMeta | null
  workflow: ExportApiWorkflow | null
  loading: boolean
  error: string
  refetch: () => Promise<void>
  isReady: boolean
}
```

**Usage:**

```typescript
const { meta, workflow, loading, isReady } = useWorkflowTemplate('image-gen')
```

### useJobManagement()

Manages RunPod job lifecycle with status tracking.

```typescript
interface UseJobManagementResult {
  jobId: string
  status: string
  jobResults: unknown | null
  jobError: string
  submitting: boolean
  jobStartTime: number | undefined
  pollAttempts: number
  submitJob: (slug: string, patches: JobPatch[]) => Promise<void>
  cancelJob: () => Promise<void>
  forceCheckStatus: () => Promise<void>
  resetJob: () => void
  isTerminal: boolean
  isSuccess: boolean
  duration: number | undefined
}
```

**Usage:**

```typescript
const { submitJob, status, jobResults, isTerminal } = useJobManagement()
```

### useWorkflowForm(meta: TemplateMeta | null)

Manages form state with validation and file handling.

```typescript
interface UseWorkflowFormResult {
  formData: Record<string, ValueUnion>
  errors: string[]
  isDirty: boolean
  updateField: (fieldId: string, value: ValueUnion) => void
  validateForm: () => boolean
  resetForm: () => void
  setInitialValues: (values: Record<string, ValueUnion>) => void
  isValid: boolean
  hasFileUploads: boolean
  getSubmissionPatches: () => Array<JobPatch>
}
```

### useFileUpload()

Handles file uploads with progress tracking.

```typescript
interface UseFileUploadResult {
  uploads: UploadState[]
  uploading: boolean
  uploadFile: (file: File, fieldId: string) => Promise<string | null>
  uploadFiles: (files: Array<{ file: File; fieldId: string }>) => Promise<Record<string, string>>
  removeUpload: (fieldId: string) => void
  clearUploads: () => void
  hasUploads: boolean
  completedUploads: UploadState[]
  failedUploads: UploadState[]
}
```

### useEnhancedPolling(options)

Advanced polling with exponential backoff and progress estimation.

```typescript
interface UseEnhancedPollingOptions {
  onComplete?: (results: unknown) => void
  onError?: (error: string) => void
  maxAttempts?: number
  baseInterval?: number
}
```

### useWorkflowRunner(slug: string, mode: WorkflowMode)

Main workflow execution orchestrator.

```typescript
interface UseWorkflowRunnerResult {
  status: string
  results: unknown | null
  error: string
  progress: number
  isRunning: boolean
  canSubmit: boolean
  runWorkflow: (formData: Record<string, ValueUnion>) => Promise<void>
  resetRunner: () => void
}
```

## Adding New Hooks

### File Organization

- Name: `use[Feature][Aspect].ts`
- Location: `src/hooks/`
- Export: Add to `index.ts` with types

### Hook Structure Template

```typescript
/**
 * use[Feature] Hook
 * Brief description of purpose
 */

export interface Use[Feature]Result {
  // State
  data: SomeType | null
  loading: boolean
  error: string

  // Actions
  someAction: () => Promise<void>

  // Computed
  isReady: boolean
}

export function use[Feature](): Use[Feature]Result {
  // Implementation
}
```

### Integration Patterns

- Use Zod schemas for API response validation
- Follow async/await patterns for API calls
- Include loading/error states
- Provide cleanup functions for subscriptions
- Export TypeScript interfaces

### Testing

- Test with `@testing-library/react-hooks`
- Mock API calls and external dependencies
- Test loading states and error conditions
- Verify cleanup on unmount

## Common Patterns

### Error Handling

```typescript
try {
  setLoading(true)
  const result = await apiCall()
  setData(result)
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)
}
```

### Cleanup

```typescript
useEffect(() => {
  return () => {
    // Cleanup subscriptions, timers, etc.
  }
}, [])
```

## Troubleshooting

### State Synchronization

- Use `useCallback` for stable function references
- Manage dependencies carefully in `useEffect`
- Consider using `useRef` for values that shouldn't trigger re-renders

### Performance

- Memoize expensive calculations with `useMemo`
- Debounce frequent state updates
- Use proper dependency arrays to prevent unnecessary re-renders

### TypeScript Issues

- Export all interfaces from hook files
- Use generic types for flexible APIs
- Provide default values for optional parameters

### Memory Leaks

- Always cleanup timers, intervals, and subscriptions
- Cancel ongoing API requests in cleanup functions
- Use AbortController for fetch requests

## Hook Dependencies

Most hooks depend on:

- Zod for schema validation
- Internal types from `@/lib/templates.schema`
- API utilities from `@/lib/runpod`
- Next.js App Router conventions

## Quick Reference

| Hook                | Purpose                | Key Returns                      |
| ------------------- | ---------------------- | -------------------------------- |
| useWorkflowTemplate | Load workflow data     | meta, workflow, isReady          |
| useJobManagement    | Job execution          | submitJob, status, results       |
| useWorkflowForm     | Form state             | formData, updateField, isValid   |
| useFileUpload       | File handling          | uploadFile, uploads, progress    |
| useEnhancedPolling  | Status polling         | startPolling, status, attempts   |
| useWorkflowRunner   | Workflow orchestration | runWorkflow, progress, canSubmit |
