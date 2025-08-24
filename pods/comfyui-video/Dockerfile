FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y python3 python3-pip git ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /opt
RUN git clone https://github.com/comfyanonymous/ComfyUI.git && \
    pip3 install --upgrade pip && \
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    pip3 install xformers
ENV COMFYUI_PORT=8188
VOLUME ["/models","/root/.cache"]
EXPOSE 8188
CMD ["python3","/opt/ComfyUI/main.py","--listen","0.0.0.0","--port","8188"]