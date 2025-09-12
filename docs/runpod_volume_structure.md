# RunPod Volume Setup — 60 GB (Seeder Worker Approach)

**Goal:** Prepare a lean ComfyUI model stack that prioritises **video** (I2V + FLF2V + T2V) and still covers **T2I/I2I**, **inpaint/outpaint**, **ControlNet**, and **single‑image→3D** — all within \~**60 GB** of persistent storage.

**Approach:** Uses the **Seeder Worker** multi-container setup to orchestrate model downloads via API calls instead of manual shell scripts.

---

## 1) What you'll install (at a glance)

**Video (primary):**

- **Wan 2.1 FLF2V 14B (FP8)** — first+last‑frame→video and image→video.
- **Wan 2.1 T2V 1.3B (fp16)** — lightweight text→video for quick drafts.
- **Wan 1.3B finetune (optional)** — drop‑in checkpoint that reuses the same encoders/VAE (filename below).
- **Stable Video Diffusion XT 1.1** — robust image→video.

**Images & editing:**

- **SDXL base** for **T2I/I2I** and LoRA stacking.
- **SDXL Inpainting 0.1 (UNet fp16)** for inpaint/outpaint.
- **ControlNet SDXL (small)**: **canny** + **depth** (compact, versatile).

**3D:**

- **TripoSR** — single‑image→mesh; compact and fast.

> **Expected disk use:** \~**43–47 GB**, leaving **13–17 GB** headroom for LoRAs, IP‑Adapter, extra ControlNets, and output cache.

---

## 2) Folder layout (ComfyUI‑compatible)

> The models are downloaded to `/runpod-volume/ComfyUI/models/` which is mounted as the same Network Volume for both the ComfyUI endpoint and the Seeder Worker endpoint.

```bash
/runpod-volume/
  ComfyUI/
    models/
      diffusion_models/
        wan2.1_flf2v_14b_fp8_e4m3fn_scaled.safetensors
        wan2.1_t2v_1.3B_fp16.safetensors
        nsfw_wan_1.3b.safetensors
        svd_xt_1_1.safetensors
        sdxl_base.safetensors
      text_encoders/
        umt5_xxl_fp8_e4m3fn_scaled.safetensors
      clip_vision/
        CLIP-ViT-H-14.safetensors
      vae/
        wan_2.1_vae.safetensors
      unet/
        sdxl_inpaint_0.1_unet_fp16.safetensors
      controlnet/
        controlnet-sdxl-canny-small.safetensors
        controlnet-sdxl-depth-small.safetensors
      triposr/
        model.safetensors
  hf_cache/  # HF_HOME cache location for the Seeder Worker
  .ops/      # Seeder Worker operation logs
```

---

## 3) Prerequisites (multi-container setup)

- **Two RunPod Serverless endpoints** sharing the same Network Volume:

  1. **ComfyUI endpoint** - your existing workflow execution endpoint
  2. **Seeder Worker endpoint** - dedicated volume operations service (see `docs/runpod_volume_seeder.md`)

- **Seeder Worker deployed** with these environment variables:

  ```bash
  HF_TOKEN=your_huggingface_token     # Required for gated models
  HF_HOME=/runpod-volume/hf_cache     # Cache on shared volume
  HF_HUB_ENABLE_HF_TRANSFER=1         # Optional: faster transfers
  ALLOW_DELETE=false                  # Safety: keep deletions disabled
  ```

- **Next.js app configured** with Seeder endpoint:

  ```bash
  SEED_ENDPOINT_ID=your_seeder_endpoint_id
  RUNPOD_API_KEY=your_runpod_api_key
  ```

- **Licenses accepted:**
  - Accept SVD‑XT 1.1 license on its HuggingFace model card **before** seeding
  - Ensure your chosen SDXL base permits your deployment mode (e.g., API/endpoint)

---

## 4) API-driven setup via Seeder Worker

Instead of manual shell scripts, use the Seeder Worker's API to orchestrate model downloads. You can call the Seeder endpoint directly or via your Next.js app's `/api/volume` route.

### Method 1: Via Next.js API Route

Create or call the API route `POST /api/volume` with the complete manifest:

