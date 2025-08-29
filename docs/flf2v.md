# FLF2V Integration Setup and Usage Guide

This comprehensive guide provides everything needed to set up and use the First Last Frame to Video (FLF2V) integration in the Media Labs platform. New contributors should be able to complete end-to-end setup in 10 minutes or less.

## Table of Contents

1. [Quick Start (≤10 minutes)](#quick-start-10-minutes)
2. [Current Implementation Status](#current-implementation-status)
3. [Environment Configuration](#environment-configuration)
4. [API Endpoints](#api-endpoints)
5. [Storage Configuration (B2)](#storage-configuration-b2)
6. [RunPod Configuration](#runpod-configuration)
7. [cURL Examples](#curl-examples)
8. [Postman Collection](#postman-collection)
9. [Troubleshooting](#troubleshooting)
10. [Development Modes](#development-modes)

## Current Implementation Status

As of the current version, the FLF2V integration has the following implementation status:

### ✅ Fully Implemented
- **Database Schema**: Complete Job model with video-specific fields
- **Environment Configuration**: RunPod and B2 storage config validation
- **API Infrastructure**: Health check, job status, SSE streaming
- **Webhook System**: RunPod callback handling with HMAC verification
- **Storage Integration**: B2/S3 presigned URL generation
- **Real-time Updates**: Server-Sent Events for job progress

### 🚧 Cloud Mode Required
- **Job Creation**: `POST /api/jobs` requires cloud mode configuration
- **Video Processing**: Actual video generation via RunPod
- **File Upload**: Image upload to B2 storage during job creation

### 📝 Development Notes
- Local development can test most endpoints using manually created test jobs
- Full end-to-end workflow requires RunPod and B2 cloud setup
- All configuration validation and error handling is in place
- Comprehensive test suite covers all implemented functionality

## Quick Start (≤10 minutes)

### 1. Bootstrap the Repository (2 minutes)

```bash
# Clone and setup
git clone https://github.com/MikeBlakeway/media-labs.git
cd media-labs

# Enable corepack and install dependencies
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install  # Takes ~30 seconds
```

### 2. Environment Setup (2 minutes)

```bash
# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# Generate Prisma client
pnpm --filter ./apps/api run prisma:generate
```

### 3. Start Development Server (1 minute)

```bash
# Start all services (API on port 4000, UI on port 3000)
pnpm run dev
```

### 4. Test the API (2 minutes)

```bash
# Test health endpoint
curl http://localhost:4000/_health
# Expected: {"ok":true}

# Note: Video job creation currently requires cloud mode configuration
# For now, test with a manually created job ID (see troubleshooting section)
# or proceed to cloud mode setup to test full job creation workflow
```

### 5. View Results (1 minute)

- Open browser to `http://localhost:3000` for the UI
- Check job status via API: `curl http://localhost:4000/api/jobs/{job_id}`
- Monitor real-time updates via SSE: `curl http://localhost:4000/api/jobs/stream?jobId={job_id}`

### 6. Optional: Set up Cloud Mode (2 minutes)

Edit `apps/api/.env` to enable cloud processing:

```bash
VIDEO_RUN_MODE=cloud
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_ENDPOINT_ID=your-runpod-endpoint-id
RUNPOD_REGION=your-runpod-region
PUBLIC_BASE_URL=https://your-domain.com
CALLBACK_SECRET=your-callback-hmac-secret
B2_ENDPOINT=https://s3.us-east-1.backblazeb2.com
B2_REGION=us-east-1
B2_BUCKET=your-bucket-name
B2_ACCESS_KEY_ID=your-access-key-id
B2_SECRET_ACCESS_KEY=your-secret-access-key
```

## Environment Configuration

### Local Development Mode (Default)

The simplest setup for development and API testing:

```bash
# apps/api/.env
DATABASE_URL="file:./prisma/dev.db"
VIDEO_RUN_MODE=local_fake
```

In `local_fake` mode:
- Uses SQLite database
- API endpoints (health, job status, SSE) work fully
- Job creation (POST /api/jobs) currently requires cloud mode
- Perfect for testing job status retrieval and SSE streams
- No external services required for most development

**Available in local_fake mode:**
- ✅ Health check (`GET /_health`)
- ✅ Job status retrieval (`GET /api/jobs/:id`)
- ✅ SSE streaming (`GET /api/jobs/stream?jobId=...`)
- ❌ Job creation (`POST /api/jobs`) - requires cloud mode

### Cloud Mode (Production)

For actual video generation using RunPod and cloud storage:

```bash
# apps/api/.env
DATABASE_URL="postgresql://user:password@host:5432/media_labs?schema=public"
VIDEO_RUN_MODE=cloud

# RunPod Configuration
RUNPOD_API_KEY=your-runpod-api-key-here
RUNPOD_ENDPOINT_ID=your-runpod-endpoint-id
RUNPOD_REGION=your-runpod-region

# Public URL for callbacks
PUBLIC_BASE_URL=https://your-api-domain.com

# Security
CALLBACK_SECRET=your-secure-random-string-for-hmac

# B2 Storage
B2_ENDPOINT=https://s3.us-east-1.backblazeb2.com
B2_REGION=us-east-1
B2_BUCKET=your-bucket-name
B2_ACCESS_KEY_ID=your-b2-access-key-id
B2_SECRET_ACCESS_KEY=your-b2-secret-access-key
```

### Environment Variable Reference

| Variable | Required | Mode | Description |
|----------|----------|------|-------------|
| `DATABASE_URL` | Yes | All | Database connection string |
| `VIDEO_RUN_MODE` | Yes | All | `local_fake` or `cloud` |
| `RUNPOD_API_KEY` | Yes | Cloud | RunPod API authentication key |
| `RUNPOD_ENDPOINT_ID` | Yes | Cloud | RunPod serverless endpoint ID |
| `RUNPOD_REGION` | Yes | Cloud | RunPod region (e.g., `us-east-1`) |
| `PUBLIC_BASE_URL` | Yes | Cloud | Your API's public URL for callbacks |
| `CALLBACK_SECRET` | Yes | Cloud | Secret for HMAC webhook verification |
| `B2_ENDPOINT` | Yes | Cloud | Backblaze B2 S3-compatible endpoint |
| `B2_REGION` | Yes | Cloud | B2 region |
| `B2_BUCKET` | Yes | Cloud | B2 bucket name for file storage |
| `B2_ACCESS_KEY_ID` | Yes | Cloud | B2 access key ID |
| `B2_SECRET_ACCESS_KEY` | Yes | Cloud | B2 secret access key |

## API Endpoints

### Core Video Job Endpoints

#### 1. Create Video Job

**POST `/api/jobs`**

Creates a new video generation job from start and end images.

**Note:** Currently requires `VIDEO_RUN_MODE=cloud` with valid RunPod and B2 storage configuration.

**Parameters:**
- `startImage` (file, required): Starting frame image (JPG/PNG, max 10MB)
- `endImage` (file, required): Ending frame image (JPG/PNG, max 10MB)
- `params[duration]` (number, optional): Video duration in seconds (default: 5)
- `params[fps]` (number, optional): Frames per second (default: 24)
- `params[width]` (number, optional): Output width in pixels (default: 720)
- `params[height]` (number, optional): Output height in pixels (default: 720)

**Response:**
```json
{
  "id": "clx123abc456",
  "status": "QUEUED"
}
```

#### 2. Get Job Status

**GET `/api/jobs/:id`**

Retrieves detailed information about a specific job.

**Response:**
```json
{
  "id": "clx123abc456",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z",
  "status": "COMPLETED",
  "lane": "VIDEO",
  "inputs": {},
  "progressPct": 100,
  "outputUrl": "https://storage.example.com/videos/clx123abc456.mp4",
  "downloadUrl": "https://storage.example.com/videos/clx123abc456.mp4?signed-url",
  "frames": 120,
  "fps": 24,
  "width": 720,
  "height": 720,
  "error": null,
  "failureReason": null
}
```

#### 3. Stream Job Updates (SSE)

**GET `/api/jobs/stream?jobId={jobId}`**

Server-Sent Events endpoint for real-time job status updates.

**Response Stream:**
```
data: {"type":"job_status_update","data":{"jobId":"clx123abc456","status":"RUNNING","progressPct":25},"timestamp":"2024-01-15T10:32:00Z"}

data: {"type":"job_status_update","data":{"jobId":"clx123abc456","status":"COMPLETED","progressPct":100,"outputUrl":"https://..."},"timestamp":"2024-01-15T10:35:00Z"}
```

#### 4. Webhook Callback (Internal)

**POST `/api/callbacks/gpu/:jobId?hmac={hmac}`**

Internal endpoint for RunPod to send job completion callbacks. Not for direct use.

### Health and Utility Endpoints

#### Health Check

**GET `/_health`**

Simple health check endpoint.

**Response:**
```json
{
  "ok": true
}
```

## Storage Configuration (B2)

### Setting up Backblaze B2

1. **Create B2 Account**
   - Sign up at [backblaze.com](https://www.backblaze.com/b2/cloud-storage.html)
   - Navigate to B2 Cloud Storage

2. **Create Bucket**
   ```bash
   # Bucket name: your-media-labs-bucket
   # Region: us-east-1 (recommended)
   # Files in bucket: Private
   ```

3. **Generate Application Key**
   - Go to App Keys in B2 console
   - Create new key with read/write access to your bucket
   - Save the `keyID` and `applicationKey`

4. **Configure Environment**
   ```bash
   B2_ENDPOINT=https://s3.us-east-1.backblazeb2.com
   B2_REGION=us-east-1
   B2_BUCKET=your-media-labs-bucket
   B2_ACCESS_KEY_ID=your_key_id_here
   B2_SECRET_ACCESS_KEY=your_application_key_here
   ```

### B2 Folder Structure

```
your-bucket/
├── temp/           # Temporary image uploads
│   └── {jobId}/
│       ├── start_image.png
│       └── end_image.png
└── videos/         # Final video outputs
    └── {jobId}.mp4
```

### Testing B2 Configuration

```bash
# Test presigned URL generation
curl -X POST http://localhost:4000/api/jobs \
  -F "startImage=@test-start.jpg" \
  -F "endImage=@test-end.jpg"

# Check the response includes proper URLs
# In cloud mode, images should upload to B2
```

## RunPod Configuration

### Setting up RunPod

1. **Create RunPod Account**
   - Sign up at [runpod.io](https://runpod.io)
   - Add payment method for GPU usage

2. **Create Serverless Endpoint**
   - Go to Serverless → Endpoints
   - Create new endpoint with:
     - **Name**: media-labs-flf2v
     - **Docker Image**: Custom ComfyUI image with FLF2V workflow
     - **GPU**: A10 or better recommended
     - **Max Workers**: 3-5 for production

3. **Configure Webhook**
   ```json
   {
     "webhook_url": "https://your-api-domain.com/api/callbacks/gpu/{job_id}?hmac={hmac}",
     "webhook_auth": "hmac-sha256"
   }
   ```

4. **Get API Credentials**
   - Go to Settings → API Keys
   - Generate new API key
   - Note your endpoint ID from the endpoint details

### RunPod Environment Variables

```bash
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_ENDPOINT_ID=your_endpoint_id_here
RUNPOD_REGION=us-east-1
```

### RunPod Volume Setup

For persistent model storage, configure a RunPod volume:

1. **Create Network Volume**
   - Go to Storage → Network Volumes
   - Create 50GB+ volume in your region
   - Name: `media-labs-models`

2. **Mount in Endpoint**
   ```bash
   # Mount path: /runpod-volume
   # This path contains:
   # - ComfyUI models
   # - Custom nodes
   # - Workflow configurations
   ```

3. **Volume Structure**
   ```
   /runpod-volume/
   ├── ComfyUI/
   │   ├── models/
   │   │   ├── checkpoints/
   │   │   ├── vae/
   │   │   └── upscale_models/
   │   ├── custom_nodes/
   │   └── workflows/
   │       └── wan2.1_flf2v_720_f16.json
   ```

## cURL Examples

### Local Development (local_fake mode)

```bash
# 1. Health Check
curl -X GET http://localhost:4000/_health

# 2. Create Job - Currently requires cloud mode (see cloud examples below)
# For testing other endpoints, you can create a test job manually:
# See "Creating Test Jobs for Development" section below

# 3. Get Job Status (using a test job ID)
curl -X GET http://localhost:4000/api/jobs/your-test-job-id

# 4. Stream Job Updates (in separate terminal)
curl -X GET "http://localhost:4000/api/jobs/stream?jobId=your-test-job-id" \
  -H "Accept: text/event-stream"
```

#### Creating Test Jobs for Development

Since job creation currently requires cloud mode, you can create test jobs directly in the database for testing other endpoints:

```bash
cd apps/api
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function createTestJob() {
  const job = await prisma.job.create({
    data: {
      lane: 'VIDEO',
      status: 'COMPLETED',
      params: {duration: 5, fps: 24, width: 720, height: 720},
      inputs: {startImage: 'test-start.jpg', endImage: 'test-end.jpg'},
      processing: {type: 'flf2v', duration: 5, fps: 24},
      metadata: {testJob: true},
      progressPct: 100,
      outputUrl: 'https://example.com/test-video.mp4',
      resultPaths: ['test-video.mp4'],
      frames: 120, fps: 24, width: 720, height: 720
    }
  });
  console.log('Created test job:', job.id);
  await prisma.\$disconnect();
}
createTestJob().catch(console.error);
"
# Use the returned job ID in the above curl commands
```

### Cloud Mode Examples

```bash
# 1. Create Job (cloud processing)
curl -X POST https://your-api.com/api/jobs \
  -H "Authorization: Bearer your-token" \
  -F "startImage=@start-frame.png" \
  -F "endImage=@end-frame.png" \
  -F "params[duration]=10" \
  -F "params[fps]=30" \
  -F "params[width]=1280" \
  -F "params[height]=720"

# Expected Response:
# {
#   "id": "clx789def012",
#   "status": "QUEUED"
# }

# 2. Monitor Progress
curl -X GET https://your-api.com/api/jobs/clx789def012

# 3. Download Result (when completed)
curl -X GET https://your-api.com/api/jobs/clx789def012 | \
  jq -r '.downloadUrl' | \
  xargs curl -o output-video.mp4
```

### Webhook Testing (Internal)

```bash
# Test webhook callback (simulated from RunPod)
# Note: HMAC must be generated correctly
HMAC=$(echo -n "clx123abc456" | openssl dgst -sha256 -hmac "your-callback-secret" | cut -d' ' -f2)

curl -X POST "http://localhost:4000/api/callbacks/gpu/clx123abc456?hmac=$HMAC" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "runpod-job-789",
    "status": "COMPLETED",
    "executionTime": 45000,
    "output": {
      "images": [{
        "filename": "output.mp4",
        "type": "s3_url",
        "data": "https://storage.example.com/videos/clx123abc456.mp4"
      }]
    }
  }'
```

## Postman Collection

### Setting up Postman

1. **Import Environment**
   Create a new environment with these variables:
   ```json
   {
     "base_url": "http://localhost:4000",
     "api_url": "{{base_url}}/api",
     "job_id": "",
     "callback_secret": "your-callback-secret"
   }
   ```

2. **Create Collection**
   Import these requests:

#### Request 1: Health Check
```
GET {{base_url}}/_health
```

#### Request 2: Create Video Job
```
POST {{api_url}}/jobs
Body: form-data
- startImage: (file)
- endImage: (file)
- params[duration]: 5
- params[fps]: 24

Tests:
pm.test("Job created successfully", function () {
    pm.response.to.have.status(201);
    const response = pm.response.json();
    pm.environment.set("job_id", response.id);
});
```

#### Request 3: Get Job Status
```
GET {{api_url}}/jobs/{{job_id}}

Tests:
pm.test("Job status retrieved", function () {
    pm.response.to.have.status(200);
    const response = pm.response.json();
    pm.test("Has required fields", function () {
        pm.expect(response).to.have.property("id");
        pm.expect(response).to.have.property("status");
    });
});
```

#### Request 4: Stream Job Updates
```
GET {{api_url}}/jobs/stream?jobId={{job_id}}
Headers:
- Accept: text/event-stream
```

### Pre-request Scripts

Add this to Collection pre-request script for HMAC generation:

```javascript
// Generate HMAC for webhook testing
if (pm.request.url.path.includes('callbacks')) {
    const jobId = pm.variables.get('job_id');
    const secret = pm.environment.get('callback_secret');
    
    const hmac = CryptoJS.HmacSHA256(jobId, secret).toString();
    pm.request.url.query.add({
        key: 'hmac',
        value: hmac
    });
}
```

## Troubleshooting

### Common Issues

#### 1. Job Creation Requires Cloud Mode

**Error:** `Storage not configured - VIDEO_RUN_MODE must be "cloud" with valid B2 configuration`

**Explanation:** The current `POST /api/jobs` endpoint is designed for cloud processing and requires:
- `VIDEO_RUN_MODE=cloud`
- Valid B2 storage configuration
- Valid RunPod configuration

**Solutions:**
1. **For full end-to-end testing**: Set up cloud mode (see environment configuration)
2. **For development/testing**: Create test jobs manually and use other endpoints:
   ```bash
   # Create a test job in the database
   cd apps/api && npx ts-node -e "/* see Creating Test Jobs section */"
   
   # Then test other endpoints
   curl http://localhost:4000/api/jobs/your-test-job-id
   ```

#### 2. Prisma Client Not Generated

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
cd apps/api
pnpm run prisma:generate
```

#### 3. Database Connection Failed

**Error:** `Can't reach database server`

**Local Development:**
```bash
# Ensure SQLite file exists
pnpm --filter ./apps/api run prisma:migrate
```

**Cloud:**
```bash
# Check DATABASE_URL is correct
# Ensure database server is accessible
# Verify connection string format
```

#### 4. RunPod Configuration Errors

**Error:** `RunPod configuration validation failed`

**Solution:**
```bash
# Check all required environment variables are set
echo $RUNPOD_API_KEY
echo $RUNPOD_ENDPOINT_ID
echo $RUNPOD_REGION

# Verify API key has correct permissions
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
  https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/health
```

#### 5. B2 Storage Issues

**Error:** `Failed to generate presigned URL`

**Solution:**
```bash
# Verify B2 credentials
aws configure set aws_access_key_id $B2_ACCESS_KEY_ID
aws configure set aws_secret_access_key $B2_SECRET_ACCESS_KEY
aws --endpoint-url=$B2_ENDPOINT s3 ls s3://$B2_BUCKET/
```

#### 6. File Upload Errors

**Error:** `Unsupported file type` or `File too large`

**Solution:**
- Supported formats: JPEG, PNG
- Maximum size: 10MB per image
- Required files: exactly 2 images (startImage, endImage)

```bash
# Check file format and size
file start-image.jpg
ls -lh start-image.jpg
```

#### 7. Webhook HMAC Verification Failed

**Error:** `Missing HMAC verification` or `Invalid HMAC`

**Solution:**
```bash
# Verify CALLBACK_SECRET is set
echo $CALLBACK_SECRET

# Test HMAC generation
echo -n "your-job-id" | openssl dgst -sha256 -hmac "$CALLBACK_SECRET"
```

#### 8. SSE Connection Issues

**Error:** SSE stream not working

**Solution:**
```bash
# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" \
  "http://localhost:4000/api/jobs/stream?jobId=test-job"

# Check browser console for connection errors
# Ensure job ID exists in database
```

### Debug Mode

Enable detailed logging:

```bash
# apps/api/.env
NODE_ENV=development
DEBUG=media-labs:*

# Start with verbose logging
pnpm --filter ./apps/api run dev
```

### Performance Issues

#### Slow Job Processing

1. **Check RunPod status:**
   ```bash
   curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
     https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runs
   ```

2. **Monitor system resources:**
   ```bash
   # Check disk space
   df -h
   
   # Check memory usage
   free -h
   
   # Check database performance
   pnpm --filter ./apps/api run prisma:studio
   ```

#### High Memory Usage

1. **Optimize image sizes:**
   ```bash
   # Resize images before upload
   convert input.jpg -resize 720x720 output.jpg
   ```

2. **Clean up temporary files:**
   ```bash
   # Clean temp uploads
   rm -rf /tmp/uploads/*
   
   # Clean B2 temp folder (if applicable)
   aws --endpoint-url=$B2_ENDPOINT s3 rm s3://$B2_BUCKET/temp/ --recursive
   ```

### Getting Help

1. **Check logs:**
   ```bash
   # API logs
   pnpm --filter ./apps/api run dev
   
   # Database logs
   tail -f apps/api/prisma/dev.db.log
   ```

2. **Test endpoints individually:**
   ```bash
   # Test each endpoint step by step
   curl http://localhost:4000/_health
   # → Should return {"ok":true}
   ```

3. **Validate configuration:**
   ```bash
   # Run configuration validation
   node scripts/validate-flf2v-bootstrap.js
   ```

## Development Modes

### Local Fake Mode (Default)

Perfect for development without external dependencies:

```bash
VIDEO_RUN_MODE=local_fake
```

**Features:**
- No cloud services required
- Simulated processing with realistic delays
- Uses local SQLite database
- Mock video generation
- Perfect for UI development and testing

**Job Flow:**
1. Job created → Status: QUEUED
2. Simulated processing → Status: RUNNING (with progress updates)
3. Fake completion → Status: COMPLETED
4. Returns mock video URL

### Cloud Mode (Production)

Real video generation using RunPod and cloud storage:

```bash
VIDEO_RUN_MODE=cloud
```

**Features:**
- Actual video generation via ComfyUI on RunPod
- Real cloud storage via Backblaze B2
- Production database (PostgreSQL recommended)
- HMAC-secured webhooks
- Real-time progress updates

**Job Flow:**
1. Job created → Images uploaded to B2
2. RunPod job submitted → Status: QUEUED
3. GPU processing → Status: RUNNING (with real progress)
4. Video generated and stored in B2 → Status: COMPLETED
5. Webhook callback updates status
6. Presigned download URL provided

### Hybrid Development Mode

For testing cloud integration without GPU costs:

```bash
VIDEO_RUN_MODE=cloud
# Set up B2 storage but use a test RunPod endpoint
# Or mock the RunPod responses for testing
```

This allows testing the complete integration flow without incurring GPU processing costs.

---

## Summary

This guide provides comprehensive setup and usage instructions for the FLF2V integration. New contributors should be able to:

1. ✅ Complete basic setup in under 10 minutes
2. ✅ Understand all environment configurations
3. ✅ Use all major API endpoints with working examples
4. ✅ Troubleshoot common issues independently
5. ✅ Deploy to production with cloud services

For additional help, refer to the repository's other documentation files or create an issue in the GitHub repository.