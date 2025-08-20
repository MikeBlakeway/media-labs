# Development Guide

This guide explains how to set up, run, debug, and contribute to the **Media Lab** project locally and in GitHub Codespaces.

---

## Initial Setup

You can develop locally with Docker or use **GitHub Codespaces** for a consistent environment.

### Option A: GitHub Codespaces (recommended for consistency)

1. Open the repository in a new Codespace

2. Wait for the container to build and pre-install dependencies (via `.github/workflows/copilot-setup-steps.yml` and devcontainer if present)

3. Install Python dependencies for the API:

   ```bash
   cd services/api
   python -m pip install -r requirements.txt
   ```

4. Install Node dependencies for the web app:

   ```bash
   cd apps/web
   npm ci || npm i
   ```

5. Copy environment examples and adjust as needed:

   ```bash
   cp .env.example .env || true
   cp apps/web/.env.example apps/web/.env || true
   ```

### Option B: Local machine with Docker

1. Ensure Docker is installed and running

2. From the repo root, create a local env file:

   ```bash
   cp .env.example .env
   ```

3. Start services (API and ComfyUI placeholder) using Docker Compose:

   ```bash
   docker-compose up --build
   ```

4. In a separate terminal, start the Next.js app:

   ```bash
   cd apps/web
   npm i
   npm run dev
   ```

---

## Dependencies

### Python (API)

- FastAPI: API framework
- Uvicorn: ASGI server
- httpx, pydantic, orjson, loguru, tenacity: HTTP client, typing/validation, fast JSON, logging, retry helpers

Install from `services/api/requirements.txt`:

```bash
cd services/api
python -m pip install -r requirements.txt
```

### Node (Web)

- Next.js 15
- React 18
- TypeScript 5

Install from `apps/web/package.json`:

```bash
cd apps/web
npm ci
```

---

## Running and Debugging

### Run API locally (without Docker)

```bash
cd services/api
uvicorn main:app --reload --port 8000
```

- API base URL: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `GET /health`

### Run Web locally

```bash
cd apps/web
npm run dev
```

- Web URL: `http://localhost:3000`
- Configure the API URL via `apps/web/.env`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Run with Docker Compose

```bash
# From repo root
docker-compose up --build
```

This starts the API and a ComfyUI container (models not included yet). Start the web app separately in another terminal.

### Debugging tips

- FastAPI auto-reload restarts the server on code changes
- Use `/docs` to interactively test endpoints
- Inspect API logs in the terminal container output
- Verify ComfyUI is listening on port 8188 (healthcheck in compose)

---

## Getting Started

1. Install dependencies

   ```bash
   cd services/api && python -m pip install -r requirements.txt
   cd ../../apps/web && npm ci
   ```

2. Run the API

   ```bash
   cd services/api
   uvicorn main:app --reload --port 8000
   ```

3. Run the web app

   ```bash
   cd apps/web
   npm run dev
   ```

4. Open your browser
   - API docs: `http://localhost:8000/docs`
   - Web UI: `http://localhost:3000`

> Important: Job data is stored **in memory** in the MVP. Data resets when the API restarts.

---

## Usage

### Current API Endpoints (MVP)

| Method | Endpoint            | Description                              |
| ------ | ------------------- | ---------------------------------------- |
| GET    | `/health`           | Health check                             |
| POST   | `/jobs`             | Create a job (t2i, i2v, etc.)            |
| GET    | `/jobs`             | List all jobs                            |
| GET    | `/jobs/{job_id}`    | Get job status and simulated progress    |
| DELETE | `/jobs/{job_id}`    | Cancel a job                             |
| GET    | `/artifacts/{file}` | Return a signed download URL (metadata)  |
| GET    | `/download/{file}`  | Download artifact (signed, time-limited) |

### Web UI

- Home page lets you create a T2I or I2V job and refresh status
- Job detail page polls for status updates

---

## Environment

- Root `.env` controls API settings used by Docker and local dev:

```dotenv
ENV=dev
API_BASE_URL=http://localhost:8000
ARTIFACTS_DIR=storage/artifacts
URL_SIGNING_SECRET=dev-secret-change-me
```

- Web `.env` sets the API base URL:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Testing and Quality

- API: add tests under `services/api/tests` (pytest recommended)
- Web: use `npm run lint` and `npm run typecheck`

### Suggested scripts

```bash
# API (pytest once added)
pytest -q

# Web
npm run lint
npm run typecheck
```

---

## CI and Automation

- Copilot pre-install workflow: `.github/workflows/copilot-setup-steps.yml`
- Add CI jobs later for:
  - API lint/tests (ruff, mypy, pytest)
  - Web lint/build (ESLint, Next.js build)

---

## Troubleshooting

- Port in use: stop existing processes on 8000 (API) or 3000 (web) or change ports
- Docker build fails: rebuild without cache `docker-compose build --no-cache`
- Artifacts missing: ensure `storage/artifacts` exists and is writeable
- ComfyUI not reachable: confirm container is healthy and port 8188 is exposed

---

## Next Steps

- Replace ComfyUI workflow stubs with real SDXL/SVD graphs
- Add API bridge to submit prompts to ComfyUI `/prompt` and stream progress
- Introduce a job queue (Redis) and persistence (PostgreSQL) as per the roadmap
