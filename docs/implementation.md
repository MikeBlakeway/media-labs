# Media Labs – Implementation Plan

> Scope: Next.js v15 (App Router, TS strict) app that uploads inputs to a Runpod Network Volume, patches ComfyUI workflows, submits jobs to Runpod Serverless, and persists outputs to Backblaze B2. Canonical input method: **Direct Volume Path**.

## 1) Architecture (high level)

- **UI (Next.js client)** → uploads media via `POST /api/volume/upload` (multipart) → gets back `workerPath`.
- **API (Next.js server)**

  - `POST /api/workflows/patch-run` → accepts workflow JSON + list of path mappings → patches loader node(s) → submits job (`/runsync` or `/run`) → returns result or job id.
  - `GET /api/runpod/status/:id` → polls status for async jobs.
  - `POST /api/runpod/webhook` (optional) → Runpod calls on job completion → we persist & notify UI.
  - `POST /api/b2/presign` → optional pre-signed GET for private B2 buckets (outputs viewing).

- **Runpod Serverless (ComfyUI worker)**

  - Mounts **Network Volume** at `/runpod-volume` (serverless).
  - Loads inputs by absolute paths from patched workflow nodes.
  - Saves outputs either via worker S3 upload → **Backblaze B2**, or via S3-save nodes in the workflow.

- **Data**: Local SQLite (via Drizzle) stores jobs, artifacts, and workflow metadata.

## 2) Tech stack & deps

- **Frontend**: Next.js v15, TypeScript (strict), TailwindCSS.
- **Server**: Next.js API routes, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
- **Validation**: `zod` (request/response schemas).
- **DB**: SQLite + `drizzle-orm` + `drizzle-kit` migrations.
- **Testing**: Vitest + Testing Library; Playwright (basic e2e).
- **Lint/format**: ESLint, Prettier (project rules: no semicolons, singles quotes, 2-space, no trailing commas).

## 3) Environment variables

```bash
# Runpod (job submission)
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

## 4) Directory & file structure

```bash
src/
  app/
    page.tsx                     # Home (upload, choose workflow, run, results)
    jobs/
      page.tsx                   # Job history list
      [id]/page.tsx              # Job detail (artifacts, raw JSON)
    api/
      volume/
        upload/route.ts          # multipart upload → Runpod volume
      workflows/
        patch-run/route.ts       # patch + submit job
      runpod/
        status/[id]/route.ts     # status polling
        webhook/route.ts         # optional webhook
      b2/
        presign/route.ts         # optional pre-signed GET for private outputs
  lib/
    runpod.ts                    # /run, /runsync, /status helpers
    runpodVolume.ts              # S3 client for Runpod volume
    b2.ts                        # S3 client for B2
    patchWorkflow.ts             # pure functions to patch nodes
    logger.ts                    # minimal structured logger
    zodSchemas.ts                # request/response validators
  db/
    schema.ts                    # Drizzle models (Job, Artifact)
    drizzle.config.ts
  components/
    UploadCard.tsx
    WorkflowCard.tsx
    JobList.tsx
    JobDetail.tsx
  styles/
    globals.css
```

## 5) Data model (SQLite via Drizzle)

```ts
export interface Job {
  id: string // runpod job id or synthetic id for sync jobs
  label: string // user-supplied name or derived from workflow
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  workflowName: string
  workflowHash: string // sha256 of workflow JSON (for dedupe)
  inputPaths: string[] // ['/runpod-volume/inputs/...']
  outputUrls: string[] // B2 URLs or pre-signed GETs
  createdAt: number
  updatedAt: number
  rawRequest?: string // trimmed JSON of the request
  rawResponse?: string // trimmed JSON of final response
}

export interface Artifact {
  id: string
  jobId: string
  kind: 'image' | 'video' | 'json' | 'other'
  filename: string
  url: string // stable B2 URL (or presigned GET generated on demand)
  bytes: number | null
  createdAt: number
}
```

## 6) API contracts (Zod style)

```ts
// POST /api/volume/upload  (multipart: file, optional jobId)
// → 200 { key: string; workerPath: string; jobId: string }

// POST /api/workflows/patch-run
const PatchRunReq = z.object({
  workflow: z.record(z.any()), // ComfyUI Export API JSON
  patches: z.array(
    z.object({
      nodeId: z.string(), // e.g., '12'
      inputKey: z.string(), // e.g., 'path' | 'image_path' | 'url_or_path'
      value: z.string() // e.g., '/runpod-volume/inputs/<job>/<file>'
    })
  ),
  mode: z.enum(['auto', 'sync', 'async']).default('auto')
})
// → 200 (sync): { status: 'COMPLETED'|'FAILED', output?: {...} }
// → 200 (async): { id: string, status: 'IN_PROGRESS' }

// GET /api/runpod/status/:id
// → 200 { status: 'QUEUED'|'IN_PROGRESS'|'COMPLETED'|'FAILED', output?: {...} }

// POST /api/runpod/webhook (optional)
// Runpod posts completion → we persist and return 200

