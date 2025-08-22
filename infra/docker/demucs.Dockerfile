# Demucs audio separation service
FROM python:3.12-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r demucsuser && useradd -r -g demucsuser demucsuser

# Set work directory
WORKDIR /app

# Install Demucs and dependencies
RUN pip install --no-cache-dir \
    demucs \
    fastapi \
    uvicorn[standard] \
    python-multipart

# Create directories
RUN mkdir -p /app/uploads /app/outputs

# Create simple FastAPI service
RUN echo 'from fastapi import FastAPI\n\
app = FastAPI(title="Demucs Service")\n\
\n\
@app.get("/")\n\
async def root():\n\
    return {"service": "demucs", "status": "running"}\n\
\n\
@app.get("/health")\n\
async def health():\n\
    return {"status": "healthy", "service": "demucs"}\n\
\n\
@app.post("/separate")\n\
async def separate_audio():\n\
    return {"message": "Audio separation not implemented yet"}\n\
' > /app/main.py

# Change ownership to app user
RUN chown -R demucsuser:demucsuser /app
USER demucsuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]