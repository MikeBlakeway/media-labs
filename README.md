# AI Media Lab

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/47786309989740cf98e6d9dc4bb1c739)](https://app.codacy.com?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

Minimal scaffold for the AI Media Lab project. This repository contains a
Next.js frontend, a FastAPI backend, and microservices for ComfyUI-based
model orchestration. Deployment target (Option A): Vercel (frontend), RunPod
GPUs (ComfyUI), Cloudflare R2 (storage), and Supabase (metadata).

Status: scaffolded — docs and runbooks have been added. There are no
production-ready services yet.

## Where to look

- `AGENTS.md` — agent rules & responsibilities (new)
- `docs/` — architecture, model licenses, deployment notes
- `frontend/` — Next.js frontend scaffold (package.json present)
- `backend/` — FastAPI backend scaffold (requirements.txt present)
- `services/` — per-service readmes (ComfyUI, audio, face-swap)

## Quick start (local dev)

### Backend (Python)

```bash
# create a venv, install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
# start backend (implementations to be added in backend/)
echo "Start your FastAPI app from backend/ as: uvicorn backend.app:app --reload"
```

### Frontend (Node)

```bash
cd frontend
npm install
# start dev server (Next.js scaffold to be implemented)
npm run dev
```

## Notes & next steps

- Implement a minimal `backend/app.py` FastAPI entrypoint and a small
  Next.js UI for uploads and job status.

- See `docs/deployment.md` for an MVP deployment runbook (RunPod + Vercel +
  R2 + Supabase).

- Add CI (lint + tests) and Codacy configuration to automate checks.

- Add a small `frontend/` Next.js app and wire it to the backend.

- Implement the minimal `services/` runner and a ComfyUI test pipeline.

## Root run scripts (dev & start)

You can start the frontend and backend together from the repository root using Docker Compose.

From the repo root:

```bash
# Build and start all services (frontend, backend, comfyui) in background
docker compose up --build -d

# Tail logs
docker compose logs -f

# Stop
docker compose down
```

Alternatively, if you prefer using the local node/python toolchain, the root `package.json` exposes convenience scripts:

```bash
# Install both back-end and front-end deps
npm run install:all

# Start both in dev mode using docker-compose (recommended)
npm run dev

# Start production-mode servers
npm run start
```

## Contributing

Keep changes small and non-destructive. After editing code or adding
dependencies, run Codacy analysis as described in `AGENTS.md` and
`.github/copilot-instructions.md`.

Note: This repository now enforces a Docker Compose-first workflow for running the full stack locally. Individual `frontend:dev`, `backend:dev`, and `backend:start` scripts were removed from the root `package.json` to avoid drift — use the `dev` and `start` commands which call `docker compose`.

## License

- This repo is for research/demo. Check individual model license notes in `docs/models-licenses.md`.
