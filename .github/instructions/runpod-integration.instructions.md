---
applyTo: 'src/lib/runpod*,src/lib/workflow*,volume-worker/**,custom-worker/**,data/workflows/**'
description: 'RunPod and ComfyUI integration patterns'
---

# RunPod Integration Instructions

## RunPod Configuration Standards

Follow established patterns for RunPod serverless endpoints and S3 volume integration.

### Environment Configuration

#### Required Environment Variables

```typescript
// RunPod Core Configuration
RUNPOD_API_KEY = your_api_key
RUNPOD_ENDPOINT_ID = your_endpoint_id

// S3 Volume Configuration (Optional)
RUNPOD_S3_ACCESS_KEY_ID = your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY = your_secret_key
RUNPOD_S3_ENDPOINT = 'https://volume_id.vol.runpod.net'
RUNPOD_S3_REGION = us - east - 1
RUNPOD_VOLUME_ID = your_volume_id

// Model Directory Mapping
RUNPOD_MODEL_DIR_UNET = models / diffusion_models
RUNPOD_MODEL_DIR_CLIP = models / clip
RUNPOD_MODEL_DIR_CLIP_VISION = models / clip_vision
RUNPOD_MODEL_DIR_VAE = models / vae
RUNPOD_MODEL_DIR_LORA = models / loras
RUNPOD_MODEL_DIR_CHECKPOINTS = models / checkpoints
```

#### Configuration Validation Pattern

```typescript
function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}
```

### S3 Volume Integration

#### Model Storage Convention

All model files must be stored under `models/<type>/...` at the root of your S3 bucket:

- Diffusion models: `models/diffusion_models/`
- CLIP models: `models/clip/`
- VAE models: `models/vae/`
- LoRA models: `models/loras/`
- Checkpoints: `models/checkpoints/`

#### S3 Client Configuration

```typescript
import { S3Client } from '@aws-sdk/client-s3'

const runpodS3 = new S3Client({
  region: process.env.RUNPOD_S3_REGION || 'us-east-1',
  endpoint: process.env.RUNPOD_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.RUNPOD_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RUNPOD_S3_SECRET_ACCESS_KEY!
  },
  forcePathStyle: true
})
```

#### S3 Operations with Defensive Error Handling

