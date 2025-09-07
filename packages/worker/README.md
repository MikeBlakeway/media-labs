# Multi-Stage ComfyUI Worker Dockerfile

This directory contains a unified multi-stage Dockerfile for building ComfyUI workers optimized for different use cases.

## Targets

### `runtime` (Default for CI/CD)

- **Size**: ~5GB (no models baked in)
- **Use Case**: Production deployment on RunPod with S3 volume
- **Models**: Downloaded at runtime from HuggingFace to your S3 volume
- **Build Time**: ~2-3 minutes

### `dev` (Local Development)

- **Size**: ~15GB (includes pre-downloaded models)
- **Use Case**: Local development without S3 dependency
- **Models**: Baked into the image during build
- **Build Time**: ~15-30 minutes (depending on model downloads)

## Build Commands

### Production (CI/CD)

```bash
# Build lightweight image for RunPod deployment
docker build --target runtime -t ghcr.io/mikeblakeway/media-labs-worker:latest worker/

# Build with specific model type
docker build --target runtime \
  --build-arg MODEL_TYPE=flux1-dev-fp8 \
  -t ghcr.io/mikeblakeway/media-labs-worker:latest \
  worker/
```

### Local Development

```bash
# Build with models included (requires HF token for gated models)
docker build --target dev \
  --build-arg MODEL_TYPE=flux1-dev \
  --build-arg HUGGINGFACE_ACCESS_TOKEN=your_token_here \
  -t media-labs-worker:dev \
  worker/

# Build with SDXL models (no token required)
docker build --target dev \
  --build-arg MODEL_TYPE=sdxl \
  -t media-labs-worker:sdxl \
  worker/
```

## Runtime Configuration

### Environment Variables

#### S3 Volume (Production)

```bash
# RunPod S3 credentials
RUNPOD_S3_ENDPOINT=https://s3api-eu-ro-1.runpod.io
RUNPOD_S3_REGION=eu-ro-1
RUNPOD_VOLUME_ID=your_volume_id
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key

# Model download configuration
MODELS_SOURCE=s3
DOWNLOAD_MODELS_ON_START=true
MODEL_TYPE=flux1-dev-fp8

# HuggingFace authentication (for gated models)
HUGGINGFACE_ACCESS_TOKEN=your_hf_token
```

#### Local Development Settings

```bash
# Disable S3 model downloading
MODELS_SOURCE=local
DOWNLOAD_MODELS_ON_START=false

# Or use local volume mount
docker run -v /path/to/local/models:/comfyui/models ...
```

## Model Types

| Type            | Models Included             | Size  | HF Token Required |
| --------------- | --------------------------- | ----- | ----------------- |
| `flux1-dev-fp8` | FLUX.1 Dev (FP8 quantized)  | ~8GB  | No                |
| `flux1-dev`     | FLUX.1 Dev (full precision) | ~12GB | Yes               |
| `flux1-schnell` | FLUX.1 Schnell              | ~12GB | Yes               |
| `sdxl`          | Stable Diffusion XL         | ~7GB  | No                |
| `sd3`           | Stable Diffusion 3 Medium   | ~10GB | Yes               |

## RunPod Deployment

### S3 Volume Setup

1. Create a RunPod Network Volume
2. Note the Volume ID (becomes your S3 bucket name)
3. Configure S3 credentials in your RunPod template environment

### Template Configuration

```json
{
  "name": "Media Labs ComfyUI Worker",
  "containerImage": "ghcr.io/mikeblakeway/media-labs-worker:latest",
  "containerDiskInGb": 20,
  "volumeInGb": 50,
  "networkVolumeId": "your_volume_id",
  "env": {
    "RUNPOD_S3_ENDPOINT": "https://s3api-eu-ro-1.runpod.io",
    "RUNPOD_S3_REGION": "eu-ro-1",
    "RUNPOD_VOLUME_ID": "your_volume_id",
    "RUNPOD_S3_ACCESS_KEY_ID": "your_access_key",
    "RUNPOD_S3_SECRET_ACCESS_KEY": "your_secret_key",
    "MODEL_TYPE": "flux1-dev-fp8",
    "MODELS_SOURCE": "s3",
    "DOWNLOAD_MODELS_ON_START": "true",
    "HUGGINGFACE_ACCESS_TOKEN": "your_hf_token"
  }
}
```

## Local Development with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  comfyui:
    build:
      context: ./worker
      target: runtime
    ports:
      - '8000:8000'
      - '8188:8188'
    environment:
      - SERVE_API_LOCALLY=true
      - MODELS_SOURCE=s3
      - DOWNLOAD_MODELS_ON_START=true
      - MODEL_TYPE=flux1-dev-fp8
      # Add your S3 credentials here
    env_file:
      - .env.local
```

## GitHub Actions

The workflow automatically builds the `runtime` target and pushes to GHCR:

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: ./worker
    file: ./worker/Dockerfile
    target: runtime # Builds lightweight image
    platforms: linux/amd64
    push: true
```

## Migration from Old Setup

### What Changed

- ✅ Single unified Dockerfile instead of two separate files
- ✅ Models downloaded to S3 volume at runtime (not baked into image)
- ✅ Faster CI builds (~3 minutes vs 30+ minutes)
- ✅ Smaller images for production deployment
- ✅ Better model management and versioning

### Migration Steps

1. Update your RunPod template environment variables
2. Ensure your S3 volume is configured and accessible
3. Deploy the new image from GHCR
4. Models will download automatically on first run

## Troubleshooting

### Model Download Issues

```bash
# Check S3 connectivity
docker run --rm -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... \
  amazon/aws-cli s3 ls s3://your-volume-id/

# Test model download script
docker run --rm -it \
  -e RUNPOD_VOLUME_ID=your_volume_id \
  -e MODEL_TYPE=flux1-dev-fp8 \
  media-labs-worker:test \
  python /usr/local/bin/download-models
```

### Local Development Setup

```bash
# Build and test locally
docker build --target runtime -t test worker/
docker run --rm -p 8000:8000 -e SERVE_API_LOCALLY=true test

# Test with local models
docker run --rm -p 8000:8000 \
  -v /path/to/models:/comfyui/models \
  -e MODELS_SOURCE=local \
  test
```
