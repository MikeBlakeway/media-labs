# AGENTS.md – MVP Worker Requirements

This document defines the **MVP requirements** for our bespoke RunPod worker. It is written to inform AI agents of the scope, constraints, and objectives.

---

## Project Goal

Create a proof-of-concept worker on RunPod that supports **multi-modal AI inference** with a compact model footprint. This MVP should:

- Cover **all required endpoint types** (text-to-image, image-to-image, text-to-video, image-to-video, video-to-video, inpainting, ControlNet, camera control).
- Stay **below 80 GB** in model storage.
- Demonstrate **end-to-end functionality** across modalities with minimal latency and manageable cost.

---

## MVP Requirements

### Modalities

- **Text→Image / Image→Image**

  - Model: `FLUX.1 [schnell] (fp8)` (~12–15 GB)

- **Control**

  - Models: `ControlNet (canny + depth only)` (~3–4 GB)

- **Image→Video**

  - Model: `AnimateDiff (1 motion adapter)` (~2 GB)

- **Text→Video**

  - Model: `LTX-Video 2B (distilled)` (~6–10 GB)

- **Video→Video**

  - Lightweight editor placeholder (optional for MVP)

- **Inpainting**

  - Model: `SDXL Inpainting` (~6–8 GB)

- **Camera Control**

  - Module: `CameraCtrl` (code + tiny weights, <1 GB)

### Total Footprint

- Expected usage: **~30–40 GB**
- Hard cap: **≤ 80 GB**

---

## Infrastructure Notes

- **Deployment Target:** RunPod (serverless for MVP)
- **Storage:** RunPod **Network Volume** (shared, avoids re-downloads)
- **Startup:** Enable **FlashBoot** to minimize cold-starts
- **Cache:** Centralize Hugging Face cache in `/workspace/cache/hf` and prune regularly

---

## Scaling Path (NOT REQUIRED CURRENTLY)

- **Beta (≤ 150 GB)**: Add `SD3-Medium`, expand ControlNets, upgrade Text→Video to LTX-13B fp8, optionally add `HunyuanVideo`.
- **Production (300+ GB)**: Add WAN 2.2 AIO, multiple backbones, full ControlNet suite, multiple AnimateDiff modules, upscalers, and advanced V2V editors.

---

## Rules for AI Agents

1. Always verify **disk usage** before pulling new models.
2. Do not exceed **80 GB** total in MVP stage.
3. Ensure **all endpoints** remain functional.
4. Favor **fp8/distilled** weights where possible.
5. Prefer **pods** only if GPU utilization exceeds 40%; otherwise stay serverless.
6. Use the **directory layout** defined in `Runpod Worker Model Plan`.

---

## Key Directory Structure (MVP)

```bash
/workspace/models/
  flux/
    flux1-schnell-fp8.safetensors
  controlnet/
    canny.safetensors
    depth.safetensors
  animatediff/
    motion_adapter.safetensors
  video_backbones/
    ltx-2b-distilled/
  inpaint/
    sdxl-inpaint.safetensors
  camera/
    camctrllib/
```

---

## Success Criteria

- Worker can:

  - Generate an image from text (T2I)
  - Apply ControlNet guidance
  - Animate an image into video (I2V)
  - Generate a video from text (T2V)
  - Perform inpainting
  - Demonstrate camera control in video

- Total disk ≤ 80 GB
- Runs cost-effectively in serverless mode