```bash
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "op": "seed",
  "args": {
    "manifest": [
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/diffusion_models/wan2.1_flf2v_720p_14B_fp8_e4m3fn.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "wan2.1_flf2v_14b_fp8_e4m3fn_scaled.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "wan2.1_t2v_1.3B_fp16.safetensors",
        "required": true
      },
      {
        "repo": "NSFW-API/NSFW_Wan_1.3b",
        "remote": "wan_1.3B_e18.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "nsfw_wan_1.3b.safetensors",
        "required": false
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/text_encoders",
        "filename": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/clip_vision/clip_vision_h.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/clip_vision",
        "filename": "CLIP-ViT-H-14.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/vae/wan_2.1_vae.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/vae",
        "filename": "wan_2.1_vae.safetensors",
        "required": true
      },
      {
        "repo": "vdo/stable-video-diffusion-img2vid-xt-1-1",
        "remote": "svd_xt_1_1.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "svd_xt_1_1.safetensors",
        "required": true
      },
      {
        "repo": "SG161222/RealVisXL_V4.0",
        "remote": "RealVisXL_V4.0.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "sdxl_base.safetensors",
        "required": true
      },
      {
        "repo": "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
        "remote": "unet/diffusion_pytorch_model.fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/unet",
        "filename": "sdxl_inpaint_0.1_unet_fp16.safetensors",
        "required": true
      },
      {
        "repo": "diffusers/controlnet-canny-sdxl-1.0-small",
        "remote": "diffusion_pytorch_model.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/controlnet",
        "filename": "controlnet-sdxl-canny-small.safetensors",
        "required": true
      },
      {
        "repo": "diffusers/controlnet-depth-sdxl-1.0-small",
        "remote": "diffusion_pytorch_model.fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/controlnet",
        "filename": "controlnet-sdxl-depth-small.safetensors",
        "required": true
      },
      {
        "repo": "stabilityai/TripoSR",
        "remote": "model.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/triposr",
        "filename": "model.safetensors",
        "required": false
      }
    ]
  }
}
EOF
```

### Method 2: Direct RunPod API calls

```bash
curl -X POST https://api.runpod.ai/v2/${SEED_ENDPOINT_ID}/run \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"input": {"op": "seed", "args": {"manifest": [...]} }}'
```

### Progressive seeding (large models)

For better progress tracking, you can seed models in batches:

```json
// First batch: Core Wan 2.1 models
{"op": "seed", "args": {"manifest": [...]}}

// Second batch: SDXL and ControlNet
{"op": "seed", "args": {"manifest": [...]}}

// Third batch: Optional models
{"op": "seed", "args": {"manifest": [...]}}
```

### Repos used above (for reference)

- Wan 2.1 FLF2V 14B FP8: `Comfy-Org/Wan_2.1_ComfyUI_repackaged` → `split_files/diffusion_models/wan2.1_flf2v_720p_14B_fp8_e4m3fn.safetensors` (renamed locally).
- Wan 2.1 T2V 1.3B FP16: `Comfy-Org/Wan_2.1_ComfyUI_repackaged` → `split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors`.
- Optional 1.3B finetune: `NSFW-API/NSFW_Wan_1.3b` → `wan_1.3B_e18.safetensors` (renamed locally to `nsfw_wan_1.3b.safetensors`).
- UMT5‑XXL FP8 encoder: `Comfy-Org/Wan_2.1_ComfyUI_repackaged` → `split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors`.
- CLIP Vision H: `Comfy-Org/Wan_2.1_ComfyUI_repackaged` → `split_files/clip_vision/clip_vision_h.safetensors` (renamed locally to `CLIP-ViT-H-14.safetensors`).
- Wan 2.1 VAE: `Comfy-Org/Wan_2.1_ComfyUI_repackaged` → `split_files/vae/wan_2.1_vae.safetensors`.
- Stable Video Diffusion XT 1.1: `vdo/stable-video-diffusion-img2vid-xt-1-1` → `svd_xt_1_1.safetensors`.
- SDXL base: `SG161222/RealVisXL_V4.0` → `RealVisXL_V4.0.safetensors` (renamed locally to `sdxl_base.safetensors`).
- SDXL Inpainting UNet 0.1 FP16: `diffusers/stable-diffusion-xl-1.0-inpainting-0.1` → `unet/diffusion_pytorch_model.fp16.safetensors` (renamed locally).
- ControlNet SDXL small (Canny): `diffusers/controlnet-canny-sdxl-1.0-small` → `diffusion_pytorch_model.safetensors` (renamed locally).
- ControlNet SDXL small (Depth): `diffusers/controlnet-depth-sdxl-1.0-small` → `diffusion_pytorch_model.fp16.safetensors` (renamed locally).
- TripoSR: `stabilityai/TripoSR` → `model.safetensors`.

