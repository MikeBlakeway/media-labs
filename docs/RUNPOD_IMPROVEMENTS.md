# RunPod Integration Improvements

## Overview

This document outlines improvements needed to align our media-labs project with RunPod best practices, based on analysis of the comprehensive RunPod documentation in `docs/runpod/`.

**Analysis Date:** September 8, 2025
**Current State:** Basic RunPod integration with room for significant improvements
**Target:** Production-ready RunPod integration following official best practices

## Current Strengths

✅ **Good S3 Integration** - Proper error handling patterns with defensive S3 operations
✅ **Zod-First Validation** - Comprehensive schema validation throughout codebase
✅ **TypeScript Strict Mode** - Strong typing with Next.js App Router patterns
✅ **Clear Architecture** - Good separation between API routes and business logic
✅ **Environment Configuration** - Basic environment variable management

## Critical Improvements Needed

### 1. Enhanced Job State Management 🚨 **HIGH PRIORITY**

**Current State:**

- Only handles basic success/failure states
- Missing 4 of 6 official RunPod job states
- Generic error handling without state-specific logic

**Current Code Pattern:**

```typescript
// src/app/w/[slug]/page.tsx - Line ~35
const StatusRespSchema = z.object({
  status: z.enum(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
  output: z.unknown().optional()
})
```

**RunPod Best Practice:**
According to `docs/runpod/serverless/job-states.md`, RunPod defines 6 job states:

- `IN_QUEUE` - Job waiting for available worker
- `RUNNING` - Worker actively processing job
- `COMPLETED` - Job finished successfully
- `FAILED` - Job encountered error during execution
- `CANCELLED` - Job manually cancelled via `/cancel/job_id`
- `TIMED_OUT` - Job expired or worker failed to report back

**Required Changes:**

- [ ] Update `StatusRespSchema` to include all 6 states
- [ ] Implement state-specific handling logic
- [ ] Add job cancellation support
- [ ] Handle timeout scenarios with retry logic

**Files to Update:**

- `src/lib/runpod.ts` - Core type definitions
- `src/app/w/[slug]/page.tsx` - Client-side status handling
- `src/app/api/runpod/status/[id]/route.ts` - Server-side status API

### 2. Missing Timeout & Retry Logic 🚨 **HIGH PRIORITY**

**Current State:**

- No timeout handling for long-running jobs
- No retry mechanisms for failed requests
- Jobs can hang indefinitely

**RunPod Best Practice:**
From `docs/runpod/serverless/job-states.md` and `docs/runpod/development/debugging.md`:

- Implement configurable timeouts
- Add exponential backoff retry logic
- Handle network failures gracefully

**Required Implementation:**

```typescript
// New: src/lib/runpod.config.ts
export const RunPodConfig = {
  timeouts: {
    sync: 90000, // 90 seconds (RunPod default)
    async: 300000, // 5 minutes for long tasks
    status: 10000 // 10 seconds for status checks
  },
  retries: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  }
}

// Enhanced: src/lib/runpod.ts
export async function runAsyncWithRetry(input: RunpodInput, config = RunPodConfig.retries): Promise<RunpodAsyncResponse>
```

**Files to Create:**

- [ ] `src/lib/runpod.config.ts` - Configuration management
- [ ] `src/lib/runpod.retry.ts` - Retry logic implementation

**Files to Update:**

- [ ] `src/lib/runpod.ts` - Add timeout and retry wrappers
- [ ] `src/app/api/workflows/run/route.ts` - Use enhanced functions

### 3. Webhook Support for Async Jobs 🚨 **HIGH PRIORITY**

**Current State:**

- No webhook implementation
- Client must poll for job completion
- No real-time job status updates

**RunPod Best Practice:**
From `docs/runpod/serverless/send-requests.md`:

- Configure webhook notifications for job completion
- Verify webhook signatures for security
- Handle webhook retries and failures

**Required Implementation:**

