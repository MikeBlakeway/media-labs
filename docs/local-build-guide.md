# Local Build Guide - ComfyUI Worker

Since GitHub Actions times out with large ComfyUI images (~15GB), we build and deploy locally.

## Prerequisites

1. **Docker**: Installed and running
2. **GitHub Container Registry Access**: Authenticated with GitHub
3. **RunPod Account**: With S3 volume `axqw0i289u` configured

## One-Time Setup

### 1. Authenticate with GitHub Container Registry

```bash
# Create a GitHub Personal Access Token with 'write:packages' permission
# Then login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 2. Verify RunPod S3 Credentials

Your `.env.local` should have:

```bash
RUNPOD_VOLUME_ID=axqw0i289u
RUNPOD_S3_REGION=us-east-1
RUNPOD_S3_ENDPOINT=https://axqw0i289u.vol.runpod.net
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key
```

## Build Process

### 1. Build the Runtime Image

```bash
cd worker

# Build the lightweight runtime image (recommended for production)
docker build -t media-labs-worker:runtime --target runtime .

# Tag for GitHub Container Registry
docker tag media-labs-worker:runtime ghcr.io/mikeblakeway/media-labs-worker:runtime

# Push to registry
docker push ghcr.io/mikeblakeway/media-labs-worker:runtime
```

### 2. Alternative: Build the Dev Image (Full ComfyUI)

```bash
# If you need the full ComfyUI installation (larger, ~15GB)
docker build -t media-labs-worker:dev --target dev .
docker tag media-labs-worker:dev ghcr.io/mikeblakeway/media-labs-worker:dev
docker push ghcr.io/mikeblakeway/media-labs-worker:dev
```

### 3. Test Locally First

```bash
# Test the runtime image locally
docker run --rm \
  -e RUNPOD_VOLUME_ID=axqw0i289u \
  -e RUNPOD_S3_REGION=us-east-1 \
  -e RUNPOD_S3_ENDPOINT=https://axqw0i289u.vol.runpod.net \
  -e RUNPOD_S3_ACCESS_KEY_ID=your_access_key \
  -e RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key \
  -p 8000:8000 \
  media-labs-worker:runtime
```

## RunPod Deployment

### 1. Create/Update RunPod Template

Use the runtime image for better performance:

- **Container Image**: `ghcr.io/mikeblakeway/media-labs-worker:runtime`
- **Network Volume**: `axqw0i289u` mounted at `/runpod-volume`

### 2. Environment Variables

Configure these in your RunPod template:

```bash
RUNPOD_VOLUME_ID=axqw0i289u
RUNPOD_S3_REGION=us-east-1
RUNPOD_S3_ENDPOINT=https://axqw0i289u.vol.runpod.net
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key
```

### 3. Model Management

Models are downloaded at runtime from HuggingFace to your S3 volume:

```bash
# Download models to S3 (run this from worker directory)
python scripts/download-models.py --config flux_dev
```

## Build Times

- **Runtime Target**: ~5-10 minutes (lightweight, downloads models at runtime)
- **Dev Target**: ~30-60 minutes (full ComfyUI installation)

## Troubleshooting

### Build Issues

```bash
# Clean Docker cache if builds fail
docker system prune -a

# Check available space
docker system df
```

### Registry Push Issues

```bash
# Re-authenticate if push fails
docker logout ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

### RunPod Issues

- Verify S3 credentials in RunPod template environment variables
- Check `/runpod-volume` is properly mounted
- Monitor worker logs for model download progress

## Quick Commands Reference

```bash
# Full build and push workflow
cd worker
docker build -t media-labs-worker:runtime --target runtime .
docker tag media-labs-worker:runtime ghcr.io/mikeblakeway/media-labs-worker:runtime
docker push ghcr.io/mikeblakeway/media-labs-worker:runtime

# Update RunPod template to use new image
# ghcr.io/mikeblakeway/media-labs-worker:runtime
```

This approach gives you:

- ✅ Faster builds (no CI timeouts)
- ✅ Better control over the process
- ✅ S3 model loading for efficiency
- ✅ Local testing before deployment