```typescript
// Existence check with defensive error parsing
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

### Workflow Template Management

#### Template Storage and Structure

- Location: `data/workflows/*.json`
- Validation: Zod schemas in `src/lib/templates.schema.ts`
- Registration: `src/lib/templates.fs.ts`

#### Template Schema Requirements

```typescript
// Basic workflow template structure
{
  "name": "Template Name",
  "description": "Template description",
  "outputType": "image" | "video",
  "parameters": {
    // Parameter definitions with types and defaults
  },
  "workflow": {
    // ComfyUI workflow JSON (API format)
  }
}
```

#### Parameter Patching Pattern

```typescript
// Replace template parameters in workflow
function patchWorkflowParameters(workflow: WorkflowObject, params: Record<string, unknown>) {
  const workflowStr = JSON.stringify(workflow)
  let patchedStr = workflowStr

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`
    patchedStr = patchedStr.replace(new RegExp(placeholder, 'g'), String(value))
  }

  return JSON.parse(patchedStr) as WorkflowObject
}
```

### RunPod API Integration

#### Synchronous Execution (< 20MB)

```typescript
import { runSync } from '@/lib/runpod'

const result = await runSync({
  workflow: patchedWorkflow,
  return_temp_images: false
  // Additional parameters
})
```

#### Asynchronous Execution (Large workflows)

```typescript
import { runAsync, getStatus } from '@/lib/runpod'

// Submit job
const { id } = await runAsync({
  workflow: patchedWorkflow,
  return_temp_images: false
})

// Poll for completion
const pollForResult = async (jobId: string) => {
  let status = await getStatus(jobId)
  while (status.status === 'IN_PROGRESS' || status.status === 'IN_QUEUE') {
    await new Promise(resolve => setTimeout(resolve, 2000))
    status = await getStatus(jobId)
  }
  return status
}
```

### Model Preflight Checks

#### Model Requirement Detection

```typescript
// Infer required models from workflow
function inferModelRequirements(workflow: WorkflowObject): ModelRequirement[] {
  const requirements: ModelRequirement[] = []

  for (const [nodeId, node] of Object.entries(workflow)) {
    if (node.class_type === 'CheckpointLoaderSimple') {
      requirements.push({
        type: 'checkpoint',
        filename: node.inputs.ckpt_name,
        s3Key: `models/checkpoints/${node.inputs.ckpt_name}`,
        workerPath: `/runpod-volume/models/checkpoints/${node.inputs.ckpt_name}`
      })
    }
    // Additional model type detection...
  }

  return requirements
}
```

#### Preflight Validation Endpoint

```typescript
// API route: /api/workflows/preflight
export async function POST(req: NextRequest) {
  const { workflow } = await req.json()

  const requirements = inferModelRequirements(workflow)
  const checks = await Promise.all(
    requirements.map(async req => ({
      ...req,
      exists: await checkModelExists(req.s3Key)
    }))
  )

  return NextResponse.json({ requirements: checks })
}
```

### Worker Configuration

#### Docker Image Requirements

- Platform: `--platform linux/amd64` for RunPod compatibility
- Base image: Use established ComfyUI base images
- Model handling: Runtime loading from S3 volume, not baked into image

#### Environment Variables in Worker

```dockerfile
ENV RUNPOD_VOLUME_ID=${RUNPOD_VOLUME_ID}
ENV S3_ENDPOINT_URL=${RUNPOD_S3_ENDPOINT}
ENV S3_ACCESS_KEY_ID=${RUNPOD_S3_ACCESS_KEY_ID}
ENV S3_SECRET_ACCESS_KEY=${RUNPOD_S3_SECRET_ACCESS_KEY}
```

#### Handler Function Pattern

```python
import runpod
from comfyui_client import ComfyUIClient

def handler(event):
    """RunPod serverless handler for ComfyUI workflows"""
    try:
        workflow = event["input"]["workflow"]

        # Initialize ComfyUI client
        client = ComfyUIClient()

        # Execute workflow
        result = client.execute_workflow(workflow)

        return {"output": {"images": result}}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
```

### Error Handling Patterns

#### RunPod API Errors

```typescript
// Handle RunPod-specific errors
try {
  const result = await runPodApiCall()
  return result
} catch (error) {
  if (error instanceof Error) {
    // Parse RunPod error messages
    if (error.message.includes('CUDA out of memory')) {
      throw new Error('Insufficient GPU memory. Try reducing image size or batch count.')
    }
    if (error.message.includes('Model not found')) {
      throw new Error('Required model not available. Check model preflight.')
    }
  }
  throw error
}
```

#### ComfyUI Workflow Errors

```typescript
// Handle ComfyUI validation errors
try {
  const result = await executeWorkflow(workflow)
  return result
} catch (error) {
  // Parse ComfyUI error details
  const errorDetails = parseComfyUIError(error)
  throw new Error(`Workflow execution failed: ${errorDetails.message}`)
}
```

### Performance Optimization

#### Timeout Configuration

```typescript
// Apply appropriate timeouts
const RUNPOD_TIMEOUT = 300000 // 5 minutes for complex workflows
const S3_TIMEOUT = 30000 // 30 seconds for S3 operations
```

#### Caching Strategies

- Cache model existence checks for short periods
- Cache workflow templates until modification
- Use efficient polling intervals for job status

### Testing Patterns

#### Mock RunPod Responses

```typescript
// Mock RunPod API for testing
jest.mock('@/lib/runpod', () => ({
  runSync: jest.fn().mockResolvedValue({
    output: { images: ['base64...'] }
  }),
  runAsync: jest.fn().mockResolvedValue({
    id: 'test-job-id'
  })
}))
```

#### Integration Testing

- Test full workflow execution pipeline
- Validate S3 model loading
- Test error handling scenarios
- Verify timeout behavior

### Local Development

#### Use Local Worker

```bash
# Environment variable for local development
USE_LOCAL_WORKER=true
LOCAL_WORKER_URL=http://localhost:8000
```

#### Worker Development Commands

```bash
# Build and run local worker
make build-worker
make dev-worker

# Test worker integration
make test-integration
```

Refer to [RunPod documentation](../../docs/runpod/) for comprehensive integration patterns and [volume worker README](../../volume-worker/README.md) for development setup.
