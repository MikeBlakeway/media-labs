# Media Lab — API Service

The **API service** provides orchestration and job management for the Media Lab platform. It exposes endpoints for creating, tracking, and retrieving results of media generation jobs (text-to-image, image-to-video, audio separation, etc.).

---

## Overview

- Built with **FastAPI** (Python 3.12+)
- Exposes REST endpoints for job management
- Communicates with worker services (ComfyUI, Demucs, RIFE, FaceSwap, etc.)
- Returns progress updates and signed URLs for artifacts
- Runs inside Docker, can be deployed locally or on GPU hosts (RunPod, Vast.ai)

---

## Directory Structure

```bash
services/api/
  ├── app/
  │   ├── main.py          # FastAPI entrypoint
  │   ├── models.py        # Job / artifact schemas
  │   ├── routes.py        # API route handlers
  │   ├── services/        # Client logic for comfy, audio, faceswap, etc.
  │   └── utils/           # Helpers (signing, progress, etc.)
  ├── tests/               # Unit and integration tests
  ├── requirements.txt     # Python dependencies
  └── Dockerfile           # API container image
```

---

## Running Locally

### Prerequisites

- Python 3.12+
- [Poetry](https://python-poetry.org/) or `pip`
- Docker (recommended for service integration)

### Install & Run

```bash
cd services/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

The API will be available at: [http://localhost:8000](http://localhost:8000)

Interactive docs:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Endpoints

| Method | Endpoint         | Description                             |
| ------ | ---------------- | --------------------------------------- |
| GET    | `/health`        | Health check endpoint                   |
| POST   | `/jobs`          | Create a new media job (T2I, I2V, etc.) |
| GET    | `/jobs`          | List all jobs                           |
| GET    | `/jobs/{job_id}` | Get status and artifact link for a job  |
| DELETE | `/jobs/{job_id}` | Cancel a job                            |

---

## Environment Variables

| Variable             | Description                                 |
| -------------------- | ------------------------------------------- |
| `URL_SIGNING_SECRET` | Secret key for artifact URL signing         |
| `ARTIFACTS_PATH`     | Local path to save outputs (default: ./out) |
| `REDIS_URL`          | (future) Redis connection string            |
| `DB_URL`             | (future) Postgres connection string         |

---

## Testing

Run unit tests:

```bash
pytest -v
```

---

## Deployment

- Local dev: `docker-compose up api`
- GPU host (RunPod, Vast.ai): use `docker-compose.gpu.yml`
- Vercel not supported (backend must run on GPU/compute host)

---

## Roadmap

- [ ] Add Redis-backed job queue with retries
- [ ] Persist job history in Postgres
- [ ] WebSocket/SSE for live progress updates
- [ ] Observability: structured logs, metrics, traces
- [ ] Auth + rate limiting for demo deployments
