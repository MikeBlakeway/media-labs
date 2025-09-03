# Media Labs – Requirements (Next.js ↔ Runpod/ComfyUI ↔ Backblaze B2)

## Goals

- Deliver **Media Labs**, a local-first **Next.js v15 + TypeScript** app that runs saved **ComfyUI** workflows on **Runpod Serverless** and displays results.
- **Eliminate base64 inputs** by using the **Direct Volume Path** (Runpod Network Volume) as the canonical method; a URL loader via pre‑signed B2 GET is optional.
- **Persist outputs** (images/videos) to **Backblaze B2 (S3‑compatible)** and make them viewable/downloadable inside Media Labs.
- Support **workflow deployment** from the browser (upload Export‑API `workflow.json` → patch inputs → run → track → view) with a clean developer UX.

## Background

- You already operate a **Runpod Serverless ComfyUI** endpoint with an attached **Network Volume (\~60GB)** and have a **Backblaze B2** bucket.
- You maintain several **ComfyUI workflows** (e.g., `text-to-image.json`, `image2image.json`, `lora.json`) exported from a local ComfyUI instance.
- Prior attempts to pass input images via **base64** caused request‑size and padding issues. The agreed approach for Media Labs is to **upload inputs to the Runpod Network Volume** via its **S3‑compatible API**, then load them by absolute path in the workflow. Outputs are written to **B2**.

## Assumptions

- **App stack**: Next.js v15 (App Router), **TypeScript (strict)**, TailwindCSS; local development first.
- **Secrets**: stored in `.env.local`, used only server‑side. No client exposure of Runpod/B2 credentials.
- **Runpod**:

  - Serverless endpoint and Network Volume reside in the **same datacenter**; volume mounts at **`/runpod-volume`**.
  - A **Runpod S3 API key** exists; S3 endpoint and **Network Volume ID** (bucket) are known.
  - ComfyUI includes a **Load‑from‑Path** node to read absolute paths (e.g., `/runpod-volume/inputs/<job>/<file>`). This **Direct Volume Path** is the canonical input method. A **URL loader** can be installed as an optional fallback (pre‑signed B2 GET).
  - Worker is configured to **upload outputs to S3** (B2) or workflows include S3‑save nodes.

- **Backblaze B2**: bucket exists, keys available, S3 endpoint/region known. Bucket may be private; Media Labs can issue **pre‑signed GET** URLs for viewing.
- **Workflows**: are in **Export (API)** JSON form. Where needed, nodes are switched/parameterized to accept absolute input paths.
- **Non‑goals (phase 1)**: multi‑user auth, full visual workflow editor, cost dashboards.

## Scope

### In‑Scope (Functional)

1. **Input upload to Runpod Network Volume (canonical)**

   - API accepts `multipart/form-data` and streams files to Runpod S3 under `inputs/<jobId>/<filename>`.
   - Returns the **worker path** (`/runpod-volume/inputs/<jobId>/<filename>`) for workflow patching.

2. **Workflow upload & patching**

   - UI to upload `workflow.json` (ComfyUI Export API).
   - Server patcher sets the **path input** on the loader node (e.g., `image_path` / `path`) to the worker path; URL fields are supported only as an optional fallback; optional checkpoint/LoRA overrides.

3. **Job submission & tracking**

   - Submit via `/runsync` for small payloads; otherwise `/run` + `/status` polling.
   - Optional webhook endpoint (future) to replace polling for long jobs.

4. **Output persistence & retrieval**

   - Configure worker/nodes to write outputs to **B2** under `outputs/<jobId>/…`.
   - Render results in Media Labs via public or pre‑signed **B2** URLs (images, MP4/WebM, etc.).

5. **Job history (local)**

   - Minimal store (e.g., SQLite + Drizzle) for jobId, workflow name, input paths, output URLs, status, timestamps.
   - UI list & detail view with artifacts and raw JSON.

6. **Developer UX & safety**

   - Clear error handling; content‑type/size validation; filename normalization; `.env` checks; no client‑side secrets.

### In‑Scope (Non‑Functional)

- **Security**: server‑side credentials only; MIME/type/size validation; basic path sanitization.
- **Performance**: streamed uploads; no base64; `/run` for long jobs; debounced polling (webhook later).
- **Reliability**: retry transient S3/Runpod errors; visible job states; correlate logs by jobId.
- **Observability**: API logs and persisted raw responses for troubleshooting.
- **Cost**: OSS‑first; optional B2 lifecycle policies for large artifacts.

### Out of Scope (Phase 1)

- Authentication/authorization, multi‑tenant spaces.
- Advanced workflow editor/visualizer.
- Horizontal scaling/HA, detailed autoscaling policies, SLOs.
- Full CI/CD and production infra (phase 2+).

### Deliverables & Milestones

- **M1 – Foundations**: Env wiring; Runpod S3 client; `/api/volume/upload`; basic UI to upload media → returns worker path.
- **M2 – Run & Track**: Workflow upload; patcher; `/api/runpod/run` & `/status`; job list/detail.
- **M3 – Outputs**: B2 configuration; show output URLs; inline previews.
- **M4 – Persistence & Polish**: SQLite job log; robust errors/retries; pre‑signed GET for private B2; quick settings screen.
- **M5 – Webhook (Optional)**: `/api/runpod/webhook`; switch long jobs from polling to callbacks.

### Acceptance Criteria (Samples)

- Uploading a PNG writes to the Network Volume and returns a path usable by a path‑loader node.
- Uploading `image2image.json` patches the node path, submits the job, and reaches **COMPLETED** status.
- Outputs appear in B2 under `outputs/<jobId>/…` and are viewable in Media Labs.
- No base64 image bytes are present in job submission payloads.
- Secrets are server‑side; client bundle contains none.

### Risks & Mitigations

- **Custom node availability**: bake into worker or mount via volume at start.
- **Large video artifacts**: always upload from worker to B2; avoid base64 in responses.
- **Datacenter mismatch**: ensure endpoint and volume share the same DC.
- **Filename/path safety**: sanitize keys; block traversal; enforce safe extensions.
