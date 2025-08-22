# Copilot Instructions — Media Lab (concise)

Purpose: a short, practical guide to help AI coding agents make safe, minimal, and correct changes in this monorepo.

### Quick summary

- Monorepo using npm workspaces: `apps/*` (frontend) and `services/*` (backend/workers).
- Frontend is in `apps/web` (Next.js 15, React 19, app router in `apps/web/src/app`).
- API orchestration lives in `services/api` (FastAPI). Model workers are separate services (HTTP or WebSocket).

### Top-level developer workflows

- Local frontend dev (from repo root): `npm run dev` (proxies to `apps/web`).
- Build frontend: `npm run build`.
- Start web production server: `npm run start`.
- Quick API run: `cd services/api && pip install -r requirements.txt && uvicorn main:app --reload`.
- Docker (CPU): `docker-compose up --build`; GPU variant: `docker-compose -f docker-compose.gpu.yml up`.

### Important repo conventions

- Root `package.json` is the workspace manifest; root scripts proxy into `apps/web`.
- The `prepare` script is intentionally guarded (checks for `husky`) — don't assume git hooks are present in analysis runs.
- Keep model weights and large artifacts out of Git; use `storage/artifacts` or Git LFS. CI and workflows must be updated if adding weight downloads.

### Where to look first (high-value files)

- `package.json` (root) — workspace layout and scripts.
- `apps/web/` — Next.js app, `eslint.config.mjs`, `postcss.config.mjs`, `src/app` (routes + components).
- `services/api/` — orchestration endpoints and job shapes (see README in that folder).
- `.github/workflows/copilot-setup-steps.yml` — how the agent/dev environment is prepared for CI and the Copilot agent.
- `.husky/_/` — wrapper scripts related to Git LFS and hooks.

### Common, high-value tasks (concrete)

- Add a FastAPI `/jobs` endpoint implementing create/list/status/cancel (use the existing job JSON shape: { prompt, params, seed, steps }).
- Add or update a model worker service: follow existing worker patterns (HTTP or WS, small REST endpoints for job control, and artifact uploads to `storage/artifacts`).
- Draft ComfyUI / workflow JSONs for T2I or I2V using the repo's parameter conventions.
- Add a GPU Dockerfile / compose service: copy patterns from existing `infra/` files and update `docker-compose*.yml`.

### Safety, CI and dependency rules

- When you add dependencies (npm, pip, etc.) update the appropriate lockfile and note CI impact (longer installs). The repo uses Git LFS; ensure workflows handle LFS safely.
- The repo has a guarded Husky setup; do not modify Husky hooks or `core.hooksPath` without also updating `.github/workflows/copilot-setup-steps.yml`.
- If you modify dependencies or run `npm install` / `pip install`, run repository security scans (this project integrates Codacy/Trivy in CI). After edits that add packages, run the same scans locally or in CI and fix high/critical findings before continuing.

### Style and testing expectations

- Prefer minimal, well-scoped changes and include tests when you change behaviour (unit + small integration). Frontend uses Next.js testing patterns; API is FastAPI — add small pytest cases for new endpoints.
- Keep PRs small and document any infra/CI changes clearly in the PR description.

### Final notes

- Prefer read-only suggestions unless the user explicitly asks for edits or a PR. When making edits, keep them minimal, run lint/typecheck (`npm run lint`, `npm run typecheck`), and confirm the frontend builds.
- If you need Codacy/MCP server analysis and the CLI/tool isn't available in the environment, ask the repo owner or run the project CI; refer to `.github/instructions/codacy.instructions.md` for required follow-ups.
