FROM python:3.11-slim

ARG COMFYUI_REPO=https://github.com/comfyanonymous/ComfyUI.git
ARG COMFYUI_REF=master
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
  git \
  ca-certificates \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/comfyui

# Clone the specified ComfyUI repo (use build-arg to override)
RUN git clone --depth 1 --branch ${COMFYUI_REF} ${COMFYUI_REPO} . \
  && echo "Cloned ComfyUI into $(pwd)" \
  && ls -la $(pwd) | sed -n '1,200p'

# If the repo provides requirements, install them. Fallback to minimal deps.
RUN if [ -f requirements.txt ]; then \
      pip install --no-cache-dir -r requirements.txt; \
    else \
  # Install CPU-only PyTorch to avoid CUDA initialization errors in CPU-only environments
  pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
  pip install --no-cache-dir fastapi uvicorn httpx; \
    fi

ENV COMFYUI_USE_CPU=1
# Prevent PyTorch from initializing CUDA in CPU-only containers
ENV CUDA_VISIBLE_DEVICES=""
ENV TORCH_CUDA_ARCH_LIST=""

EXPOSE 8188

# Default command: attempt to run ComfyUI's main entry if present.
# If your ComfyUI fork uses a different entrypoint, override CMD in compose or pass RUN args.
CMD ["sh", "-c", "if [ -f main.py ]; then python main.py --listen 0.0.0.0 --port 8188 --cpu; elif [ -f server.py ]; then python server.py --host 0.0.0.0 --port 8188 --cpu; else echo 'ComfyUI entrypoint not present; sleeping' && sleep infinity; fi"]
