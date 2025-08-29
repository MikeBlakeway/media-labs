# Video API Implementation - Local Fake Mode Architecture

## Overview

This document details the technical implementation of the `VIDEO_RUN_MODE=local_fake` feature in the video jobs API, covering architecture decisions, code organization, and integration patterns.

## Architecture Decision Records

### ADR-001: Mode-Based Branching Strategy

**Decision**: Implement mode detection at the route handler level with early branching based on `VIDEO_RUN_MODE` environment variable.

**Rationale**:
- Keeps cloud mode logic completely unchanged
- Minimal performance impact (single environment variable check)
- Clear separation of concerns between modes
- Easy to maintain and extend

**Implementation**:
```typescript
const videoRunMode = process.env.VIDEO_RUN_MODE

if (videoRunMode === 'local_fake') {
  // Local simulation path
  await uploadImages(allFiles, job.id) // Generates placeholder URLs
  processLocalFakeJob(job.id) // Async simulation
  
  res.status(201).json({
    id: job.id,
    status: 'QUEUED'
  })
} else {
  // Existing cloud mode logic unchanged
  // ... RunPod submission logic
}
```

### ADR-002: Shared Function Approach for Image Handling

**Decision**: Reuse the `uploadImages()` function for both modes with internal mode detection.

**Rationale**:
- Single function handles both upload and simulation
- Consistent return type (`RunPodImage[]`)
- Shared validation and error handling logic
- Simplifies testing with single interface

**Implementation**:
```typescript
async function uploadImages(files: Express.Multer.File[], jobId: string): Promise<RunPodImage[]> {
  const videoRunMode = process.env.VIDEO_RUN_MODE
  
  if (videoRunMode === 'local_fake') {
    // Local simulation implementation
    return generatePlaceholderImages(files, jobId)
  } else {
    // Cloud upload implementation
    return uploadToB2Storage(files, jobId)
  }
}
```

### ADR-003: Async Processing Simulation

**Decision**: Use `setTimeout` for processing simulation rather than immediate completion.

**Rationale**:
- Realistic timing helps identify race conditions
- Tests real-world SSE broadcasting behavior
- Provides better development experience
- Matches production workflow timing patterns

**Implementation**:
```typescript
function processLocalFakeJob(jobId: string): void {
  // Initial delay before starting
  setTimeout(async () => {
    await updateJobStatus(jobId, 'RUNNING', 10)
    
    // Random processing time (30-60 seconds)
    const processingTime = Math.random() * 30000 + 30000
    setTimeout(async () => {
      await completeLocalFakeJob(jobId)
    }, processingTime)
  }, 10000) // 10 second initial delay
}
```

### ADR-004: Placeholder URL Strategy

**Decision**: Generate deterministic placeholder URLs that follow the same pattern as real uploads.

**Rationale**:
- Predictable URLs aid debugging
- Same URL structure as production
- Easy to identify fake vs real URLs
- Supports frontend development needs

**URL Pattern**:
```
Real: https://bucket.backblaze.com/temp/{jobId}/start_image.png
Fake: https://placeholder.images/temp/{jobId}/start_image.png
```

## Code Organization

### File Structure

```
apps/api/src/routes/video-jobs.ts
├── Helper Functions
│   ├── sortImagesByName()     # Shared sorting logic
│   ├── validateFiles()        # File validation
│   ├── loadWorkflow()         # Workflow configuration
│   └── uploadImages()         # Mode-aware image handling
├── Local Fake Mode Functions
│   ├── processLocalFakeJob()  # Processing simulation
│   └── completeLocalFakeJob() # Completion logic
└── Route Handlers
    ├── POST /api/jobs         # Main job creation endpoint
    └── Other endpoints...     # Status, SSE, etc.
```

### Function Responsibilities

#### `sortImagesByName(images: RunPodImage[]): RunPodImage[]`

**Purpose**: Ensures consistent image ordering (start_image.png first, then end_image.png).

**Rationale**: Extracted from duplicated code in both mode branches to follow DRY principle.

**Usage**:
```typescript
// Both modes use the same sorting logic
const sortedImages = sortImagesByName(images)
```

#### `uploadImages(files: Express.Multer.File[], jobId: string): Promise<RunPodImage[]>`

