# Media Labs

A Next.js application for running [ComfyUI](https://github.com/comfyanonymous/ComfyUI) workflows on [RunPod](https://www.runpod.io/) serverless GPU infrastructure. Upload a workflow, fill in the parameters, and run it — without touching a terminal or managing a GPU server.

The core design principle is that any ComfyUI workflow JSON exported in API format should work without manual configuration: the app parses the workflow graph, infers what fields to show the user, validates model availability before submission, and handles the full async execution lifecycle including progress tracking, retries, and result display.

---

## How it works

### Workflow registration

Workflows are stored as ComfyUI Export API format JSON — the node graph format produced by ComfyUI's *Save (API Format)* option. Register a workflow via the `/register` page by pasting the JSON and giving it a name. The app assigns it a URL slug (`/w/[slug]`) and stores it as a template.

### Automatic field inference

When a workflow is loaded, `inferFieldsFromExportApi` scans every node in the graph and generates form fields automatically by recognising node types:

| ComfyUI node | Generated field(s) |
|---|---|
| `CLIPTextEncode` | Text area (prompt) |
| `LoadImage` / `LoadImageFromPath` | File upload |
| `CheckpointLoaderSimple` | String (checkpoint name) |
| `LoraLoader` | String (LoRA name) + two numbers (model strength, CLIP strength) |
| `KSampler` | Integer (seed), integer (steps), number (CFG), string (sampler), string (scheduler), number (denoise) |
| `EmptyLatentImage` | Integer (width), integer (height), integer (batch size) |
| `SaveImage` / `SaveVideo` | String (filename prefix) |

No manual field spec is required. Field IDs are derived from node IDs so that form values can be patched back into the correct workflow node inputs at submission time.

### Preflight — model availability check

Before a job is submitted, the app scans the workflow for model loader nodes (`UNETLoader`, `CLIPLoader`, `CLIPVisionLoader`, `VAELoader`, `LoraLoader`, `CheckpointLoaderSimple`) and checks whether each required model file is present on the RunPod Network Volume via S3 stat calls. Missing models are surfaced before the job starts, preventing silent inference failures.

```
Workflow JSON → inferModelRequirements() → [{type: 'unet', name: 'flux1-dev.safetensors', ...}]
                                         → modelPaths() → S3 keys for each model
                                         → S3 HEAD requests → present / missing
```

### Workflow patching and submission

User form values are applied to the workflow via `patchWorkflow` — an immutable deep clone that updates only the relevant `inputs` key on the target node. The patched workflow is then submitted to the RunPod ComfyUI endpoint as `{ input: { workflow, images? } }`.

Both sync and async RunPod endpoints are supported. Async jobs are polled via `useEnhancedPolling` with exponential backoff.

### Progress tracking

Five stages model the job lifecycle with estimated durations:

```
Waiting for worker (10s) → Loading models (15s) → Generating content (60s) → Processing results (5s) → Complete
```

Real elapsed time drives actual stage advancement; the estimated durations set initial expectations. Progress state is managed independently of polling to avoid UI jank on status checks.

### Output handling

Worker responses follow the `worker-comfyui` v5.0+ format — outputs are either `base64`-encoded data or `s3_url` references. Both are handled transparently. Images are displayed at full resolution with download functionality; video outputs are rendered inline. Results are stored in-session with thumbnail history.

---

## Architecture

### RunPod client

`src/lib/runpod.ts` provides three operations — `runSync`, `runAsync`, and `getStatus` — each wrapped in `withRetryAndTimeout`:

**Retry logic** (`runpod.retry.ts`): exponential backoff with ±25% jitter to prevent thundering herd effects. Retryable error detection covers network errors, 5xx/429 responses, and RunPod-specific messages ("worker not available", "endpoint overloaded"). Retry behaviour is tuned per operation type:

| Operation | Max attempts | Notes |
|---|---|---|
| `sync` | 2 | Fewer retries — caller is waiting synchronously |
| `async` | 3 | Default config |
| `status` | 5 | More attempts, shorter backoff (500ms base) |
| `cancel` | 1 | Never retry a cancellation |

**Local worker mode**: set `USE_LOCAL_WORKER=true` to point all requests at a local ComfyUI worker (`http://localhost:8000`) instead of RunPod. Auth headers are omitted automatically. Useful for development without incurring GPU costs.

### Hooks architecture

All business logic lives in 21 custom hooks. Components are purely presentational. The refactoring reduced `WorkflowRunner.tsx` from 892 lines to 219 (75.5%) and established a consistent pattern across the codebase:

**Workflow & template hooks**

| Hook | Purpose |
|---|---|
| `useWorkflowTemplate` | Load workflow metadata and node graph |
| `useWorkflowsList` | List registered workflows |
| `useWorkflowRegistration` | Register new workflows with validation |
| `useWorkflowManagement` | General workflow CRUD |
| `useWorkflowEditor` | Edit workflow configurations |

**Execution hooks**

| Hook | Purpose |
|---|---|
| `useWorkflowRunner` | Main orchestrator — coordinates form, upload, job, and progress |
| `useWorkflowRunnerJob` | Job-specific execution tracking |
| `useJobManagement` | Submit, poll, cancel, reset job lifecycle |
| `useEnhancedPolling` | Polling with exponential backoff and cleanup |

**Form & upload hooks**

| Hook | Purpose |
|---|---|
| `useWorkflowForm` | Form state, field updates, validation, submission patches |
| `useFieldLabeling` | Dynamic field labels and descriptions |
| `useFileUpload` | File upload with per-field progress tracking |
| `useUploadCard` | Upload UI state |

**Preflight & validation hooks**

| Hook | Purpose |
|---|---|
| `useWorkflowPreflight` | Automatic model availability check on workflow load |
| `useManualPreflight` | On-demand preflight re-run |

**Result & progress hooks**

| Hook | Purpose |
|---|---|
| `useResultHistory` | Session result history management |
| `useResultsDisplay` | Result presentation state |
| `useOutputProcessor` | Transform and normalise worker outputs |
| `useProgressCalculation` | Derive progress percentage from job state + elapsed time |
| `useProgressTimer` | Timer-based progress advancement |
| `useVolumeOperations` | Volume manager operations (list, stat, seed) |

All hooks export typed interfaces. Central re-export from `src/hooks/index.ts`.

### Storage

Two storage layers are used, each serving a different purpose:

- **RunPod Network Volume** (S3-compatible): model weights and ComfyUI assets, shared between the ComfyUI endpoint and the Seeder Worker
- **Backblaze B2** (S3-compatible): job output files — images and video generated by workflows

### Volume management — Seeder Worker

Model weights are managed via a dedicated **Seeder Worker** — a second RunPod serverless endpoint that shares the same Network Volume as the ComfyUI endpoint. Rather than manually SSH-ing into a pod to download models, you send a JSON manifest to the Seeder Worker's API, and it handles downloads from HuggingFace to the shared volume.

The app's `/api/volume` route proxies Seeder Worker operations: `seed` (download from manifest), `verify` (check presence and sizes), `ls` (list directory), `stat` (disk usage), `logs` (operation history).

**Supported model stack** (~43–47 GB, designed for a 60 GB volume):

| Category | Models |
|---|---|
| Video (first+last frame → video, image → video) | Wan 2.1 FLF2V 14B FP8 |
| Video (text → video, lightweight) | Wan 2.1 T2V 1.3B FP16 |
| Image → video (stable motion) | Stable Video Diffusion XT 1.1 |
| Text → image / image → image | SDXL base (RealVisXL V4) |
| Inpaint / outpaint | SDXL Inpainting 0.1 (UNet FP16) |
| Guided generation | ControlNet SDXL Canny + Depth (small) |
| Single image → 3D mesh | TripoSR |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack) · React 19 · TypeScript |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 — all API responses and workflow schemas |
| GPU infrastructure | RunPod serverless (ComfyUI endpoint + Seeder Worker endpoint) |
| Model storage | RunPod Network Volume (S3-compatible) |
| Output storage | Backblaze B2 (S3-compatible, AWS SDK v3) |
| Testing | Jest · ts-jest |
| Releases | semantic-release with conventional commits |