---

## 5) Post‑install verification (via Seeder Worker)

Use the Seeder Worker's `verify` and `stat` operations to confirm your environment is ready:

### Method 1: Verify all models via API

```bash
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d '{"op": "verify", "args": {"checkManifest": true}}'
```

This returns a status report showing which models are present, missing, or have size mismatches.

### Method 2: Get detailed stats

```bash
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d '{"op": "stat", "args": {"path": "/runpod-volume/ComfyUI/models"}}'
```

### Method 3: List specific model directories

Check each category individually:

```bash
# Check diffusion models
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d '{"op": "ls", "args": {"path": "/runpod-volume/ComfyUI/models/diffusion_models"}}'

# Check text encoders
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d '{"op": "ls", "args": {"path": "/runpod-volume/ComfyUI/models/text_encoders"}}'

# Check other categories...
```

### Expected verification output

A successful verification should show all required models as `"status": "present"`:

```json
{
  "status": "success",
  "data": {
    "summary": {
      "total": 12,
      "present": 12,
      "missing": 0,
      "errors": 0
    },
    "models": [
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "filename": "wan2.1_flf2v_14b_fp8_e4m3fn_scaled.safetensors",
        "status": "present",
        "path": "/runpod-volume/ComfyUI/models/diffusion_models/wan2.1_flf2v_14b_fp8_e4m3fn_scaled.safetensors"
      }
    ]
  }
}
```

---

## 6) Workflow notes (video‑first)

- **FLF2V / I2V:** Use **Wan 2.1 FLF2V 14B (FP8)** for first+last‑frame→video and image→video.
- **I2V (alternative):** **SVD‑XT 1.1** for 25‑frame 1024×576 clips with stable motion.
- **T2V:** **Wan 2.1 1.3B** for fast drafts and lower VRAM.
- **Inpaint/Outpaint:** **SDXL Inpainting 0.1 (UNet)** with masks; combine with **ControlNet (canny/depth)** for structure.
- **T2I/I2I base:** Your chosen **SDXL base**; layer LoRAs/IP‑Adapters as needed.
- **3D:** **TripoSR** for quick single‑image → mesh prototypes.

---

## 7) Maintenance & space hygiene (via Seeder Worker)

### Monitor disk usage

Use the Seeder Worker to check disk usage across the volume:

```bash
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d '{"op": "stat", "args": {"path": "/runpod-volume/ComfyUI/models", "recursive": true}}'
```

### Clean up unused models (if enabled)

⚠️ **Warning**: Only available if `ALLOW_DELETE=true` is set in Seeder Worker environment.

```bash
# List models for review before deletion
curl -X POST http://localhost:3000/api/volume \
  -H "Content-Type: application/json" \
  -d '{"op": "ls", "args": {"path": "/runpod-volume/ComfyUI/models/diffusion_models"}}'

# Delete specific unused model (use with caution)
# curl -X POST http://localhost:3000/api/volume \
#   -H "Content-Type: application/json" \
#   -d '{"op": "delete", "args": {"path": "/runpod-volume/ComfyUI/models/diffusion_models/unused_model.safetensors"}}'
```

### HF Cache management

The Seeder Worker manages the HuggingFace cache automatically at `/runpod-volume/hf_cache`. This cache is shared between both endpoints and helps avoid re-downloading models.

### Best practices

- Monitor disk usage regularly using the `stat` operation
- Keep `ALLOW_DELETE=false` in production for safety
- Use progressive seeding to manage large model downloads
- The shared HF cache reduces redundant downloads between operations

---

## 8) Troubleshooting cheatsheet

### Model availability issues

