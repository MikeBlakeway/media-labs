# Media Labs

**Next.js ↔ Runpod/ComfyUI ↔ Backblaze B2**

Media Labs is a local‑first developer tool for running your saved **ComfyUI** workflows on **Runpod Serverless** and viewing the results in a **Next.js v15 + TypeScript** app. Inputs are uploaded to a **Runpod Network Volume** (no base64), and outputs (images/videos) are persisted to **Backblaze B2 (S3‑compatible)** for easy access.

> Canonical input method: **Direct Volume Path** — upload files to the Runpod Network Volume and load them by absolute path in your workflow (e.g., `/runpod-volume/inputs/<job>/<file>`). A URL loader via pre‑signed B2 GET is optional.

---

## Features

- 🚀 Run **ComfyUI Export (API)** workflows from the browser
- 📁 **No base64** inputs — stream files to the Runpod Network Volume
- 🧩 On‑the‑fly **workflow patching** of loader node path(s)
- ⏱️ **/runsync** for small jobs, **/run + /status** for long jobs (webhook optional)
- 🗂️ Persist **job history** locally (SQLite) with artifacts + raw JSON
- 📦 Store outputs in **B2 (S3)** and preview images/videos in the UI

---

## Architecture

```
Browser (Next.js)
  ├─ POST /api/volume/upload  ──►  Runpod S3 (Network Volume)  ──►  /runpod-volume/inputs/…
  ├─ POST /api/workflows/patch-run  ──►  Runpod /run or /runsync  ──►  /status or webhook
  └─ View outputs ◄─────────────────────────────  B2 (S3)  ◄────  ComfyUI worker uploads
```

**Why no base64?** Base64 blows up payload sizes, hits `/run`/`/runsync` limits, and is error‑prone. Direct Volume Path avoids all of that and keeps the worker reading files directly from disk.

---

## Tech Stack

- **Frontend:** Next.js v15 (App Router), TypeScript (strict), TailwindCSS
- **Server:** Next.js API routes, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- **Validation:** `zod`
- **Database:** SQLite + Drizzle (job history)
- **Testing:** Vitest / Testing Library / Playwright (optional)

---

## Prerequisites

- Node.js 18+ (20+ recommended)
- Runpod account with a **Serverless ComfyUI** endpoint
- A **Runpod Network Volume** attached to the endpoint (same datacenter)
- A **Runpod S3 API Key** for the Network Volume
- Backblaze **B2** bucket with S3‑compatible access

---

## Quick Start

1. **Clone / create app**

```bash
npx create-next-app@latest media-labs \
  --typescript --tailwind --eslint --src-dir --app \
  --import-alias "@/*"
cd media-labs
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod
```

2. **Environment variables**
   Create `.env.local` (see full list below):

```bash
# Runpod – job submission
RUNPOD_API_KEY=rp_xxx
RUNPOD_ENDPOINT_ID=xxxxxxxx

# Runpod Network Volume (S3-compatible)
RUNPOD_S3_ENDPOINT=https://s3api-<DC>.runpod.io
RUNPOD_S3_REGION=<DC>
RUNPOD_VOLUME_ID=<NETWORK_VOLUME_ID>
RUNPOD_S3_ACCESS_KEY_ID=user_xxx
RUNPOD_S3_SECRET_ACCESS_KEY=rps_xxx

# Backblaze B2 (S3-compatible outputs)
B2_S3_ENDPOINT=https://s3.eu-west-000.backblazeb2.com
B2_S3_REGION=eu-west-000
B2_S3_BUCKET=media-labs-outputs
B2_S3_ACCESS_KEY_ID=xxxx
B2_S3_SECRET_ACCESS_KEY=xxxx
```

3. **Run**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Variables (reference)

| Name                                                      | Purpose                                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `RUNPOD_API_KEY`                                          | Bearer token for Runpod API calls (`/run`, `/runsync`, `/status`)                   |
| `RUNPOD_ENDPOINT_ID`                                      | Your Serverless endpoint id (v2 API)                                                |
| `RUNPOD_S3_ENDPOINT`                                      | Runpod S3 API endpoint for your datacenter (e.g. `https://s3api-eu-ro-1.runpod.io`) |
| `RUNPOD_S3_REGION`                                        | Datacenter id (e.g. `eu-ro-1`)                                                      |
| `RUNPOD_VOLUME_ID`                                        | **Network Volume ID** (used as the S3 bucket name)                                  |
| `RUNPOD_S3_ACCESS_KEY_ID` / `RUNPOD_S3_SECRET_ACCESS_KEY` | Runpod S3 API key credentials                                                       |
| `B2_S3_ENDPOINT`                                          | Backblaze B2 S3 endpoint                                                            |
| `B2_S3_REGION`                                            | B2 region (e.g. `eu-west-000`)                                                      |
| `B2_S3_BUCKET`                                            | Target bucket for outputs                                                           |
| `B2_S3_ACCESS_KEY_ID` / `B2_S3_SECRET_ACCESS_KEY`         | B2 S3 credentials                                                                   |

