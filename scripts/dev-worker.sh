#!/bin/bash
# Development script for running the worker locally

set -e

echo "🚀 Starting Media Labs ComfyUI Worker locally..."

# Check if .env exists
if [[ ! -f .env ]]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your configuration before continuing."
    exit 1
fi

# Source environment variables
source .env

# Create necessary directories
mkdir -p worker/data/comfyui/output
mkdir -p worker/data/runpod-volume
mkdir -p worker/data/models

echo "📁 Created local data directories"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check for NVIDIA Docker support (optional but recommended)
if command -v nvidia-docker &> /dev/null || docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA Docker support detected"
else
    echo "⚠️  NVIDIA Docker support not detected. Worker will run on CPU (very slow)."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd worker

echo "🐳 Building and starting worker container..."
docker-compose up --build

echo "🎉 Worker started! Available at:"
echo "   - Worker API: http://localhost:8000"
echo "   - ComfyUI Web: http://localhost:8188"
echo "   - API Docs: http://localhost:8000/docs"
