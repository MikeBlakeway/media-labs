# Webhook Endpoint Usage Examples

## Overview
The `POST /api/callbacks/gpu/:jobId` endpoint receives webhooks from RunPod when jobs complete.

## Example Usage

### 1. Successful Job Completion
```bash
# Example callback from RunPod when a video job completes successfully
curl -X POST \
  "http://localhost:4000/api/callbacks/gpu/clx123abc456?hmac=a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "runpod-job-789",
    "status": "COMPLETED",
    "output": {
      "output_url": "https://storage.example.com/videos/clx123abc456.mp4"
    },
    "executionTime": 45000
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "jobId": "clx123abc456",
  "status": "COMPLETED",
  "clientsNotified": 2
}
```

### 2. Failed Job
```bash
curl -X POST \
  "http://localhost:4000/api/callbacks/gpu/clx123abc456?hmac=a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "runpod-job-789",
    "status": "FAILED",
    "output": {
      "error": "GPU out of memory error"
    }
  }'
```

### 3. Job Progress Update
```bash
curl -X POST \
  "http://localhost:4000/api/callbacks/gpu/clx123abc456?hmac=a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "runpod-job-789",
    "status": "IN_PROGRESS",
    "progress": 75
  }'
```

## Error Responses

### Missing HMAC (403 Forbidden)
```bash
curl -X POST \
  "http://localhost:4000/api/callbacks/gpu/clx123abc456" \
  -H "Content-Type: application/json" \
  -d '{"id": "runpod-job-789", "status": "COMPLETED"}'
```

**Response:**
```json
{
  "error": "Forbidden",
  "message": "Missing HMAC verification"
}
```

### Invalid HMAC (403 Forbidden)
```bash
curl -X POST \
  "http://localhost:4000/api/callbacks/gpu/clx123abc456?hmac=invalid" \
  -H "Content-Type: application/json" \
  -d '{"id": "runpod-job-789", "status": "COMPLETED"}'
```

### Job Not Found (404 Not Found)
```bash
curl -X POST \
  "http://localhost:4000/api/callbacks/gpu/nonexistent?hmac=valid" \
  -H "Content-Type: application/json" \
  -d '{"id": "runpod-job-789", "status": "COMPLETED"}'
```

## SSE Updates

When a callback is processed successfully, all clients connected to the SSE stream for that job receive updates:

**SSE Message Format:**
```javascript
{
  type: 'job_status_update',
  data: {
    jobId: 'clx123abc456',
    status: 'COMPLETED',
    progressPct: 100,
    outputUrl: 'https://storage.example.com/videos/clx123abc456.mp4',
    updatedAt: '2024-01-01T12:05:00.000Z'
  },
  timestamp: '2024-01-01T12:05:00.123Z'
}
```

## HMAC Generation

The HMAC is generated using the `CALLBACK_SECRET` environment variable and the job ID:

```javascript
import crypto from 'crypto'

function generateCallbackHmac(jobId) {
  const hmac = crypto.createHmac('sha256', process.env.CALLBACK_SECRET)
  hmac.update(jobId)
  return hmac.digest('hex')
}

const hmac = generateCallbackHmac('clx123abc456')
const callbackUrl = `https://api.example.com/api/callbacks/gpu/clx123abc456?hmac=${hmac}`
```

## Integration with RunPod

When submitting a job to RunPod, include the callback URL:

```javascript
const runpodPayload = {
  workflow: {...},
  images: [...],
  output_put_url: 'https://storage.example.com/presigned-put-url',
  callback_url: 'https://api.example.com/api/callbacks/gpu/clx123abc456?hmac=abc123...'
}
```

RunPod will POST to this URL when the job completes, fails, or updates progress.