```typescript
// New: src/app/api/webhooks/runpod/route.ts
export async function POST(req: NextRequest) {
  // Verify RunPod webhook signature
  const signature = req.headers.get('runpod-signature')
  const payload = await req.json()

  // Validate webhook payload
  const parsed = RunPodWebhookSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Handle job completion
  await handleJobCompletion(parsed.data)
  return NextResponse.json({ received: true })
}
```

**Files to Create:**

- [ ] `src/app/api/webhooks/runpod/route.ts` - Webhook handler
- [ ] `src/lib/runpod.webhooks.ts` - Webhook validation and processing
- [ ] `src/lib/runpod.signatures.ts` - Signature verification

**Environment Variables to Add:**

- [ ] `RUNPOD_WEBHOOK_SECRET` - For signature verification
- [ ] `RUNPOD_WEBHOOK_URL` - Public webhook URL for RunPod

## Architectural Improvements

### 4. Enhanced Environment Variable Management 🔧 **MEDIUM PRIORITY**

**Current State:**

- Basic fallback logic in `src/lib/runpodVolume.ts`
- Scattered environment variable handling
- No validation of environment configurations

**RunPod Best Practice:**
From `docs/runpod/development/environment-variables.md`:

- Organize variables by function (S3, API, endpoints)
- Validate required variables on startup
- Support multiple environments (dev/staging/prod)

**Required Changes:**

```typescript
// Enhanced: src/lib/runpod.config.ts
export const RunPodEnvironment = {
  // API Configuration
  api: {
    key: req('RUNPOD_API_KEY'),
    baseUrl: process.env.RUNPOD_API_BASE_URL ?? 'https://api.runpod.ai/v2'
  },

  // Endpoint Configuration
  endpoints: {
    primary: req('RUNPOD_ENDPOINT_ID'),
    fallback: process.env.RUNPOD_FALLBACK_ENDPOINT_ID
  },

  // Local Development
  local: {
    enabled: process.env.USE_LOCAL_WORKER === 'true',
    url: process.env.LOCAL_WORKER_URL ?? 'http://localhost:8000',
    port: parseInt(process.env.LOCAL_WORKER_PORT ?? '8000'),
    logLevel: (process.env.RUNPOD_LOG_LEVEL ?? 'INFO') as LogLevel
  },

  // S3 Storage (existing)
  storage: {
    bucket: req('RUNPOD_VOLUME_ID'),
    region: req('RUNPOD_S3_REGION'),
    endpoint: req('RUNPOD_S3_ENDPOINT'),
    accessKeyId: req('RUNPOD_S3_ACCESS_KEY_ID'),
    secretAccessKey: req('RUNPOD_S3_SECRET_ACCESS_KEY')
  }
}
```

**Files to Update:**

- [ ] `src/lib/runpodVolume.ts` - Use centralized config
- [ ] `src/lib/runpod.ts` - Use centralized config
- [ ] Add environment validation on app startup

### 5. Job Monitoring & Metrics 🔧 **MEDIUM PRIORITY**

**Current State:**

- Basic status checking without metrics
- No performance monitoring
- No insight into job execution patterns

**RunPod Best Practice:**
From `docs/runpod/serverless/job-states.md`:

- Track delay time, execution time, cold start time
- Monitor retry counts and failure patterns
- Log metrics for performance analysis

**Required Implementation:**

```typescript
// New: src/lib/runpod.metrics.ts
export interface JobMetrics {
  jobId: string
  delayTime?: number // Time in queue
  executionTime?: number // Processing time
  coldStartTime?: number // Container startup time
  retryCount: number // Number of retries
  status: RunPodJobState // Final status
  timestamp: Date // Completion time
}

export class JobMetricsTracker {
  static track(jobId: string, metrics: Partial<JobMetrics>) {
    // Log to console/monitoring service
    console.log(`[RunPod Metrics] Job ${jobId}:`, metrics)

    // Store for analysis
    this.storeMetrics(jobId, metrics)
  }
}
```

**Files to Create:**

