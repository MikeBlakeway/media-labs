from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import os
import logging
from .comfyui import ComfyClient

COMFYUI_URL = os.getenv("COMFYUI_URL", "http://localhost:8188")
client = ComfyClient(base_url=COMFYUI_URL)

app = FastAPI(title="Media Lab Backend - ComfyUI proxy")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/generate")
async def generate(request: Request):
    """Proxy an incoming generate request to a running ComfyUI instance.

    Behavior:
    - Accept a JSON body (or raw bytes) and forward it to ComfyUI's pipeline endpoint.
    - Return JSON responses as JSON and binary/image responses as streaming bytes.

    Assumption: ComfyUI exposes POST /api/pipeline (adjust COMFYUI_URL as needed).
    """
    try:
        payload = await request.json()
    except Exception:
        # fallback to raw bytes
        payload = await request.body()

    try:
        # Try the prompt endpoint first (accepts {"prompt":...} or plain prompt strings).
        try:
            resp = await client.run_prompt(payload)
            # If prompt endpoint returns 405/404, fall back to pipeline endpoint
            if resp.status_code in (404, 405):
                resp = await client.run_pipeline(payload)
        except Exception:
            # If run_prompt raises (e.g., connection error), fall back to pipeline
            resp = await client.run_pipeline(payload)
    except Exception as e:
        logging.exception("ComfyUI request failed")
        raise HTTPException(status_code=502, detail=str(e))

    content_type = resp.headers.get("content-type", "application/octet-stream")
    if content_type.startswith("application/json"):
        try:
            data = resp.json()
        except Exception:
            # If json parsing fails, return text
            return JSONResponse(content={"detail": resp.text}, status_code=resp.status_code)
        return JSONResponse(content=data, status_code=resp.status_code)

    # stream other content types (images, binaries)
    return StreamingResponse(resp.aiter_bytes(), media_type=content_type, status_code=resp.status_code)
