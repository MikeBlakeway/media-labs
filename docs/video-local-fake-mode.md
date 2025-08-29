# Video Local Fake Mode - Developer Guide

## Overview

The Video Local Fake Mode (`VIDEO_RUN_MODE=local_fake`) enables local development and testing of the complete video generation workflow without requiring RunPod, GPU resources, or cloud storage configuration. This mode simulates the entire video processing pipeline with realistic timing and provides the same API interface as the production cloud environment.

## Purpose

Local fake mode solves several development challenges:

- **Zero-friction setup**: No need to configure RunPod API keys, GPU resources, or B2 storage
- **Complete workflow testing**: Test the full video generation pipeline locally including SSE updates
- **UI integration development**: Frontend developers can build against a fully functional backend
- **Rapid iteration**: Quick feedback loop for API changes without cloud dependency
- **Cost-effective development**: No cloud resources consumed during development

## How It Works

### Mode Detection

The system detects local fake mode through the `VIDEO_RUN_MODE` environment variable:

```typescript
const videoRunMode = process.env.VIDEO_RUN_MODE

if (videoRunMode === 'local_fake') {
  // Local simulation path
} else {
  // Cloud/RunPod path
}
```

### Processing Simulation

When a video job is submitted in local fake mode, the following occurs:

1. **Job Creation**: Creates a database job record with `QUEUED` status
2. **Image Upload Simulation**: Generates placeholder URLs instead of uploading to B2 storage
3. **Async Processing**: Schedules a background simulation with realistic timing (30-60 seconds)
4. **Progress Updates**: Broadcasts SSE events for status changes and progress updates
5. **Completion**: Marks job as `COMPLETED` with a placeholder MP4 URL

### Timing Simulation

The fake processing includes realistic delays:

- **Initial delay**: 10 seconds before status changes to `RUNNING`
- **Processing time**: Random 30-60 second total duration
- **Progress updates**: Incremental progress from 10% to 100%

## Configuration

### Environment Setup

Set the environment variable to enable local fake mode:

```bash
export VIDEO_RUN_MODE=local_fake
```

Or in your `.env` file:

```env
VIDEO_RUN_MODE=local_fake
```

### No Additional Configuration Required

Unlike cloud mode, local fake mode requires NO additional configuration:
- No RunPod API keys
- No B2 storage credentials
- No GPU or cloud resources
- No webhook endpoints

## API Usage

### Creating a Video Job

The API interface is identical to cloud mode:

```bash
curl -X POST http://localhost:4000/api/jobs \
  -F "startImage=@start.png" \
  -F "endImage=@end.png" \
  -F "frames=16" \
  -F "fps=8" \
  -F "resolution=720p"
```

### Response Format

Local fake mode returns the same response structure as cloud mode:

```json
{
  "id": "clx1234567890abcdef",
  "status": "QUEUED"
}
```

### Status Progression

Jobs progress through the same states as cloud mode:

1. `QUEUED` - Initial state after creation
2. `RUNNING` - Processing simulation begins (after ~10 seconds)
3. `COMPLETED` - Processing simulation complete (after 30-60 seconds total)

### SSE Updates

Real-time updates are broadcast via Server-Sent Events at `/api/jobs/{jobId}/events`:

```javascript
const eventSource = new EventSource('/api/jobs/clx1234567890abcdef/events')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Job update:', data)
  // { status: 'RUNNING', progressPct: 45, message: 'Processing...' }
}
```

## Implementation Details

### Image Upload Simulation

Instead of uploading to B2 storage, local fake mode generates placeholder URLs:

```typescript
const imageUrl = `https://placeholder.images/temp/${jobId}/${imageName}`
```

These URLs follow the same pattern as real uploads but point to placeholder services.

### Processing Function

The `processLocalFakeJob()` function handles the simulation:

```typescript
async function processLocalFakeJob(jobId: string): Promise<void> {
  // Initial delay and status update to RUNNING
  setTimeout(async () => {
    await updateJobStatus(jobId, 'RUNNING', 10)
    
    // Schedule completion after random delay
    const processingTime = Math.random() * 30000 + 30000 // 30-60 seconds
    setTimeout(async () => {
      await completeJob(jobId)
    }, processingTime)
  }, 10000) // 10 second initial delay
}
```

### Database Integration

Local fake mode uses the same Prisma database models and operations as cloud mode, ensuring complete compatibility.

## Development Workflow

### Starting Development Server

```bash
cd apps/api
export VIDEO_RUN_MODE=local_fake
npm run dev
```

### Testing Video Generation

1. Start the API server in local fake mode
2. Submit a video job via the API
3. Monitor SSE events for progress updates
4. Verify job completion in the database

### Frontend Integration

Frontend applications can connect to the local fake mode server exactly as they would to production:

```typescript
// Same API calls work in both modes
const response = await fetch('/api/jobs', {
  method: 'POST',
  body: formData
})

