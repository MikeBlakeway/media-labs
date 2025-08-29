# FLF2V Migration Guide

## Overview

This guide helps developers transition from using the JSON `params` field to the new dedicated video fields in the Job model for FLF2V (First-Last-Frame-to-Video) integration.

## Migration Steps

### 1. Update Your Job Creation Code

**Before (using JSON params):**
```typescript
const job = await prisma.job.create({
  data: {
    status: JobStatus.QUEUED,
    lane: JobLane.VIDEO,
    params: {
      frames: 120,
      fps: 30,
      width: 1024,
      height: 1024,
      // other parameters...
    }
  }
});
```

**After (using dedicated fields):**
```typescript
const job = await prisma.job.create({
  data: {
    status: JobStatus.QUEUED,
    lane: JobLane.VIDEO,
    params: {
      // other parameters...
    },
    // New dedicated fields
    frames: 120,
    fps: 30,
    width: 1024,
    height: 1024
  }
});
```

### 2. Update Your Query Code

**Before (filtering with JSON params):**
```typescript
// This was complex and slow
const jobs = await prisma.job.findMany({
  where: {
    // Complex JSON queries were difficult
  }
});
```

**After (using dedicated fields):**
```typescript
// Now simple and fast with proper indexes
const hdJobs = await prisma.job.findMany({
  where: {
    lane: JobLane.VIDEO,
    width: { gte: 1920 },
    height: { gte: 1080 }
  },
  orderBy: { createdAt: 'desc' }
});

const shortVideos = await prisma.job.findMany({
  where: {
    frames: { lte: 60 } // 2 seconds at 30fps
  }
});
```

### 3. Update Your Analytics Code

**Before (manual JSON parsing):**
```typescript
// Complex aggregation with JSON parsing
const jobs = await prisma.job.findMany();
const avgWidth = jobs
  .filter(job => job.params?.width)
  .reduce((sum, job) => sum + job.params.width, 0) / jobs.length;
```

**After (database-level aggregation):**
```typescript
// Fast database-level aggregation
const stats = await prisma.job.aggregate({
  where: { lane: JobLane.VIDEO },
  _avg: {
    width: true,
    height: true,
    frames: true,
    fps: true
  }
});
```

### 4. Update Error Handling

**Before (single error field):**
```typescript
if (job.failureReason) {
  console.log('Job failed:', job.failureReason);
}
```

**After (enhanced error fields):**
```typescript
if (job.error) {
  console.log('Technical error:', job.error);
} else if (job.failureReason) {
  console.log('User-friendly error:', job.failureReason);
}
```

## Backward Compatibility

### Reading Existing Data

For existing jobs that only have JSON params, you can create a helper function:

```typescript
function getVideoParams(job: Job) {
  return {
    frames: job.frames ?? job.params?.frames,
    fps: job.fps ?? job.params?.fps,
    width: job.width ?? job.params?.width,
    height: job.height ?? job.params?.height
  };
}

// Usage
const videoParams = getVideoParams(job);
console.log(`Video: ${videoParams.width}x${videoParams.height} at ${videoParams.fps}fps`);
```

### Gradual Migration Strategy

1. **Phase 1** (Current): Write to both JSON and dedicated fields
2. **Phase 2** (Future): Background migration script to populate dedicated fields
3. **Phase 3** (Future): Remove video params from JSON, use only dedicated fields

## Performance Benefits

### Query Performance

| Operation | Before (JSON) | After (Dedicated Fields) | Improvement |
|-----------|---------------|--------------------------|-------------|
| Filter by status | Table scan | Index lookup | ~10x faster |
| Sort by date | Full sort | Index order | ~100x faster |
| Video param queries | JSON parsing | Direct column | ~5x faster |

### Example: Status + Date Query

**Before:**
```sql
-- Slow: No indexes, full table scan
SELECT * FROM Job 
WHERE status = 'RUNNING' 
ORDER BY createdAt DESC;
```

**After:**
```sql
-- Fast: Uses compound index
SELECT * FROM Job 
WHERE status = 'RUNNING' 
ORDER BY createdAt DESC;
-- Uses: Job_status_createdAt_idx
```

## Common Patterns

### Video Duration Calculation

```typescript
function getVideoDuration(job: Job): number | null {
  const frames = job.frames ?? job.params?.frames;
  const fps = job.fps ?? job.params?.fps;
  
  if (!frames || !fps) return null;
  return frames / fps; // Duration in seconds
}
```

### Aspect Ratio Calculation

```typescript
function getAspectRatio(job: Job): number | null {
  const width = job.width ?? job.params?.width;
  const height = job.height ?? job.params?.height;
  
  if (!width || !height) return null;
  return width / height;
}
```

### Quality Classification

```typescript
function getQualityTier(job: Job): 'SD' | 'HD' | '4K' | 'Unknown' {
  const width = job.width ?? job.params?.width;
  const height = job.height ?? job.params?.height;
  
  if (!width || !height) return 'Unknown';
  
  const pixels = width * height;
  
  if (pixels >= 3840 * 2160) return '4K';
  if (pixels >= 1920 * 1080) return 'HD';
  return 'SD';
}
```

## Testing Your Migration

### Unit Test Example

```typescript
describe('Job Video Fields Migration', () => {
  it('should read from dedicated fields when available', async () => {
    const job = await prisma.job.create({
      data: {
        status: JobStatus.QUEUED,
        lane: JobLane.VIDEO,
        params: {},
        frames: 60,
        fps: 30,
        width: 1920,
        height: 1080
      }
    });

    expect(job.frames).toBe(60);
    expect(job.fps).toBe(30);
    expect(job.width).toBe(1920);
    expect(job.height).toBe(1080);
  });

  it('should handle backward compatibility', async () => {
    const job = await prisma.job.create({
      data: {
        status: JobStatus.QUEUED,
        lane: JobLane.VIDEO,
        params: {
          frames: 30,
          fps: 24,
          width: 1280,
          height: 720
        }
      }
    });

    const videoParams = getVideoParams(job);
    expect(videoParams.frames).toBe(30);
    expect(videoParams.fps).toBe(24);
  });
});
```

## Troubleshooting

### Common Issues

1. **Missing Fields**: If dedicated fields are null, check JSON params as fallback
2. **Performance Issues**: Ensure you're using the new indexes for queries
3. **Type Errors**: Update TypeScript types to handle both dedicated fields and JSON params

### Debugging Queries

```typescript
// Check if indexes are being used
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info']
});

// This will show the SQL queries and whether indexes are used
const jobs = await prisma.job.findMany({
  where: {
    status: 'RUNNING'
  },
  orderBy: { createdAt: 'desc' }
});
```

## Related Documentation

- [Job Model FLF2V Integration](./job-model-flf2v-integration.md) - Complete technical documentation
- [API Audio Jobs](./api-audio-jobs.md) - API endpoint examples
- [FLF2V Bootstrap](./flf2v-bootstrap.md) - Setup and automation

---

**Next Steps**: After implementing these changes, monitor query performance and gradually migrate existing data from JSON params to dedicated fields.