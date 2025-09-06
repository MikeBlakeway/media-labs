# Large Image Build Workarounds

## Problem Analysis

The GitHub Actions build is failing because the `runpod/worker-comfyui:5.3.0-flux1-dev` base image is extremely large (likely 10GB+) due to:

1. **FLUX.1 models**: Large diffusion models (~5-8GB each)
2. **ComfyUI dependencies**: PyTorch, CUDA libraries, etc.
3. **System dependencies**: Full Ubuntu base with GPU drivers

GitHub Actions has limitations:
- 6-hour timeout per job
- Network bandwidth limitations
- Disk space constraints (14GB available)

## Recommended Solutions

### Option 1: Multi-stage Build with Smaller Base (Recommended)

Create a leaner Dockerfile that pulls models at runtime instead of build time:

```dockerfile
# Use a smaller base image without pre-installed models
ARG BASE_WORKER_IMAGE=runpod/worker-comfyui:5.3.0-base
FROM ${BASE_WORKER_IMAGE}

# Add metadata
LABEL org.opencontainers.image.title="Media Labs ComfyUI Worker"
LABEL org.opencontainers.image.description="Custom ComfyUI worker for Media Labs platform"
LABEL org.opencontainers.image.vendor="Media Labs"
LABEL org.opencontainers.image.source="https://github.com/mikeblakeway/media-labs"

# Set working directory
WORKDIR /comfyui

# Copy custom configuration
COPY src/extra_model_paths.yaml ./
COPY handler.py ./

# Models will be downloaded at runtime from your S3/model storage
# This keeps the image size manageable

EXPOSE 8000 8188
```

### Option 2: Use GitHub's Large Runner (Paid)

If you have GitHub Pro/Enterprise, use larger runners:

```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest-8-cores  # or ubuntu-latest-16-cores
    timeout-minutes: 360  # 6 hours
```

### Option 3: Split Build Process

Build locally and push to registry, then reference in Actions:

```bash
# Build locally (where you have better bandwidth/disk)
docker build -t ghcr.io/mikeblakeway/media-labs-worker:latest -f worker/Dockerfile.custom worker/
docker push ghcr.io/mikeblakeway/media-labs-worker:latest
```

### Option 4: Use External Build Service

Use Docker Hub's automated builds or other CI services with better resources:

1. **Docker Hub Automated Builds**
2. **GitLab CI** (more generous resource limits)
3. **CircleCI** with large resource classes

### Option 5: Model Download at Runtime

Modify the worker to download models on first run:

```python
# In handler.py
def download_models_if_needed():
    """Download models from S3/Hugging Face on first run"""
    models_dir = "/comfyui/models"
    if not os.path.exists(f"{models_dir}/flux1-dev.safetensors"):
        # Download from your model storage
        download_from_s3("models/flux1-dev.safetensors", models_dir)
```

## Implementation Plan

### Immediate Fix: Use Base Image

1. **Update Dockerfile** to use the smaller base variant
2. **Configure runtime model loading** from your S3 storage
3. **Test locally** with docker-compose first

### Long-term: Optimize Build Process

1. **Set up model caching** in your S3 storage
2. **Implement progressive model loading** (download only what's needed)
3. **Consider model serving architecture** (separate model storage service)

## Next Steps

1. Try Option 1 (smaller base image) first - this should resolve the immediate build issue
2. Set up proper model management in your S3 storage
3. Test the worker deployment on RunPod with runtime model loading
4. Monitor build times and optimize further if needed

Would you like me to implement Option 1 by updating the Dockerfile to use the base variant?