- [ ] `src/lib/runpod.metrics.ts` - Metrics tracking
- [ ] `src/lib/runpod.monitoring.ts` - Performance monitoring

### 6. Enhanced Local Testing Infrastructure 🔧 **MEDIUM PRIORITY**

**Current State:**

- Basic local/remote endpoint switching
- No local testing utilities
- Missing development workflow patterns

**RunPod Best Practice:**
From `docs/runpod/development/test-locally.md`:

- Support multiple test input methods
- Implement proper logging levels
- Provide development debugging tools

**Required Implementation:**

```typescript
// Enhanced: src/lib/runpod.local.ts
export const LocalTestConfig = {
  enabled: process.env.NODE_ENV === 'development' && process.env.USE_LOCAL_WORKER === 'true',

  server: {
    port: parseInt(process.env.LOCAL_WORKER_PORT ?? '8000'),
    host: process.env.LOCAL_WORKER_HOST ?? 'localhost'
  },

  debugging: {
    logLevel: (process.env.RUNPOD_LOG_LEVEL as 'ERROR' | 'WARN' | 'INFO' | 'DEBUG') ?? 'INFO',
    verbose: process.env.RUNPOD_VERBOSE === 'true'
  },

  testInputs: {
    directory: process.env.LOCAL_TEST_INPUTS_DIR ?? './test-inputs',
    defaultWorkflow: process.env.DEFAULT_TEST_WORKFLOW ?? 'text-to-image'
  }
}
```

**Files to Create:**

- [ ] `src/lib/runpod.local.ts` - Local development utilities
- [ ] `test-inputs/` directory - Sample test inputs
- [ ] Development scripts for local testing

## Lower Priority Improvements

### 7. RunPod-Specific Workflow Validation 📋 **LOW PRIORITY**

**Current State:**

- Generic workflow validation
- No RunPod-specific constraint checking
- Missing validation for model requirements

**Potential Enhancement:**

- Validate workflows against RunPod limitations
- Check model size constraints
- Validate input/output formats

### 8. Job Cancellation Support 📋 **LOW PRIORITY**

**Current State:**

- No job cancellation endpoints
- Jobs cannot be stopped once started

**Potential Enhancement:**

- Implement `/cancel/job_id` endpoint
- Add cancellation UI components
- Handle cancellation state properly

### 9. Comprehensive Logging 📋 **LOW PRIORITY**

**Current State:**

- Basic console logging
- No structured logging format
- Missing debug information

**Potential Enhancement:**

- Implement structured logging
- Add configurable log levels
- Include RunPod-specific debug info

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)

1. Enhanced job state management
2. Timeout and retry logic
3. Basic webhook support

### Phase 2: Architecture Improvements (Week 2)

4. Environment variable organization
5. Job metrics tracking
6. Enhanced local testing

### Phase 3: Polish & Optimization (Week 3)

7. Workflow validation
8. Job cancellation
9. Comprehensive logging

## Success Metrics

- [ ] All 6 RunPod job states properly handled
- [ ] Zero hanging jobs due to timeout issues
- [ ] Webhook-based real-time updates working
- [ ] Comprehensive error handling and recovery
- [ ] Production-ready monitoring and metrics
- [ ] Smooth local development experience

## Reference Documentation

All improvements are based on comprehensive documentation in:

- `docs/runpod/glossary.md` - Terminology and concepts
- `docs/runpod/serverless/job-states.md` - Job state management
- `docs/runpod/serverless/send-requests.md` - Request patterns
- `docs/runpod/development/` - Development best practices
- `docs/runpod/storage/` - Storage integration patterns

## Next Steps

1. **Review and prioritize** improvements based on project needs
2. **Choose starting point** - recommend beginning with job state management
3. **Create feature branches** for each improvement area
4. **Implement incrementally** to maintain stability
5. **Test thoroughly** using local development patterns from documentation

---

**Last Updated:** September 8, 2025
**Status:** Planning Phase
**Next Review:** After Phase 1 completion
