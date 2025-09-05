# GitHub Copilot Instructions

# GitHub Copilot Instructions — Media Labs

What this file is: concise, actionable guidance for AI coding agents working on Media Labs. It prioritizes repo-specific facts, conventions, and debugging tips.

## Big picture (architecture)

- Next.js app-router (Next 15) with client and server components under `src/app/`.
- Server API routes under `src/app/api/*` implement workflows, preflight checks, and file uploads. Many routes declare `export const runtime = 'nodejs'`.
- Model files live on an S3-compatible Runpod volume (configured in `src/lib/runpodVolume.ts`). The UI uploads inputs to the volume and workers read `/runpod-volume/models/<type>/<filename>` paths. All model files must be stored under `models/<type>/...` at the root of your S3 bucket (e.g., `s3://$RUNPOD_VOLUME_ID/models/unet/...`).
- Templates (registered workflows) are stored on disk under `data/workflows/*.json` and served via `src/lib/templates.fs.ts`.

## Key files to read first

- `src/app/w/[slug]/page.tsx` — dynamic workflow form, client-side submit & polling.
- `src/app/api/workflows/preflight/route.ts` — model presence checks (HEAD-based with defensive parsing).
- `src/lib/workflow.preflight.ts` — infers required models and builds `s3Key` + `workerPath` (`modelPaths`).
- `src/lib/runpodVolume.ts` — S3 client config and required env vars.
- `src/lib/templates.fs.ts` — templates storage and schema interactions.

## Project conventions & strict rules

- Strict TypeScript: do not use `any`. When a new shape is needed, add a typed interface or use `z.infer<>` alongside a Zod schema in `src/lib`.
- Zod-first validation for all API inputs/outputs. Pattern used across repo: `const parsed = Schema.safeParse(val); if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 })`.
- S3 existence checks: current codebase prefers `HeadObjectCommand` with careful inspection of `err.$response`/`err.$metadata` for 404s and certain provider-specific parsing failures. Use HEAD where possible; add a ListObjectsV2 fallback only if a provider lacks HEAD support.
- Params handling:
  - Server route handlers receive `params` as a Promise: e.g. `export async function GET(req, ctx: { params: Promise<{ slug: string }> }) { const { slug } = await ctx.params }` (this repo follows that pattern).
  - Client components in this repo unwrap route params with React's `use` hook: `import { use } from 'react'; const { slug } = use(params)` in `use client` components. The `next/navigation` `useParams()` hook is an alternative but this codebase uses `use(params)` in places.

## Env vars (server-only)

- Runpod S3: `RUNPOD_VOLUME_ID` (used as RUNPOD_BUCKET), `RUNPOD_S3_REGION`, `RUNPOD_S3_ENDPOINT`, `RUNPOD_S3_ACCESS_KEY_ID`, `RUNPOD_S3_SECRET_ACCESS_KEY`.
- Model mapping: All models must be stored under `models/<type>/...` at the root of your S3 bucket. Per-type directories: `RUNPOD_MODEL_DIR_UNET`, `RUNPOD_MODEL_DIR_CLIP`, `RUNPOD_MODEL_DIR_CLIP_VISION`, `RUNPOD_MODEL_DIR_VAE`, `RUNPOD_MODEL_DIR_LORA`, `RUNPOD_MODEL_DIR_CHECKPOINTS`.
- Backblaze B2 output storage: `B2_S3_ENDPOINT`, `B2_S3_REGION`, `B2_S3_BUCKET`, `B2_S3_ACCESS_KEY_ID`, `B2_S3_SECRET_ACCESS_KEY`.

## Developer commands

- Dev server: `npm run dev` (Next dev with turbopack)
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: `npm run lint`

## Troubleshooting checklist — HEAD vs LIST fallback

1. Verify the computed S3 key (server-side):

- Confirm `modelPaths()` produced the expected `s3Key` and `workerPath` for the model. Example: `models/diffusion_models/wan2.1_flf2v_720p_14B_fp16.safetensors` → `/runpod-volume/models/diffusion_models/wan2.1_flf2v_720p_14B_fp16.safetensors`.

## Migration Note

**As of September 2025, all model files must be stored under `models/<type>/...` at the root of your S3 bucket.**
If you previously used `ComfyUI/models/`, move your files to `models/` and update all references and worker configuration accordingly.
