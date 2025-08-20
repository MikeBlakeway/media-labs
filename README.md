# Media Lab

An experimental **AI-powered media lab** for generating and transforming images, video, and audio using open-source models.

**Note on licensing:** Some included models (e.g. Stable Video Diffusion, VideoCrafter, certain InsightFace weights) are currently released under **research/non-commercial** terms. This repo is intended for **personal experimentation and demos only**. Before any commercial use, you must swap in models that allow it.

---

## Features (MVP)

* Text → Image via **Stable Diffusion XL (SDXL)**
* Image → Video via **Stable Video Diffusion (SVD)**
* Animate Image using **AnimateDiff**
* Video → Video transformations (VideoCrafter / DynamiCrafter)
* First + Last frame → video (via frame interpolation, RIFE/FILM)
* Face Swap with InsightFace
* Audio Separation with Demucs (vocals / drums / bass / other)

All services are modular, so you can add or swap models later.

---

## Architecture

```
apps/
  web/        # Next.js 15 frontend (Vercel-hosted)
services/
  api/        # FastAPI orchestration API
  comfy/      # ComfyUI (headless) for image/video pipelines
  demucs/     # Audio separation service
  rife/       # Frame interpolation service
  faceswap/   # Face swap service
infra/
  docker/     # Dockerfiles
  compose/    # docker-compose.*.yml for local & GPU host
  k8s/        # (later) manifests
storage/
  artifacts/  # local outputs (or cloud object store in prod)
```

**Flow:**
UI → API → ComfyUI workflow (or another microservice) → artifacts saved to storage → API returns URL → UI shows result.

---

## Getting Started

### Prerequisites

* Docker & docker-compose
* Python 3.10+ (for local dev API work)
* Node.js 20+ (for Next.js frontend)

### Clone & Install

```bash
git clone git@github.com:MikeBlakeway/media-lab.git
cd media-lab
```

### Local Dev (CPU-only)

```bash
docker-compose up --build
```

> For GPU workloads (SDXL, SVD, AnimateDiff, etc.), use `docker-compose -f docker-compose.gpu.yml up` on a GPU machine (RunPod, Vast.ai, local 3090/4090, etc.).

---

## Deployment

* **Frontend:** [Vercel Hobby](https://vercel.com/) (free for MVP)
* **Backend + GPU services:** [RunPod on-demand](https://www.runpod.io/) (≈\$0.46/hr for RTX 3090 on-demand)

---

## Roadmap

### Sprint 1 — Core plumbing (target: 1–2 weeks)

* Setup monorepo structure: `apps/web`, `services/api`, `services/comfy`, `services/demucs`, `services/rife`, `services/faceswap`, `infra`
* Build API service (FastAPI) with `/jobs` endpoints (create/status/list/cancel) and in-memory job store
* Run ComfyUI (headless) in Docker; verify `/prompt` + WebSocket progress
* Add SDXL Text→Image workflow JSON (parameters: prompt, seed, steps, guidance)
* Add SVD Image→Video workflow JSON (parameters: image, frames, fps)
* Implement progress bridge: API subscribes to ComfyUI ws and forwards job % updates
* Create frontend MVP (Next.js 15) with job submission, live progress, and preview
* Implement local artifact storage and signed URLs from API
* Provide Docker Compose files for CPU-only and GPU setups

**Definition of Done (S1):** From the UI, a user can create **T2I** and **I2V** jobs, see progress, and download results.

---

### Sprint 2 — Feature expansion (target: 1–2 weeks)

* Implement Demucs audio separation microservice (upload WAV/MP3 → stems)
* Add AnimateDiff workflow for image→short video
* Add First + Last frame → Video via RIFE interpolation microservice
* Build Face Swap service (InsightFace) with confidence threshold + logs
* Integrate Video→Video pipeline using VideoCrafter/DynamiCrafter (flagged as research-only in UI)
* Add safety & watermarking (visible watermark + usage confirmation)
* Provide deployment templates: Vercel (web) + RunPod (api+workers)
* Add admin controls: endpoint or script to start/stop GPU worker for cost management

**Definition of Done (S2):** All five operations (audio separation, AnimateDiff, RIFE interpolation, face swap, video→video) callable from the UI with clear license notices.

---

### Post-MVP / Backlog

* Add job queue system (Redis + workers) with retries and backoff
* Persist job and usage data in PostgreSQL (audit logs, quotas)
* Add observability stack: structured logs, Prometheus metrics, OpenTelemetry traces
* Implement quotas & rate limiting per user/IP; optional auth for demo environments
* Build model management features: auto-download, checkpoint registry, versioned workflows
* Extend FFmpeg toolkit for concat, trim, re-encode, and audio dubbing
* Add preset system for common workflows and parameter sets
* Track costs per job (GPU time, storage) with reporting
* Prepare commercialization path: integrate commercially-permitted model options

**Definition of Done (S3):** Post-MVP features are complete when the system has: a working Redis-backed job queue with retries; PostgreSQL persistence for jobs, usage, and audit logs; observability in place (structured logs, metrics, traces); quotas and rate limiting enforced; model management with versioning; extended FFmpeg tooling; presets supported; per-job cost tracking; and at least one path documented for using commercially-permitted models.

---

### Project management (labels & boards)

Use a GitHub Project board with these labels to help Copilot auto-suggest issues:

* `type:feature`, `type:bug`, `type:infra`, `type:docs`
* `area:api`, `area:ui`, `area:comfy`, `area:audio`, `area:video`

---

## Contributing

This is an exploratory project. Feel free to open issues or PRs, but note the repo is private while in early MVP stage.

---

## License

Code: MIT
Models: Follow each model’s license (see `models/README.md` once populated).
