# worker/Dockerfile
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# System deps
RUN apt-get update && apt-get install -y \
    git python3 python3-pip ffmpeg wget curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# -------- ComfyUI --------
WORKDIR /opt
RUN git clone https://github.com/comfyanonymous/ComfyUI.git
WORKDIR /opt/ComfyUI

# Install Python deps from Comfy
# (Official docs install requirements, and PyTorch is commonly installed explicitly.)
# https://docs.comfy.org/installation/manual_install
RUN pip3 install --no-cache-dir -r requirements.txt

# Install CUDA-enabled PyTorch wheels (cu121 is broadly compatible with 12.x runtime)
RUN pip3 install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# -------- Worker deps --------
WORKDIR /workspace/app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# App code
COPY src ./src

# Comfy args: point to your Runpod Network Volume YAML when running on serverless.
# The volume mounts at /runpod-volume on Runpod Serverless workers.
ENV COMFY_DIR=/opt/ComfyUI
ENV COMFY_PORT=8188
ENV COMFY_ARGS="--listen 0.0.0.0 --port 8188 --extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml"

# Start the Runpod serverless loop (handler pattern)
# https://docs.runpod.io/serverless/workers/handler-functions
CMD ["python3", "-m", "runpod.serverless.start", "--handler", "src.handler"]
