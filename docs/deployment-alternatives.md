# Image Deployment Alternatives

GitHub Actions keeps timing out on these ComfyUI Docker builds. Here are better alternatives:

## Option 1: Local Build & Push (Recommended)

Build and push from your local machine where you have better resources:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u mikeblakeway --password-stdin

# Build and push the runtime image (lightweight)
docker build --target runtime \
  -t ghcr.io/mikeblakeway/media-labs-worker:latest \
  -t ghcr.io/mikeblakeway/media-labs-worker:$(date +%Y%m%d) \
  worker/

docker push ghcr.io/mikeblakeway/media-labs-worker:latest
docker push ghcr.io/mikeblakeway/media-labs-worker:$(date +%Y%m%d)
```

## Option 2: Use Docker Hub Automated Builds

1. Connect your GitHub repo to Docker Hub
2. Set up automated builds that trigger on push
3. Docker Hub has better resources for large builds

## Option 3: Use Pre-built Base Images

Since we're already using S3 for model storage, we can just use the upstream images directly:

```bash
# RunPod template configuration
{
  "containerImage": "runpod/worker-comfyui:5.3.0-base",
  "env": {
    "RUNPOD_S3_ENDPOINT": "https://s3api-eu-ro-1.runpod.io",
    "RUNPOD_S3_REGION": "eu-ro-1",
    "RUNPOD_VOLUME_ID": "axqw0i289u",
    "RUNPOD_S3_ACCESS_KEY_ID": "user_2zMfU4MTJtnB8kk2nyelLeG8BhK",
    "RUNPOD_S3_SECRET_ACCESS_KEY": "rps_K1XKQ5N8CIN69I6SMRFWB30QLI4X0U3LO75K2MBMrzwgz5",
    "MODEL_TYPE": "flux1-dev-fp8",
    "DOWNLOAD_MODELS_ON_START": "true"
  }
}
```

## Option 4: RunPod Build Service

Use RunPod's own infrastructure to build your custom images:

1. Create a RunPod pod with GPU
2. Clone your repo inside the pod
3. Build the image on RunPod's infrastructure
4. Push to your registry from there

## Immediate Solution: Disable CI and Use Local Build

Let me disable the GitHub Actions workflow and give you the commands to build locally.
