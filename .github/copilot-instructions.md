# GitHub Copilot Instructions

# GitHub Copilot Instructions — Media Labs

What this file is: concise, actionable guidance for AI coding agents working on Media Labs. It prioritizes repo-specific facts, conventions, and debugging tips.

## Big picture (architecture)

- Next.js app-router (Next 15) with client and server components under `src/app/`.
- Server API routes under `src/app/api/*` implement workflows, preflight checks, and file uploads. Many routes declare `export const runtime = 'nodejs'`.
- Model files live on an S3-compatible Runpod volume (configured in `src/lib/runpodVolume.ts`). The UI uploads inputs to the volume and workers read `/runpod-volume/<s3Key>` paths.
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
- Model mapping: `RUNPOD_MODELS_PREFIX` (default `models`) and per-type directories: `RUNPOD_MODEL_DIR_UNET`, `RUNPOD_MODEL_DIR_CLIP`, `RUNPOD_MODEL_DIR_CLIP_VISION`, `RUNPOD_MODEL_DIR_VAE`, `RUNPOD_MODEL_DIR_LORA`, `RUNPOD_MODEL_DIR_CHECKPOINTS`.
- Backblaze B2 output storage: `B2_S3_ENDPOINT`, `B2_S3_REGION`, `B2_S3_BUCKET`, `B2_S3_ACCESS_KEY_ID`, `B2_S3_SECRET_ACCESS_KEY`.

## Developer commands

- Dev server: `npm run dev` (Next dev with turbopack)
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: `npm run lint`

## Debugging tips & common gotchas (practical)

- Preflight HEAD failures: the SDK can throw when response headers (dates) are malformed. Check `err.$response.statusCode` or `err.$metadata.httpStatusCode` before relying on parsed error name. The current `preflight/route.ts` contains robust examples.
- If HEAD returns a 2xx at HTTP level but SDK parse fails, treat the object as present (this repo currently does that). If providers return non-standard headers, add a short retry or a ListObjectsV2 fallback.
- When updating templates, keep `TemplateMetaSchema` stable to avoid front-end breakages (`src/lib/templates.schema.ts`).

## Code examples (copy/paste safe)

- Runpod S3 client (see `src/lib/runpodVolume.ts`):

```ts
new S3Client({
  endpoint: process.env.RUNPOD_S3_ENDPOINT,
  region: process.env.RUNPOD_S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.RUNPOD_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RUNPOD_S3_SECRET_ACCESS_KEY!
  }
})
```

- Build model key and worker path (from `src/lib/workflow.preflight.ts`):

```ts
const base = modelPrefix.replace(/\/+$/, '')
const key = `${base}/${dir}/${req.name}`
const workerPath = `/runpod-volume/${key}`
```

## Troubleshooting checklist — HEAD vs LIST fallback

1. Verify the computed S3 key (server-side):

- Confirm `modelPaths()` produced the expected `s3Key` and `workerPath` for the model. Example: `models/diffusion_models/wan2.1_flf2v_720p_14B_fp16.safetensors` → `/runpod-volume/models/...`.

2. First try a HEAD check (preferred):

- Use the AWS CLI to perform a head-object (this uses your credentials and the configured endpoint):

```bash
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
  aws s3api head-object --bucket "$RUNPOD_BUCKET" --key "${S3_KEY}" \
  --endpoint-url "$RUNPOD_S3_ENDPOINT" --region "$RUNPOD_S3_REGION"
```

- Expect status 200 for present objects; 404 (NoSuchKey) if missing. If the SDK throws parse/deserialization errors but the HTTP status is 2xx, treat the object as present (the repo's preflight code does this).

3. If HEAD is not supported by the provider, fall back to LIST on the containing directory and match `Key === fullKey`:

```bash
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
  aws s3api list-objects-v2 --bucket "$RUNPOD_BUCKET" --prefix "$(dirname "${S3_KEY}")/" \
  --endpoint-url "$RUNPOD_S3_ENDPOINT" --region "$RUNPOD_S3_REGION"
```

- Scan the returned `Contents[].Key` for an exact match to your `S3_KEY`.

4. Quick curl checks (only works for public buckets or pre-signed URLs):

```bash
# Public or presigned URL
curl -I -sS "https://$RUNPOD_S3_ENDPOINT/$RUNPOD_BUCKET/${S3_KEY}"
```

- If you get `HTTP/1.1 200 OK` the object is present. If you receive a 4xx/5xx or a parsing error, use the AWS CLI or SDK to inspect the raw response (`err.$response`) as the SDK may fail to deserialize malformed headers.

5. When diagnosing SDK errors:

- Inspect `err.$response.statusCode` and `err.$metadata.httpStatusCode` before using `err.name`/`err.Code` — the codebase contains defensive parsing logic in `src/app/api/workflows/preflight/route.ts`.
- Log the `s3Key`, `bucket`, and the raw `$response` only in private debug runs — avoid leaking credentials in shared logs.

## Where to look next

- `src/app/api/workflows/preflight/route.ts` — for S3/HEAD error handling examples.
- `src/lib/workflow.preflight.ts` — to understand model inference and directory mapping.
- `src/app/w/[slug]/page.tsx` — client form lifecycle (load meta, preflight, upload, run, poll).
