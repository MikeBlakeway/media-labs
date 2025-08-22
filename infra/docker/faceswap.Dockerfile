# FaceSwap service with InsightFace
FROM nvidia/cuda:12.1-runtime-ubuntu22.04 AS base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r faceswapuser && useradd -r -g faceswapuser faceswapuser

# Set work directory
WORKDIR /app

# Create virtual environment
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Install dependencies
RUN pip install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 \
    opencv-python \
    numpy \
    insightface \
    onnxruntime-gpu \
    fastapi \
    uvicorn[standard] \
    python-multipart

# Create directories
RUN mkdir -p /app/models /app/uploads /app/outputs

# Create simple FastAPI service
RUN echo 'from fastapi import FastAPI\n\
app = FastAPI(title="FaceSwap Service")\n\
\n\
@app.get("/")\n\
async def root():\n\
    return {"service": "faceswap", "status": "running"}\n\
\n\
@app.get("/health")\n\
async def health():\n\
    return {"status": "healthy", "service": "faceswap"}\n\
\n\
@app.post("/swap")\n\
async def swap_faces():\n\
    return {"message": "Face swap not implemented yet"}\n\
' > /app/main.py

# Change ownership to app user
RUN chown -R faceswapuser:faceswapuser /app
USER faceswapuser

# Expose port
EXPOSE 8003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]