# worker/Dockerfile (GPU)
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

# System deps
RUN apt-get update && apt-get install -y \
    git python3 python3-pip ffmpeg wget curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# -------- ComfyUI --------
WORKDIR /opt
RUN git clone https://github.com/comfyanonymous/ComfyUI.git
WORKDIR /opt/ComfyUI

# Comfy deps
RUN pip3 install --no-cache-dir -r requirements.txt

# CUDA 12.4-compatible PyTorch wheels
# (Use PyTorch’s cu124 index)
RUN pip3 install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# -------- Worker deps --------
WORKDIR /workspace/app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# App code
COPY src ./src

ENV COMFY_DIR=/opt/ComfyUI
ENV COMFY_PORT=8188
ENV COMFY_ARGS="--listen 0.0.0.0 --port 8188 --extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml"

CMD ["python3", "-m", "runpod.serverless.start", "--handler", "src.handler"]