**Purpose**: Handle image upload/simulation with mode detection.

**Mode Behavior**:
- **Local Fake**: Generate placeholder URLs, log simulation
- **Cloud**: Upload to B2 storage, return real URLs

**Error Handling**: Both modes throw errors with consistent format for upstream handling.

#### `processLocalFakeJob(jobId: string): void`

**Purpose**: Simulate the complete video processing lifecycle.

**Lifecycle**:
1. Initial 10-second delay
2. Update to RUNNING status (10% progress)
3. Random 30-60 second processing time
4. Complete with placeholder output URL

**SSE Integration**: Uses existing `broadcastToJob()` for real-time updates.

## Integration Patterns

### Database Integration

Local fake mode uses identical database operations as cloud mode:

```typescript
// Same Prisma operations in both modes
const job = await prisma.job.create({
  data: {
    frames: parseInt(frames),
    fps: parseInt(fps),
    resolution: resolution as Resolution,
    status: 'QUEUED',
    // ... other fields
  }
})
```

### SSE Broadcasting

Shared SSE broadcasting ensures consistent real-time updates:

```typescript
// Same broadcasting logic for both modes
await broadcastToJob(jobId, {
  status: 'RUNNING',
  progressPct: 10,
  message: 'Processing started...'
})
```

### Error Handling

Consistent error handling patterns across modes:

```typescript
try {
  const images = await uploadImages(allFiles, job.id)
  // Mode-specific logic...
} catch (error) {
  // Same error response format for both modes
  res.status(500).json({
    error: 'Upload failed',
    message: error instanceof Error ? error.message : 'Unknown error'
  })
}
```

## Testing Strategy

### Unit Tests

Test individual functions with mode-specific behavior:

```typescript
describe('sortImagesByName', () => {
  it('should sort images with start_image.png first', () => {
    const images = [
      { name: 'end_image.png', url: 'url2' },
      { name: 'start_image.png', url: 'url1' }
    ]
    
    const sorted = sortImagesByName(images)
    
    expect(sorted[0].name).toBe('start_image.png')
    expect(sorted[1].name).toBe('end_image.png')
  })
})

describe('uploadImages', () => {
  it('should generate placeholder URLs in local_fake mode', async () => {
    process.env.VIDEO_RUN_MODE = 'local_fake'
    
    const files = [
      { fieldname: 'startImage', /* ... */ },
      { fieldname: 'endImage', /* ... */ }
    ]
    
    const images = await uploadImages(files, 'test-job-id')
    
    expect(images[0].url).toContain('placeholder.images')
    expect(images[0].url).toContain('test-job-id')
  })
})
```

### Integration Tests

Test end-to-end workflow in both modes:

```typescript
describe('Video Job API', () => {
  describe('local_fake mode', () => {
    beforeEach(() => {
      process.env.VIDEO_RUN_MODE = 'local_fake'
    })

    it('should create and process job without cloud dependencies', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .attach('startImage', 'test/start.png')
        .attach('endImage', 'test/end.png')
        .field('frames', '16')

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('QUEUED')

      // Verify job progresses to completion
      await waitForJobStatus(response.body.id, 'COMPLETED')
    })
  })
})
```

## Configuration Management

### Environment Variable Precedence

```typescript
// Default to cloud mode if not specified
const videoRunMode = process.env.VIDEO_RUN_MODE || 'cloud'
```

### Mode Validation

```typescript
const VALID_MODES = ['local_fake', 'cloud'] as const
type VideoRunMode = typeof VALID_MODES[number]

function validateVideoRunMode(mode: string): VideoRunMode {
  if (!VALID_MODES.includes(mode as VideoRunMode)) {
    throw new Error(`Invalid VIDEO_RUN_MODE: ${mode}. Valid options: ${VALID_MODES.join(', ')}`)
  }
  return mode as VideoRunMode
}
```

### Configuration Loading

```typescript
// Validate mode early in application startup
const videoRunMode = validateVideoRunMode(process.env.VIDEO_RUN_MODE || 'cloud')

if (videoRunMode === 'cloud') {
  // Validate cloud-specific configuration
  validateCloudConfig()
}
```

## Performance Considerations