---

## Getting started

### Prerequisites

- Node.js 20+
- A [RunPod](https://www.runpod.io/) account with:
  - A ComfyUI serverless endpoint
  - A Network Volume attached to that endpoint
  - (Optional) A Seeder Worker endpoint for model management
- A [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) bucket for output storage

### Install

```bash
git clone https://github.com/MikeBlakeway/media-labs.git
cd media-labs
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Fill in the required values:

```bash
# RunPod job submission
RUNPOD_API_KEY=
RUNPOD_ENDPOINT_ID=

# RunPod Network Volume (S3-compatible) — for model preflight checks
RUNPOD_S3_ENDPOINT=
RUNPOD_S3_REGION=
RUNPOD_VOLUME_ID=
RUNPOD_S3_ACCESS_KEY_ID=
RUNPOD_S3_SECRET_ACCESS_KEY=

# Backblaze B2 — for output storage
B2_S3_ENDPOINT=
B2_S3_REGION=
B2_S3_BUCKET=
B2_S3_ACCESS_KEY_ID=
B2_S3_SECRET_ACCESS_KEY=
```

For local development without RunPod:

```bash
USE_LOCAL_WORKER=true
LOCAL_WORKER_URL=http://localhost:8000
```

### Start the app

```bash
npm run dev       # starts with Turbopack
npm run build     # production build
npm run test      # run Jest unit tests
```

### Validate registered workflows

```bash
npm run validate-workflows
```

Checks all registered workflow JSON files against the `ExportApiWorkflow` schema.

---

## Registering a workflow

1. Open your workflow in ComfyUI
2. Click **Save (API Format)** to export the node graph as JSON
3. Go to `/register` in the app
4. Paste the JSON, give the workflow a name, and submit
5. The app infers fields automatically and creates a page at `/w/[slug]`
6. Run a preflight check to confirm required models are present on the volume
7. Fill in the form and run

---

## Development

### Local worker mode

Set `USE_LOCAL_WORKER=true` to point the RunPod client at a local server. This is useful for testing workflow patching and form logic without submitting real GPU jobs. A compatible local worker can be started with [worker-comfyui](https://github.com/ai-dock/comfyui) or any server that accepts the same request shape.

### Adding a new hook

Follow the pattern in `docs/hooks.md`:

```typescript
export interface UseFeatureResult {
  data: SomeType | null
  loading: boolean
  error: string
  action: () => Promise<void>
}

export function useFeature(): UseFeatureResult {
  // implementation
}
```

Export from `src/hooks/index.ts`. Use Zod for any API response shapes.

### Seeding models

Use the Seeder Worker API via the `/api/volume` route. See `docs/runpod_volume_structure.md` for the full model manifest and volume layout.
