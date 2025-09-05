# Agent guidance for Media Labs

## Purpose

This document instructs automated coding agents (or humans acting as agents) how to work effectively on the Media Labs repository. It focuses on priorities, conventions, safe edit patterns, debugging tips, and quick references so an agent can make correct, low-risk changes.

## Quick plan for every task

- Read the user's request fully and map it to a checklist of concrete requirements.
- Scan `src/` for the few files that matter (APIs in `src/app/api`, domain logic in `src/lib`, UI under `src/app/w`).
- Prefer small, local changes (minimal diffs) and preserve existing public APIs and file formats.
- Run the project's dev/build/lint scripts where relevant and fix errors introduced by edits.

## Checklist to show progress

- [ ] Requirements extracted and validated with the user (or reasonable assumptions noted).
- [ ] Files to change identified and opened for context.
- [ ] Edits implemented with minimal, targeted diffs.
- [ ] Build and lint run; failing tests/errors addressed or reported.
- [ ] Final summary: changed files, verification (build/lint/tests), and follow-ups.

## Repository facts (quick reference)

- Next.js app-router (Next 15) with `src/app/` layout.
- Server API routes under `src/app/api/` (many use `export const runtime = 'nodejs'`).
- Zod-first: runtime validation with Zod schemas in `src/lib`.
- S3 integration: `src/lib/runpodVolume.ts` (Runpod), `src/lib/b2.ts` (Backblaze B2).
- Model files must be stored under `models/<type>/...` at the root of your S3 bucket (e.g., `s3://$RUNPOD_VOLUME_ID/models/unet/...`).
- Template files stored in `data/workflows/*.json` and accessed via `src/lib/templates.fs.ts`.
- Key scripts in `package.json`: `dev`, `build`, `start`, `lint`.

## High-priority conventions (do not break these)

1. Strict TypeScript: never use `any`. If a shape is required, add a typed interface or `z.infer<>` companion in `src/lib`.
2. Zod validation for public-facing APIs: use `Schema.safeParse()` and return `NextResponse.json({ error: ... }, { status: 400 })` on failure.
3. Params handling: server route handlers receive `params` as a Promise. Always `await` or type accordingly: `({ params }: { params: Promise<{ slug: string }> })` and `const { slug } = await params`.
4. S3 existence checks: prefer `HeadObjectCommand` for single-key checks and defensively inspect SDK error internals (`$response`, `$metadata`) for 404 detection. Only fallback to `ListObjectsV2` when a provider lacks HEAD support.
5. All model files must be stored under `models/<type>/...` at the root of your S3 bucket. Update any legacy references from `ComfyUI/models/`.

## How to make changes (safe workflow)

1. Open the relevant files with a read. Prefer reading whole files rather than snippets.
2. Create the smallest patch needed. Use the repo's `apply_patch` (or your standard edit mechanism) and keep changes localized.
3. Run `npm run lint`. Fix lint/type errors you introduced. If a fix touches many files, explain why and get approval.
4. Run `npm run dev` or `npm run build` to validate runtime issues. Prefer quick smoke checks rather than long tests.

## Testing and validation

- There are no automated unit tests in the repo by default. Validate changes by:
  - Running `npm run lint` and `npm run build`.
  - Hitting relevant local endpoints in `dev` (e.g., POST `/api/workflows/preflight`) or running small scripts.

## Error-handling patterns to copy

- Zod parsing:

  ```ts
  const parsed = Schema.safeParse(payload)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  ```

- S3 HEAD handling (pattern to reuse):
  - Call `HeadObjectCommand` and `await` it.
  - If SDK throws, inspect `err.$response.statusCode` or `err.$metadata.httpStatusCode` for 404.
  - If HTTP is 2xx but SDK parse failed (malformed headers), treat the object as present and proceed.

## Troubleshooting checklist (HEAD vs LIST) — copy into commits

1. Verify computed key from `modelPaths()` (e.g. `models/.../file.safetensors`).
2. Try HEAD via AWS CLI (locally, with env vars):

   ```bash
   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
     aws s3api head-object --bucket "$RUNPOD_BUCKET" --key "${S3_KEY}" \
     --endpoint-url "$RUNPOD_S3_ENDPOINT" --region "$RUNPOD_S3_REGION"
   ```

3. If HEAD fails due to provider parsing but HTTP status is 2xx, treat as present.
4. If provider does not support HEAD, use `list-objects-v2` on the directory prefix and look for exact `Key === fullKey`.

## Coding style & PR guidance

- Keep PRs small and self-contained. Prefer separate PRs for behavior changes vs refactors.
- Use explicit commit messages describing the why, not only the what. Include quick verification steps.

## Files to read for deeper context

- `src/app/w/[slug]/page.tsx` — client submit lifecycle and params usage.
- `src/lib/workflow.preflight.ts` — model inference and `modelPaths()` implementation.
- `src/app/api/workflows/preflight/route.ts` — current HEAD-based preflight implementation and defensive parsing examples.
- `src/lib/runpodVolume.ts` — S3 client wiring and required environment variables.

## If blocked

- If an external dependency (S3 provider) behaves unexpectedly, add safe debug logging (redact creds) and propose a small fallback (LIST fallback behind a feature flag).
- If type information is missing for an external SDK shape, add a small internal type (in `src/lib`) and reuse it; prefer `unknown` + safe narrowing if uncertain.

## Migration Note

**As of September 2025, all model files must be stored under `models/<type>/...` at the root of your S3 bucket.**
If you previously used `ComfyUI/models/`, move your files to `models/` and update all references and worker configuration accordingly.

## Final note

Follow the above rules strictly — this repository expects careful, typed changes and defensive handling around S3 interactions. When in doubt, prefer conservative behavior (log and return safe defaults) and ask for clarification.