- **Model not showing in ComfyUI dropdown:** Check folder structure using `{"op": "ls"}` - models must be in correct subfolders (see layout in §2). Restart ComfyUI endpoint.
- **Seeder Worker timeout:** Large models may take time - check operation logs via `{"op": "logs"}` or increase timeout settings.
- **Missing models after seeding:** Verify with `{"op": "verify"}` - check for size mismatches or incomplete downloads.

### Performance issues

- **Out of VRAM (Wan 14B):** Lower resolution or frames; ensure FP8 repack is used; check that other endpoints aren't consuming VRAM.
- **Slow downloads:** Check HuggingFace token permissions and network connectivity from Seeder Worker.

### API/Connection issues

- **Seeder Worker not responding:** Check endpoint status in RunPod dashboard; verify `SEED_ENDPOINT_ID` is correct.
- **Permission errors:** Ensure HuggingFace token has access to gated models (SVD-XT requires license acceptance).
- **Next.js API route errors:** Check `/api/volume` route logs; verify `RUNPOD_API_KEY` and endpoint configuration.

### Model-specific issues

- **FLF2V template errors:** Ensure `UMT5‑XXL FP8`, `CLIP‑ViT‑H‑14`, and `wan_2.1_vae` exist in their folders using `{"op": "verify"}`.
- **SVD auth errors:** Confirm you accepted the model license on HuggingFace before seeding.
- **SDXL inpaint artifacts:** Try expanding masks slightly; use ControlNet‑Tile or Depth; upsample then sharpen.

### Debugging with Seeder Worker

- **Check operation status:** `{"op": "status"}` shows current seeding progress
- **View recent logs:** `{"op": "logs"}` provides detailed operation history
- **Test connectivity:** `{"op": "ping"}` verifies Seeder Worker is responsive

---

## 9) Appendix — JSON manifest reference

> Use this complete manifest with the Seeder Worker API for programmatic model management. This manifest includes the **remote path** (as stored on HF) and the **local filename** (after rename) to exactly match your layout.

```json
{
  "op": "seed",
  "args": {
    "manifest": [
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/diffusion_models/wan2.1_flf2v_720p_14B_fp8_e4m3fn.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "wan2.1_flf2v_14b_fp8_e4m3fn_scaled.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "wan2.1_t2v_1.3B_fp16.safetensors",
        "required": true
      },
      {
        "repo": "NSFW-API/NSFW_Wan_1.3b",
        "remote": "wan_1.3B_e18.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "nsfw_wan_1.3b.safetensors",
        "required": false
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/text_encoders",
        "filename": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/clip_vision/clip_vision_h.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/clip_vision",
        "filename": "CLIP-ViT-H-14.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/vae/wan_2.1_vae.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/vae",
        "filename": "wan_2.1_vae.safetensors",
        "required": true
      },
      {
        "repo": "vdo/stable-video-diffusion-img2vid-xt-1-1",
        "remote": "svd_xt_1_1.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "svd_xt_1_1.safetensors",
        "required": true
      },
      {
        "repo": "SG161222/RealVisXL_V4.0",
        "remote": "RealVisXL_V4.0.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "sdxl_base.safetensors",
        "required": true
      },
      {
        "repo": "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
        "remote": "unet/diffusion_pytorch_model.fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/unet",
        "filename": "sdxl_inpaint_0.1_unet_fp16.safetensors",
        "required": true
      },
      {
        "repo": "diffusers/controlnet-canny-sdxl-1.0-small",
        "remote": "diffusion_pytorch_model.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/controlnet",
        "filename": "controlnet-sdxl-canny-small.safetensors",
        "required": true
      },
      {
        "repo": "diffusers/controlnet-depth-sdxl-1.0-small",
        "remote": "diffusion_pytorch_model.fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/controlnet",
        "filename": "controlnet-sdxl-depth-small.safetensors",
        "required": true
      },
      {
        "repo": "stabilityai/TripoSR",
        "remote": "model.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/triposr",
        "filename": "model.safetensors",
        "required": false
      }
    ]
  }
}
```

---

### You're set

Once the files are in place, start ComfyUI and load the **Wan FLF2V** and **SVD‑XT** templates. Add LoRAs and ControlNets as needed within your remaining space.