> **Security:** Keep all secrets server‑side. Never expose these to the browser.

---

## Folder Structure

```bash
src/
  app/
    page.tsx
    jobs/
      page.tsx
      [id]/page.tsx
    api/
      volume/upload/route.ts
      workflows/patch-run/route.ts
      runpod/status/[id]/route.ts
      runpod/webhook/route.ts      # optional
      b2/presign/route.ts          # optional
  components/
  db/
  lib/
  styles/
```

---

## API Endpoints

### `POST /api/volume/upload` (multipart)

Uploads a file to the **Runpod Network Volume** under `inputs/<jobId>/<filename>` and returns the absolute worker path.

#### Request

- `file`: binary (required)
- `jobId`: string (optional; generated if omitted)

#### Response

```json
{
  "key": "inputs/<jobId>/<filename>",
  "workerPath": "/runpod-volume/inputs/<jobId>/<filename>",
  "jobId": "<jobId>"
}
```

#### Example

```bash
curl -F "file=@./example.png" -F "jobId=demo-123" \
  http://localhost:3000/api/volume/upload
```

---

### `POST /api/workflows/patch-run`

Patches a ComfyUI **Export (API)** workflow and submits it to Runpod (`/runsync` or `/run`).

#### Request

```json
{
  "workflow": {
    /* ComfyUI Export (API) JSON */
  },
  "patches": [{ "nodeId": "12", "inputKey": "path", "value": "/runpod-volume/inputs/demo-123/example.png" }],
  "mode": "auto" // auto | sync | async
}
```

#### Response (sync)

```json
{
  "status": "COMPLETED",
  "output": {
    /* worker output */
  }
}
```

#### Response (async)

```json
{ "id": "<runpodJobId>", "status": "IN_PROGRESS" }
```

---

### `GET /api/runpod/status/:id`

Returns job status (`QUEUED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`) and any output payload.

---

### `POST /api/runpod/webhook` (optional)

Runpod can call this on completion so you don’t have to poll. Persist the result and notify the UI.

---

### `POST /api/b2/presign` (optional)

Returns a pre‑signed GET (and/or PUT) URL for private B2 buckets.

---

## Workflow Patching Guide

1. In your ComfyUI workflow, use a **Load‑from‑Path** node (e.g., `LoadImageFromPath`).
2. Upload your media via `/api/volume/upload` and grab the **`workerPath`**.
3. Call `/api/workflows/patch-run` with a `patches[]` entry for the node id / input key:

   - `nodeId`: the id of your loader node in the workflow JSON
   - `inputKey`: the field name (commonly `path`, `image_path`, or `url_or_path`)
   - `value`: the absolute path, e.g., `/runpod-volume/inputs/<job>/<file>`

> For multiple inputs (e.g., reference image + mask), add multiple patch entries.

---

## Runpod Setup (summary)

- Create a **Serverless ComfyUI** endpoint in your chosen datacenter.
- Create a **Network Volume** in the same datacenter and **attach** it to the endpoint.
- Create a **Runpod S3 API Key** and record the S3 endpoint + volume id.
- Ensure your worker image has a **Load‑from‑Path** node available (baked in or mounted from volume).

## Backblaze B2 Setup (summary)

- Create a bucket for outputs; get S3 credentials and endpoint/region.
- Configure the worker (env vars or nodes) to **upload outputs to B2** under `outputs/<jobId>/…`.
- If the bucket is private, use `/api/b2/presign` to generate short‑lived GET URLs for previews.

---

## Development Scripts

```bash
npm run dev       # start Next.js
npm run build     # production build
npm run start     # start in production mode
```

(Drizzle and tests can be added as you enable persistence and CI.)

---

## Security

- Secrets stay server‑side; never expose Runpod/B2 credentials to the browser.
- Sanitize filenames; reject path traversal (no `..`, no separators).
- Validate MIME/types and size on upload; avoid untrusted formats where possible.

---

## Troubleshooting

- **Node not found / input key wrong:** open your workflow JSON and confirm the loader node id and its input key (`path`, `image_path`, `url_or_path`).
- **Path not found:** ensure the uploaded key matches the patched path; confirm `/runpod-volume/inputs/<job>/<file>` exists on the worker.
- **Datacenter mismatch:** the endpoint and network volume must live in the same DC.
- **Large outputs:** ensure worker uploads to B2 and that the app displays via B2 URLs (don’t return base64 blobs).

---

## ADRs

- **ADR‑001 — Input Handling Without Base64:** Canonical input method is **Direct Volume Path**; URL loader is optional.

---

## Roadmap

- Webhook‑by‑default; reduce polling
- Multi‑input mapping UI (mask/control images)
- Per‑run model/LoRA selection
- Batch jobs & queued runs
- Auth (GitHub/Passkeys) and per‑user history
- CI/CD & deployment hardening

---

## License

MIT (or your preferred license)
