FROM python:3.11-slim AS builder

ARG COMFYUI_REPO=https://github.com/comfyanonymous/ComfyUI.git
ARG COMFYUI_REF=master
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
  git \
  ca-certificates \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/comfyui

# Clone sources and install build dependencies
RUN git clone --depth 1 --branch ${COMFYUI_REF} ${COMFYUI_REPO} .

# Use requirements if present, otherwise install minimal runtime deps into wheel cache
RUN if [ -f requirements.txt ]; then \
  pip wheel --wheel-dir /wheels -r requirements.txt; \
  else \
  pip wheel --wheel-dir /wheels torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
  pip wheel --wheel-dir /wheels fastapi uvicorn httpx; \
  fi

FROM python:3.11-slim AS runtime

WORKDIR /opt/comfyui

# Copy wheels from builder and install
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* || true

# Set runtime environment variables to avoid CUDA init
ENV COMFYUI_USE_CPU=1
ENV CUDA_VISIBLE_DEVICES=""
ENV TORCH_CUDA_ARCH_LIST=""

# Copy only necessary runtime files (if repo exists in builder, copy everything)
COPY --from=builder /opt/comfyui /opt/comfyui

EXPOSE 8188

CMD ["sh", "-c", "if [ -f /opt/comfyui/main.py ]; then python /opt/comfyui/main.py --listen 0.0.0.0 --port 8188 --cpu; elif [ -f /opt/comfyui/server.py ]; then python /opt/comfyui/server.py --host 0.0.0.0 --port 8188 --cpu; else echo 'ComfyUI entrypoint not present; sleeping' && sleep infinity; fi"]
