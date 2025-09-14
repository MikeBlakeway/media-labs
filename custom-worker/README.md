# Custom ComfyUI Worker with Backblaze B2 Integration

This custom worker extends the official `runpod/worker-comfyui` base image with Backblaze B2 S3 upload configuration.

## Features

- ✅ Built on official RunPod worker-comfyui v5.4.1
- ✅ S3 upload capability (built into official worker)
- ✅ Backblaze B2 compatibility (S3-compatible)
- ✅ Automatic image upload to your B2 bucket
- ✅ Returns S3 URLs instead of base64 strings

## Environment Variables for B2

The official worker requires these environment variables for S3 upload:

```bash
# Backblaze B2 Configuration (S3-compatible)
BUCKET_ENDPOINT_URL=https://your-bucket-name.s3.us-west-002.backblazeb2.com
BUCKET_ACCESS_KEY_ID=your-b2-application-key-id
BUCKET_SECRET_ACCESS_KEY=your-b2-application-key
```

## Building

```bash
docker build -t your-username/comfyui-worker-b2:latest .
```

## Testing Locally

```bash
docker run --rm -p 8000:8000 \
  -e SERVE_API_LOCALLY=true \
  -e BUCKET_ENDPOINT_URL=https://your-bucket.s3.us-west-002.backblazeb2.com \
  -e BUCKET_ACCESS_KEY_ID=your-b2-key-id \
  -e BUCKET_SECRET_ACCESS_KEY=your-b2-secret-key \
  your-username/comfyui-worker-b2:latest
```

## Response Format

With S3 configured, responses will return URLs instead of base64:

```json
{
  "id": "sync-uuid-string",
  "status": "COMPLETED",
  "output": {
    "images": [
      {
        "filename": "ComfyUI_00001_.png",
        "type": "s3_url",
        "data": "https://your-bucket.s3.us-west-002.backblazeb2.com/job-id/ComfyUI_00001_.png"
      }
    ]
  }
}
```