### Memory Usage

Local fake mode has minimal memory overhead:
- No file uploads to external storage
- Placeholder URLs are small strings
- Same database operations as cloud mode

### CPU Usage

Processing simulation uses minimal CPU:
- Simple setTimeout operations
- No actual video processing
- Lightweight status updates

### Network Usage

Significantly reduced network usage:
- No external API calls to RunPod
- No file uploads to B2 storage
- Local SSE connections only

## Security Considerations

### File Validation

Both modes perform the same file validation:
- File type checking
- Size limits
- Content validation

### Placeholder URLs

Placeholder URLs are safe for development:
- No sensitive information exposed
- Deterministic but not predictable externally
- Clear identification as non-production URLs

### Environment Isolation

Mode detection prevents accidental cloud resource usage:
- Explicit environment variable required
- No fallback to cloud mode with missing config
- Clear separation of development vs production

## Monitoring and Debugging

### Logging Strategy

Enhanced logging for local fake mode:

```typescript
if (videoRunMode === 'local_fake') {
  console.log(`🎭 Local fake mode: Processing job ${jobId}`)
  console.log(`🎭 Simulated image upload: ${imageName} -> ${imageUrl}`)
  console.log(`🎭 Job will complete in ${processingTime}ms`)
}
```

### Debug Information

Additional debug information available:

```typescript
// Add mode information to job responses
res.status(201).json({
  id: job.id,
  status: 'QUEUED',
  ...(process.env.NODE_ENV === 'development' && {
    debug: {
      mode: videoRunMode,
      placeholderUrls: videoRunMode === 'local_fake'
    }
  })
})
```

## Migration Guide

### Existing Codebases

To add local fake mode to existing video job implementations:

1. **Add mode detection**:
   ```typescript
   const videoRunMode = process.env.VIDEO_RUN_MODE
   ```

2. **Branch upload logic**:
   ```typescript
   if (videoRunMode === 'local_fake') {
     // Generate placeholder URLs
   } else {
     // Existing cloud upload logic
   }
   ```

3. **Add processing simulation**:
   ```typescript
   if (videoRunMode === 'local_fake') {
     processLocalFakeJob(job.id)
     return // Skip cloud submission
   }
   ```

4. **Extract common functions**:
   - Move duplicated code to helper functions
   - Ensure consistent interfaces

### Testing Migration

Verify both modes work correctly:

```bash
# Test cloud mode (if configured)
unset VIDEO_RUN_MODE
npm test

# Test local fake mode
export VIDEO_RUN_MODE=local_fake
npm test
```

## Future Enhancements

### Planned Improvements

1. **Configurable Timing**:
   ```env
   VIDEO_LOCAL_FAKE_MIN_TIME=30000
   VIDEO_LOCAL_FAKE_MAX_TIME=60000
   ```

2. **Enhanced Simulation**:
   - More realistic progress patterns
   - Simulated failure scenarios
   - Configurable output formats

3. **Development Tools**:
   - Admin interface for job management
   - Visual progress monitoring
   - Simulation controls

### Extension Points

The architecture supports easy extension:

```typescript
// Additional simulation modes
type VideoRunMode = 'local_fake' | 'cloud' | 'local_gpu' | 'mock_failure'

// Mode-specific processors
const processors = {
  local_fake: processLocalFakeJob,
  cloud: processCloudJob,
  local_gpu: processLocalGpuJob,
  mock_failure: processMockFailureJob
}
```

## Related Documentation

- [Video Local Fake Mode - Developer Guide](./video-local-fake-mode.md) - User-facing documentation
- [API Video Jobs](./api-video-jobs.md) - Complete API reference
- [How to Develop](./how-to-develop.md) - Development environment setup

## Contributing

### Code Standards

- Maintain consistent error handling across modes
- Use TypeScript for all new functions
- Follow existing logging patterns
- Extract common logic to helper functions

### Testing Requirements

- Add tests for both modes when modifying shared logic
- Verify mode switching works correctly
- Test error scenarios in both modes
- Maintain test isolation between modes

### Documentation Updates

- Update this document for architectural changes
- Update user guide for behavior changes
- Add JSDoc comments to new functions
- Update API documentation for new endpoints