// POST /api/b2/presign
const PresignReq = z.object({ key: z.string(), contentType: z.string().optional() })
// → 200 { url: string, publicUrl: string }
```

## 7) Workflow patching (rules)

- **Canonical loader**: use a path-based loader node (e.g., `LoadImageFromPath`).
- **Patch set**: client specifies which node and input to set; server validates node existence before submission.
- **Multi-inputs**: allow `patches[]` for N inputs (e.g., reference image + mask + control image).
- **Safety**: reject values that are not under `/runpod-volume/` or contain traversal (`..`).

## 8) Frontend flows

### A) Run a workflow

1. User uploads media → `POST /api/volume/upload` → returns `workerPath`.
2. User uploads `workflow.json` (drag-drop) → parsed & previewed.
3. User selects loader node + input field (or auto-detects based on known node types).
4. Click **Run** → calls `POST /api/workflows/patch-run` with patches.
5. If async: poll `/api/runpod/status/:id` every 2s until complete (or wait for webhook push later).
6. Display outputs: images `<img>` or `<video controls>` for MP4/WebM, using B2 URLs or presigned GETs.

### B) View history

- `/jobs` lists past jobs with status and timestamps.
- `/jobs/:id` shows artifacts and raw JSON.

## 9) Error handling & validation

- **Uploads**: enforce file size limits (configurable), allowed MIME types, sanitize filenames.
- **Runpod**: translate worker errors into typed responses; include actionable hints (e.g., node not found, path missing).
- **Network**: retry transient S3/Runpod failures (exponential backoff with jitter, max 3 attempts).
- **UI**: clear toast banners; per-step state indicators (Submitting, Queued, Running, Completed, Failed).

## 10) Observability & logging

- Correlate logs by `jobId` (generate if sync path has none).
- Store raw request/response (trim large fields) in DB for debugging.
- Console JSON logs server-side; surface minimal client logs in dev only.

## 11) Security

- Secrets server-side only; never exposed to client.
- Strict filename policy; deny `..`, path separators, and control chars; normalize to `[a-zA-Z0-9._-]`.
- Verify `/runpod-volume/` prefix on patched paths.
- Content sniffing for uploads (optional) to verify magic bytes match MIME.

## 12) Local dev & scripts

- `npm run dev` – run Next.js.
- `npm run db:push` – generate/apply Drizzle migration.
- `.env.local` with the variables listed above.
- Seed script (optional) to insert example jobs.

## 13) Testing strategy

- **Unit**: `patchWorkflow.ts` (node lookup, path validation), `runpod.ts` (mode selection), filename sanitizer.
- **Integration**: mock Runpod `/run` & `/status` using MSW; test upload route with file streams.
- **E2E (Playwright)**: upload → run → see outputs (use a stubbed worker response in CI).

## 14) Performance & limits

- No base64 in requests; avoid `/run` body bloat.
- Stream uploads to Runpod S3; do not buffer large files in memory on server.
- Debounce polling to 2s; stop after timeout (configurable) if webhook not enabled.

## 15) Risk register & mitigations

- **Missing loader node** → add startup health check that probes for node availability; fail with guidance.
- **DC mismatch (endpoint vs volume)** → preflight check at boot (call both APIs; compare DC ids).
- **Large video outputs** → always store in B2; never return as base64; pagination for multiple artifacts.
- **Filename collisions** → namespace under `inputs/<jobId>/`; jobId = UUID.

## 16) Two-sprint plan (2 weeks each)

### Sprint 1 – Foundations & First Run

**Goals**: Upload to volume, patch workflow, submit job, see result.

- [ ] Env + clients: `runpodVolume.ts`, `runpod.ts`, `b2.ts`
- [ ] `POST /api/volume/upload` (multipart streaming, sanitizer, size/MIME limits)
- [ ] `patchWorkflow.ts` with validation + unit tests
- [ ] `POST /api/workflows/patch-run` (auto choose sync/async)
- [ ] `GET /api/runpod/status/:id`
- [ ] Minimal UI: Upload workflow, upload media, select node/input, Run, basic result render
- [ ] Happy-path manual test with one workflow (e.g., image2image)
      **Acceptance**:
- User uploads PNG, gets `workerPath`
- Workflow patched and submitted; job completes
- Output visible via B2 URL in UI

### Sprint 2 – Persistence, Outputs, Polish

**Goals**: Job history, robust errors, outputs UX, optional webhook.

- [ ] SQLite + Drizzle models; persist jobs/artifacts/raw JSON
- [ ] `/jobs` & `/jobs/:id` pages; job list/detail UI
- [ ] Optional `POST /api/b2/presign` + private bucket support
- [ ] Error handling + retry policy; structured logs with `jobId`
- [ ] Basic Playwright e2e with mocked worker
- [ ] Optional: `POST /api/runpod/webhook` and server push path (feature-flagged)
      **Acceptance**:
- Completed jobs logged with outputs and timestamps
- Private B2 bucket viewable via presigned GET
- E2E passes with mocked worker

## 17) Definition of Done (per feature)

- TS strict + ESLint/Prettier pass; no `any`
- Zod-validated API inputs/outputs
- Unit tests for pure logic
- Manual verification on a real Runpod endpoint
- Security checklist (secrets, sanitization) ticked

## 18) Future extensions (post-M2)

- Webhook-by-default; replace polling
- Multi-input mapping UI (mask, control images)
- Model/LoRA selector (per-run overrides)
- Batch jobs and queued runs
- User auth (GitHub/Passkeys) and per-user job history
- CI/CD pipeline, deployments, and SLOs
