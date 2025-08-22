# RIFE frame interpolation service
FROM nvidia/cuda:12.1-runtime-ubuntu22.04 as base

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
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r rifeuser && useradd -r -g rifeuser rifeuser

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
    fastapi \
    uvicorn[standard] \
    python-multipart

# Create directories
RUN mkdir -p /app/models /app/uploads /app/outputs

# Create simple FastAPI service
RUN echo 'from fastapi import FastAPI\n\
app = FastAPI(title="RIFE Service")\n\
\n\
@app.get("/")\n\
async def root():\n\
    return {"service": "rife", "status": "running"}\n\
\n\
@app.get("/health")\n\
async def health():\n\
    return {"status": "healthy", "service": "rife"}\n\
\n\
@app.post("/interpolate")\n\
async def interpolate_frames():\n\
    return {"message": "Frame interpolation not implemented yet"}\n\
' > /app/main.py

# Change ownership to app user
RUN chown -R rifeuser:rifeuser /app
USER rifeuser

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]