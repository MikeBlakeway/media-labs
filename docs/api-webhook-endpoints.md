# Webhook API Endpoints

This document describes the webhook API endpoints implemented in the Media Labs API, specifically designed to handle RunPod job completion callbacks with secure HMAC verification and real-time broadcasting.

## Overview

The webhook system enables external services (primarily RunPod) to notify the API when background jobs complete. The implementation follows RunPod's official API specification and provides real-time updates to connected clients via Server-Sent Events (SSE).

## Endpoint Details

### POST /api/callbacks/gpu/:jobId

Receives webhook callbacks from RunPod when GPU jobs complete or change status.

**URL Parameters:**
- `jobId` (string, required) - The internal job ID from our database

**Query Parameters:**
- `hmac` (string, required) - HMAC signature for verification using the `CALLBACK_SECRET`

**Request Body:**
The payload follows RunPod's `/status/{job_id}` response format:

```typescript
interface RunPodCallbackPayload {
  id: string                    // RunPod job ID
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT'
  delayTime?: number           // Delay time in milliseconds
  executionTime?: number       // Execution time in milliseconds  
  input?: any                  // Original input (present in webhook, not webhookV2)
  workerId?: string           // Worker ID (occasionally present)
  output?: {
    // ComfyUI v5.0.0+ format
    images?: Array<{
      filename: string
      type: 'base64' | 's3_url'
      data: string
    }>
    errors?: string[]
    // Legacy/generic formats
    output_url?: string        // Direct output URL
    message?: string          // Base64 data or message
    status?: string           // Worker-defined status
    error?: string            // Error message if failed
  }
}
```

**Security:**
- All requests must include a valid HMAC signature
- HMAC is generated using the job ID and the `CALLBACK_SECRET` environment variable
- Invalid or missing HMAC results in 403 Forbidden response

**Response:**
```json
{
  "success": true,
  "jobId": "job123",
  "status": "COMPLETED",
  "clientsNotified": 2
}
```

**Status Mapping:**
- `IN_QUEUE` → `QUEUED`
- `IN_PROGRESS` → `RUNNING`
- `COMPLETED` → `COMPLETED`
- `FAILED` → `FAILED`
- `CANCELLED` → `CANCELED`
- `TIMED_OUT` → `FAILED` (with timeout reason)

## Output Format Support

The webhook handles multiple output formats to ensure compatibility:

### ComfyUI v5.0+ Format
```json
{
  "output": {
    "images": [
      {
        "filename": "ComfyUI_00001_.png",
        "type": "s3_url",
        "data": "https://storage.example.com/videos/output.mp4"
      }
    ],
    "errors": ["optional error messages"]
  }
}
```

### Legacy Format
```json
{
  "output": {
    "output_url": "https://storage.example.com/videos/output.mp4",
    "message": "data:image/png;base64,..."
  }
}
```

## Real-time Broadcasting

When a webhook is processed, the system broadcasts job status updates to connected clients via SSE:

```json
{
  "type": "job_status_update",
  "data": {
    "jobId": "job123",
    "status": "COMPLETED",
    "progressPct": 100,
    "outputUrl": "https://storage.example.com/videos/output.mp4",
    "updatedAt": "2024-01-15T10:30:00Z",
    "failureReason": "Optional failure reason if status is FAILED"
  }
}
```

## Example Usage

### Successful Job Completion

```bash
curl -X POST \
  "https://api.example.com/api/callbacks/gpu/job123?hmac=a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "runpod-job-789",
    "status": "COMPLETED",
    "delayTime": 2188,
    "executionTime": 4567,
    "output": {
      "images": [
        {
          "filename": "ComfyUI_00001_.png",
          "type": "s3_url",
          "data": "https://storage.example.com/videos/job123.mp4"
        }
      ]
    }
  }'
```

### Failed Job with Error

```bash
curl -X POST \
  "https://api.example.com/api/callbacks/gpu/job456?hmac=f6e5d4c3b2a1..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "runpod-job-456",
    "status": "FAILED",
    "delayTime": 1500,
    "executionTime": 0,
    "output": {
      "errors": ["GPU out of memory", "Workflow failed at node 5"]
    }
  }'
```

## Environment Configuration

Required environment variables:

- `CALLBACK_SECRET` - Secret key used for HMAC verification
- `DATABASE_URL` - PostgreSQL connection string for job updates

## Error Handling

### 403 Forbidden
- Missing or invalid HMAC signature
- Ensure `CALLBACK_SECRET` is properly configured

### 404 Not Found
- Job ID doesn't exist in database
- Verify the job was created before the callback

### 400 Bad Request
- Invalid payload structure
- Missing required fields (`id`, `status`)

### 500 Internal Server Error
- Database connection issues
- Unexpected errors during processing

## Troubleshooting

### HMAC Verification Failures
1. Verify `CALLBACK_SECRET` matches between RunPod configuration and API environment
2. Check HMAC generation algorithm matches expectation
3. Ensure job ID in URL matches the one used for HMAC generation

### Jobs Not Updating
1. Check database connectivity
2. Verify job exists with the provided ID
3. Review server logs for detailed error messages

### SSE Not Broadcasting
1. Ensure SSE endpoint is properly connected
2. Check if clients are subscribed to the correct job ID
3. Verify the `broadcastToJob` function is working correctly

### RunPod Integration
1. Configure webhook URL in RunPod: `https://your-api.com/api/callbacks/gpu/{job_id}?hmac={hmac}`
2. Set up HMAC generation in RunPod using your `CALLBACK_SECRET`
3. RunPod retries up to 2 times with 10-second spacing if endpoint doesn't return 200

## Testing

### Manual Testing
Use the TypeScript test script to verify webhook functionality:

```bash
# Run the manual test preparation
cd apps/api
pnpm exec ts-node test/manual-webhook-test.ts
```

### Automated Testing
Run the comprehensive test suite:

```bash
cd apps/api
pnpm test callbacks.test.ts
```

## Related Documentation

- `apps/api/WEBHOOK_EXAMPLES.md` - Additional usage examples
- `docs/api-audio-jobs.md` - Core API design documentation
- `.github/copilot-instructions.md` - Development guidelines and TypeScript standards