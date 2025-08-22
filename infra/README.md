# Infrastructure Configuration

This directory contains Docker configurations for the Media Lab project, supporting both CPU-only development and GPU-enabled production environments.

## Directory Structure

```
infra/
├── docker/                     # Service-specific Dockerfiles
│   ├── api.Dockerfile         # FastAPI orchestration service
│   ├── comfyui.Dockerfile     # ComfyUI with CUDA support
│   ├── demucs.Dockerfile      # Audio separation service
│   ├── rife.Dockerfile        # Frame interpolation service
│   └── faceswap.Dockerfile    # Face swap service with InsightFace
└── compose/                    # Docker Compose configurations
    ├── docker-compose.yml     # CPU-only setup (alternative configuration)
    └── docker-compose.gpu.yml # GPU-enabled setup (alternative configuration)
```

## Dockerfiles

### API Service (`api.Dockerfile`)

- **Base Image:** Python 3.12 slim
- **Features:** FastAPI, health checks, non-root user
- **Ports:** 8000
- **Storage:** `/app/storage/artifacts`, `/app/storage/models`, `/app/storage/uploads`

### ComfyUI Service (`comfyui.Dockerfile`)

- **Base Image:** NVIDIA CUDA 12.1 runtime on Ubuntu 22.04
- **Features:** ComfyUI with GPU support, PyTorch with CUDA
- **Ports:** 8188
- **GPU:** Required for production workloads

### Worker Services

- **Demucs:** Audio separation (CPU-only)
- **RIFE:** Frame interpolation with GPU support
- **FaceSwap:** Face swap with InsightFace and GPU support

## Usage

### Building Individual Images

```bash
# API service
docker build -f infra/docker/api.Dockerfile -t media-lab-api services/api

# ComfyUI service
docker build -f infra/docker/comfyui.Dockerfile -t media-lab-comfyui .

# Worker services
docker build -f infra/docker/demucs.Dockerfile -t media-lab-demucs .
docker build -f infra/docker/rife.Dockerfile -t media-lab-rife .
docker build -f infra/docker/faceswap.Dockerfile -t media-lab-faceswap .
```

### Using Docker Compose

The root-level `docker-compose.yml` and `docker-compose.gpu.yml` files reference these Dockerfiles and provide complete environment setups.

```bash
# CPU-only development
docker compose up --build

# GPU-enabled production
docker compose -f docker-compose.gpu.yml up --build
```

## Health Checks

All services include health checks:

- **API:** `GET /health` returns `{"status": "healthy", "service": "api"}`
- **ComfyUI:** `GET /` checks web interface availability
- **Workers:** Service-specific health endpoints

## Security Features

- Non-root users in all containers
- Minimal base images (slim variants where possible)
- Explicit port exposure
- Volume mount security considerations

## GPU Support

GPU-enabled services use:

- **NVIDIA CUDA 12.1** runtime images
- **Docker GPU runtime** configuration
- **PyTorch with CUDA** support
- Proper **device allocation** in compose files

## Development vs Production

- **Development (CPU):** Faster builds, no GPU requirements, suitable for testing
- **Production (GPU):** Full GPU acceleration for AI workloads, optimized for inference

## Troubleshooting

- Ensure Docker and Docker Compose are installed
- For GPU support, install NVIDIA Docker runtime
- Check port availability (8000, 8001, 8002, 8003, 8188)
- Verify volume mount permissions
- Use `docker compose logs <service>` for debugging
