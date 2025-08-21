# Copilot Instructions for Media Lab

# Copilot Instructions for Media Lab

Purpose: a single-page, actionable guide to help AI coding agents be productive in this repository.

Quick summary (big picture)

- Monorepo using npm workspaces: `apps/*` (frontend) and `services/*` (FastAPI + model workers).
- Typical flow: UI (`apps/web`) → `services/api` (FastAPI orchestration) → model worker (e.g. `comfy`, `rife`, `demucs`) → artifacts in `storage/artifacts`.

Project overview (from README)

- Experimental research-only media lab: T2I (SDXL), I2V (SVD), AnimateDiff, VideoCrafter, Demucs, RIFE, InsightFace.
- Intended for prototyping and demos; model licenses may be research/non-commercial — surface this in the UI.

Essential developer workflows (concrete)

- Local web dev: from repo root run:

```bash
npm run dev
```

- Build frontend from root:

```bash
npm run build
```

- Docker local (CPU):

```bash
docker-compose up --build
```

- Docker local (GPU):

```bash
docker-compose -f docker-compose.gpu.yml up
```

- Quick API run:

```bash
cd services/api
pip install -r requirements.txt
uvicorn main:app --reload
```

Repository specifics agents must know

- Root `package.json` is the workspace manifest. Root scripts proxy into `apps/web` (see `scripts`).
- `prepare` is intentionally guarded in `package.json` to avoid failing CI when `husky` isn't installed; do not assume git hooks are present during analysis.
- CI preinstall job (`.github/workflows/copilot-setup-steps.yml`) intentionally installs root devDependencies (`npm ci`) early and runs `git lfs install --skip-repo --skip-smudge`. Respect this order when suggesting CI changes.
- The repo contains `.husky/_/` wrapper hook scripts (git-lfs wrappers). Any changes that touch Husky or LFS should also update the workflow steps (see `git lfs update --force` pattern in workflow).

Integration patterns and examples

- Frontend: `apps/web/src/app` (Next.js 15 app router). Use standard Next.js routing and call the API at `/api/*` or the orchestration endpoints in `services/api`.
- API: `services/api` exposes job orchestration endpoints (look for `/jobs` routes). Jobs use a small JSON shape: { prompt, params, seed, steps } — follow this when adding endpoints or workers.
- Workers: model services are small HTTP or WebSocket servers. ComfyUI uses WebSocket for progress updates; the API bridges those updates to the frontend.

Conventions and constraints (what to avoid)

- Do not change `core.hooksPath` or remove `.husky/_/` hooks without updating `.github/workflows/copilot-setup-steps.yml` — CI depends on this pattern.
- Keep model weights and heavy artifacts out of git; use `storage/artifacts` or Git LFS. If code suggests downloading weights during CI, update the workflow to handle LFS and large downloads safely.
- Mark research/non-commercial models clearly in the UI (see `README.md` wording) and add a visible badge when rendering model options.

Where to look first (high-value files)

- `package.json` (root) — workspace layout, guarded `prepare` script
- `apps/web/` — Next.js app, `eslintrc`, `postcss.config.mjs`, `src/app` (pages and components)
- `services/api/README.md` and `services/api/` source — job shapes and endpoints
- `.github/workflows/copilot-setup-steps.yml` — how the agent environment is prepared for Copilot Coding Agent
- `.husky/_/` — LFS wrapper scripts and their executable bits

Common tasks Copilot may be asked to do (concrete examples)

- Add a FastAPI `/jobs` endpoint implementing create/list/status/cancel using an in-memory store (follow existing job JSON shape).
- Draft a ComfyUI workflow JSON for SDXL T2I and SVD I2V using the repo's parameter conventions.
- Add a Dockerfile for a GPU worker (based on `infra/docker/`) and update `infra/compose/` with a GPU-enabled service.
- Update CI: when adding root dev tools, add `npm ci` at the top of `copilot-setup-steps.yml`; when using LFS, ensure `git lfs install` and `git lfs update --force` are included.

Environment & Copilot setup notes

- The `copilot-setup-steps` workflow runs before the Copilot Coding Agent session. It installs Node, root devDeps, Python, `ffmpeg`, and `git-lfs` and intentionally skips smudge to avoid pulling LFS blobs during setup.
- If the Coding Agent needs extended repo access, a GitHub environment named `copilot` and a PAT secret (e.g., `COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN`) may be configured in repo settings.

Copilot agent permissions & actions (operational)

- Prefer read-only suggestions unless a PR/branch is requested. If making changes to hooks or CI, include tests or a manual `workflow_dispatch` test plan.
- When proposing changes that add dependencies, note the impact on CI (longer install, Trivy/semgrep review) and update `.github/workflows/copilot-setup-steps.yml` accordingly.

Final notes & feedback

- This file intentionally focuses on discoverable, actionable patterns in the repo. If you want the original longer prose restored or additional examples (endpoints, example job JSON), tell me which areas to expand and I'll add them.
