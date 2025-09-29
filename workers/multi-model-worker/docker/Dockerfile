# Multi-Modal Inference Worker Dockerfile
#
# Multi-stage build for optimized production deployment
# Supports FLUX.1, ControlNet, AnimateDiff, LTX-Video, Inpainting, and Camera Control

FROM python:3.11-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create model cache directory
RUN mkdir -p /workspace/models

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY src/ ./src/

# Set environment variables
ENV PYTHONPATH=/app/src
ENV MODEL_CACHE_DIR=/workspace/models
ENV RUNPOD_WORKER=true

# Expose port (if needed for local testing)
EXPOSE 8000

# Default command - will be overridden by RunPod
CMD ["python", "src/main.py"]

# Multi-stage build target for model pre-loading (future use)
FROM base as models
# TODO: Add model downloading stage in Phase 2
# RUN python scripts/download_models.py --target-size=40GB

# Production runtime stage
FROM base as runtime
# TODO: Copy pre-downloaded models from models stage
# COPY --from=models /workspace/models /workspace/models