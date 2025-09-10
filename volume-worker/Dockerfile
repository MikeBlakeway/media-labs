# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy handler
COPY handler.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/runpod-volume/hf_cache
ENV ALLOW_DELETE=false
ENV LOCAL_MODE=false

# Create volume mount point
RUN mkdir -p /runpod-volume

# Expose port (for local testing)
EXPOSE 8000

# Start handler
CMD ["python", "handler.py"]
