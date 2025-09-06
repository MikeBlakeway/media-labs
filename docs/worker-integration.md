# ComfyUI Worker Integration

This document describes how to work with the integrated ComfyUI worker in the Media Labs platform.

## Overview

The ComfyUI worker is integrated into the Media Labs platform to provide serverless image generation capabilities. It supports both local development and production deployment on RunPod.

## Quick Start

### Local Development

1. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env and set USE_LOCAL_WORKER=true for local development
   ```

2. **Start the local worker:**

   ```bash
   npm run worker:dev
   # or
   ./scripts/dev-worker.sh
   ```

3. **Test the integration:**

   ```bash
   npm run worker:test
   # or
   ./scripts/test-worker.sh
   ```

4. **Start your Next.js app:**

   ```bash
   npm run dev
   ```

Your app will now use the local worker instead of RunPod when `USE_LOCAL_WORKER=true`.

### Production Deployment

1. **Build and push the worker image:**

   ```bash
   npm run worker:build
   npm run worker:push
   ```

   Or use the GitHub Actions workflow by pushing to the `main` or `development` branch.

2. **Create a RunPod template:**

   - Go to [RunPod Templates](https://runpod.io/console/serverless/user/templates)
   - Create a new template with image: `ghcr.io/mikeblakeway/media-labs-worker:latest`
   - Set appropriate GPU requirements (see [GPU Requirements](#gpu-requirements))

3. **Create a RunPod endpoint:**

   - Go to [RunPod Endpoints](https://runpod.io/console/serverless/user/endpoints)
   - Create endpoint using your template
   - Note the endpoint ID for your `.env` file

4. **Configure environment variables:**

   ```bash
   USE_LOCAL_WORKER=false
   RUNPOD_API_KEY=your_api_key
   RUNPOD_ENDPOINT_ID=your_endpoint_id
   ```

## GPU Requirements

| Model Type          | Minimum VRAM | Recommended Container Size | Base Image Suffix |
| ------------------- | ------------ | -------------------------- | ----------------- |
| FLUX.1 Dev          | 24 GB        | 30 GB                      | `flux1-dev`       |
| FLUX.1 Schnell      | 24 GB        | 30 GB                      | `flux1-schnell`   |
| Stable Diffusion XL | 8 GB         | 15 GB                      | `sdxl`            |
| Stable Diffusion 3  | 5 GB         | 20 GB                      | `sd3`             |
| Base (no models)    | N/A          | 5 GB                       | `base`            |

## Architecture

### Input Format

The worker expects input in this format:

```json
{
  "input": {
    "workflow": {
      // ComfyUI workflow JSON (from API export)
    },
    "images": [
      {
        "name": "input_image.png",
        "image": "data:image/png;base64,iVBOR..."
      }
    ]
  }
}
```

### Output Format

The worker returns results in this format:

```json
{
  "id": "job-id",
  "status": "COMPLETED",
  "output": {
    "images": [
      {
        "filename": "ComfyUI_00001_.png",
        "type": "base64",
        "data": "iVBORw0KGgoAAAANSUh..."
      }
    ]
  },
  "delayTime": 123,
  "executionTime": 4567
}
```

### Integration Points

1. **`src/lib/runpod.ts`**: Updated to support both local and remote workers
2. **Environment Variables**: Configure `USE_LOCAL_WORKER` for development
3. **Docker Setup**: Local development with `docker-compose`
4. **GitHub Actions**: Automated builds and pushes

## Development Workflow

1. **Make changes** to your workflows or worker configuration
2. **Test locally** using the local worker setup
3. **Push to GitHub** to trigger automated worker image builds
4. **Deploy to RunPod** with the new image
5. **Test production** with your live endpoint

## Troubleshooting

### Worker won't start locally

- Check Docker is running: `docker info`
- Check GPU support: `docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi`
- Check logs: `docker-compose -f worker/docker-compose.yml logs`

### API calls failing

- Verify worker is running: `curl http://localhost:8000/health`
- Check environment variables in `.env`
- Check Next.js logs for detailed error messages

### Models not loading

- Ensure models are mounted in the container
- Check model paths in ComfyUI interface (<http://localhost:8188>)
- Verify model files exist and are accessible

## File Structure

```bash
worker/
├── Dockerfile.custom          # Custom worker image definition
├── docker-compose.yml         # Local development setup
├── data/                      # Local data directory
│   ├── comfyui/output/       # Generated images
│   ├── runpod-volume/        # Mounted volume data
│   └── models/               # Local model files (optional)
└── (original worker files)    # From worker-comfyui repo

scripts/
├── dev-worker.sh             # Start local worker
└── test-worker.sh            # Test worker integration

.github/workflows/
└── build-worker.yml          # Automated builds
```

## Next Steps

1. **Add custom models**: Mount model files in the worker container
2. **Add custom nodes**: Extend the Dockerfile to install additional ComfyUI nodes
3. **Configure S3 storage**: Set up persistent storage for generated images
4. **Monitor performance**: Add logging and metrics to track worker performance
