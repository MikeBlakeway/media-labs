# Backend (FastAPI)

This folder contains a minimal FastAPI app that proxies requests to a running ComfyUI instance.

## Environment

- COMFYUI_URL: URL for the ComfyUI server (default: <http://localhost:8188>)

Run locally:

```bash
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Notes:

- The /generate endpoint forwards POST payloads to ComfyUI's /api/pipeline endpoint. Adjust the endpoint in `backend/app/comfyui.py` if your ComfyUI exposes a different API.