const job = await response.json()
console.log('Job created:', job.id)
```

## Switching Between Modes

### To Local Fake Mode

```bash
export VIDEO_RUN_MODE=local_fake
npm run dev
```

### To Cloud Mode

```bash
unset VIDEO_RUN_MODE  # or set to 'cloud'
# Ensure all cloud credentials are configured
npm run dev
```

### Environment-Specific Configuration

Use different `.env` files for different environments:

```bash
# .env.local (local fake mode)
VIDEO_RUN_MODE=local_fake

# .env.development (cloud mode)
VIDEO_RUN_MODE=cloud
RUNPOD_API_KEY=your_key_here
B2_BUCKET_NAME=your_bucket
```

## Testing

### Manual Testing

1. Start API server: `VIDEO_RUN_MODE=local_fake npm run dev`
2. Submit job: Use curl or Postman to create a video job
3. Verify response: Check immediate response has correct format
4. Monitor progress: Connect to SSE endpoint and watch status updates
5. Check completion: Verify job reaches COMPLETED status with output URL

### Integration Testing

Local fake mode enables comprehensive integration testing without cloud dependencies:

```typescript
describe('Video Job Processing', () => {
  beforeEach(() => {
    process.env.VIDEO_RUN_MODE = 'local_fake'
  })

  it('should process video job end-to-end', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .attach('startImage', 'test/fixtures/start.png')
      .attach('endImage', 'test/fixtures/end.png')
      .field('frames', '16')
      .field('fps', '8')
      .field('resolution', '720p')

    expect(response.status).toBe(201)
    expect(response.body.status).toBe('QUEUED')

    // Wait for processing to complete
    await waitForJobCompletion(response.body.id)
  })
})
```

## Limitations

### Fake Outputs

- Image URLs point to placeholder services, not actual uploaded images
- Output video URL is a placeholder, not a real MP4 file
- No actual video processing occurs

### Timing Variations

- Processing times are randomized for realism but may not match exact production timing
- Progress updates are simulated and may not reflect real processing steps

### Storage Simulation

- No files are actually uploaded or stored
- Placeholder URLs may not be accessible externally
- File validation occurs but files are not persisted

## Troubleshooting

### Common Issues

**Server won't start in local fake mode:**
- Verify `VIDEO_RUN_MODE=local_fake` is set correctly
- Check that no cloud-specific environment variables are causing conflicts
- Ensure database connection is available

**Jobs not progressing:**
- Check server logs for processing simulation errors
- Verify SSE connection is working properly
- Confirm job was created successfully in database

**SSE events not received:**
- Ensure EventSource is connecting to correct endpoint
- Check for CORS issues in browser console
- Verify job ID matches created job

### Debug Mode

Enable additional logging for troubleshooting:

```bash
DEBUG=media-labs:* VIDEO_RUN_MODE=local_fake npm run dev
```

## Related Documentation

- [API Video Jobs](./api-video-jobs.md) - Complete video job API reference
- [How to Develop](./how-to-develop.md) - General development setup
- [API Webhook Endpoints](./api-webhook-endpoints.md) - Cloud mode webhook configuration

## Contributing

When modifying local fake mode:

1. Ensure cloud mode functionality remains unchanged
2. Maintain API compatibility between modes
3. Update tests for both modes
4. Update this documentation for any behavior changes
5. Test mode switching works correctly

## Example Use Cases

### Frontend Development

```typescript
// Component can work with both modes seamlessly
function VideoJobSubmission() {
  const [job, setJob] = useState(null)
  
  const submitJob = async (formData) => {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      body: formData
    })
    
    const newJob = await response.json()
    setJob(newJob)
    
    // Connect to SSE for updates (works in both modes)
    const eventSource = new EventSource(`/api/jobs/${newJob.id}/events`)
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data)
      setJob(prev => ({ ...prev, ...update }))
    }
  }
  
  return (
    <form onSubmit={submitJob}>
      {/* Form fields */}
      {job && <JobProgress job={job} />}
    </form>
  )
}
```

### API Testing

```bash
#!/bin/bash
# Test script that works in both modes

export VIDEO_RUN_MODE=local_fake
npm run dev &
API_PID=$!

sleep 5  # Wait for server to start

# Submit test job
RESPONSE=$(curl -s -X POST http://localhost:4000/api/jobs \
  -F "startImage=@test/start.png" \
  -F "endImage=@test/end.png" \
  -F "frames=16" \
  -F "fps=8" \
  -F "resolution=720p")

JOB_ID=$(echo $RESPONSE | jq -r '.id')
echo "Created job: $JOB_ID"

# Monitor progress
curl -s "http://localhost:4000/api/jobs/$JOB_ID/events" &

wait
kill $API_PID
```

This comprehensive documentation ensures developers can effectively use local fake mode for development and testing while understanding its capabilities and limitations.