# Media Labs – ComfyUI Worker (RunPod Custom Serverless)

A **custom RunPod Serverless worker** that starts **ComfyUI** inside the container, accepts a job (Export-API `workflow` + `patches`), submits it to Comfy’s `/prompt`, and returns the result. It is designed for **local/serverless parity**—the same image is used locally and in the cloud.

> This worker follows RunPod’s “custom worker” model: implement a **handler function**; package it in Docker; deploy to a **Serverless Endpoint**; interact via **/run, /runsync, /status**.
> Docs: handler functions, getting started, and endpoint operations. :contentReference[oaicite:0]{index=0}

---

## Contents

```pgsql
worker/
├─ Dockerfile
├─ requirements.txt
├─ src/
│ └─ handler.py
├─ test_input.json
└─ README.md ← (this file)
```

- `handler.py` — RunPod **handler** (entry point per job). :contentReference[oaicite:1]{index=1}
- `Dockerfile` — builds a CUDA+Python image, installs ComfyUI, and launches the RunPod serverless loop.
- `requirements.txt` — Python deps for the handler (`runpod`, `requests`).
- `test_input.json` — sample local input for smoke tests.

---

## Prerequisites

- **Docker** with **NVIDIA GPU** support on your machine (for full local runs).
- A **RunPod account** and permission to create **Serverless endpoints**.
  Learn: build / test / deploy a worker. :contentReference[oaicite:2]{index=2}
- A **RunPod Network Volume** with your models and a config file:
  - Models live under paths like:
    `/runpod-volume/ComfyUI/models/{diffusion_models,text_encoders,vae,clip_vision,…}`
  - Place `extra_model_paths.yaml` at:
    `/runpod-volume/ComfyUI/extra_model_paths.yaml`
    When a Network Volume is attached to a **Serverless** endpoint, it mounts at **`/runpod-volume`**. :contentReference[oaicite:3]{index=3}

**Why `extra_model_paths.yaml`?** It’s the **official ComfyUI** mechanism to add model search paths outside the container. :contentReference[oaicite:4]{index=4}

---

## Environment (inside the container)

The `Dockerfile` sets:

- `COMFY_DIR=/opt/ComfyUI`
- `COMFY_PORT=8188`
- `COMFY_ARGS="--listen 0.0.0.0 --port 8188 --extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml"`

The handler starts ComfyUI **once** (on first job) with those args, then calls its HTTP API at `http://127.0.0.1:8188`.

## Network Volume mapping / S3 path mapping

- Serverless mount: `/runpod-volume/...`
- S3-compatible path: `s3://<NETWORK_VOLUME_ID>/...`
  RunPod’s docs show the exact mapping between Serverless filesystem paths and S3 keys.

---

## Local development (two ways)

### A) Run the Python handler locally (fastest feedback)

The RunPod SDK can run your handler **locally**, including a tiny local API server.

1. (Optional) Put a small `test_input.json` next to `handler.py` (example provided).

2. From `worker/`, run one of the **local testing** modes:

- **Inline input** (one-shot):

```bash
  python src/handler.py --test_input '{"input":{"workflow":{"1":{"class_type":"EmptyImage","inputs":{"width":64,"height":64}}},"patches":[]}}'
```

- **Local API server** (SDK spins up a local FastAPI to simulate Serverless):

```bash
# Depending on SDK version, the flag is --rp_serve_api or --rp_server_api:
python src/handler.py --rp_serve_api
# or
python src/handler.py --rp_server_api
```

See RunPod’s local testing & flags docs:
[Test Locally Documentation](https://docs.runpod.io/serverless/development/local-testing)
[Local Server Flags Documentation](https://docs.runpod.io/serverless/development/overview)

_Note: Local runs won’t have `/runpod-volume`. For true parity (Comfy + models), use the Docker path below and bind‑mount a local folder to `/runpod-volume`._

B) Build & run the Docker image (parity with Serverless)

```bash
# from repo root
docker build -t media-labs-worker:dev -f worker/Dockerfile .

# simulate the RunPod volume locally
mkdir -p ./local-volume/ComfyUI
cp ./extra_model_paths.yaml ./local-volume/ComfyUI/extra_model_paths.yaml

# (Optional) add small test models or just smoke-test Comfy boot:
docker run --rm --gpus all \
  -v "$PWD/local-volume:/runpod-volume" \
  -p 8188:8188 \
  media-labs-worker:dev
```

This starts the RunPod serverless loop (waiting for jobs) and boots ComfyUI using your YAML. You can verify Comfy at <http://localhost:8188/system_stats>.
Local server options for the RunPod SDK are covered in the docs.
[Running Locally Documentation](https://docs.runpod.io/tutorials/sdks/python/get-started/running-locally)

## Deploy to RunPod Serverless

### Build & push your image

```bash
docker build -t <dockerhub-username>/media-labs-worker:0.1.0 -f worker/Dockerfile .
docker push <dockerhub-username>/media-labs-worker:0.1.0
```

### Create a Serverless Endpoint (Console)

- Image: `<dockerhub-username>/media-labs-worker:0.1.0`
- Attach your Network Volume (same DC) → it mounts at `/runpod-volume`. [Docs](https://docs.runpod.io/serverless/storage/network-volumes)
- Save. (Behind the scenes, the platform exposes standard `/run`, `/runsync`, `/status`, `/health` APIs for your endpoint.)

### **Send jobs** (example with runsync)

```bash
curl -X POST "https://api.runpod.ai/v2/<ENDPOINT_ID>/runsync" \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "workflow": { "...": "ComfyUI Export-API JSON ..." },
      "patches": [
        { "nodeId": "52", "inputKey": "image", "value": "/runpod-volume/inputs/<job>/<file>.png" }
      ]
    }
  }'
```

Endpoint operations, async flow, and result retrieval are described in RunPod’s docs.
[Runpod Documentation](https://docs.runpod.io/serverless/endpoints/operations)

_Note: Serverless endpoints expose fixed routes only (`/run`, `/runsync`, `/status`, `/cancel`, …). You cannot add custom HTTP routes in Serverless mode. [Answer Overflow](https://www.answeroverflow.com/m/1216806869465698354)_

## Input/Output contract

The handler accepts either:

```json
{ "input": { "workflow": { "...": "Export-API" }, "patches": [ ... ] } }
```

or

```json
{ "workflow": { "...": "Export-API" }, "patches": [ ... ] }
```

`patches[]`: `{ "nodeId": string, "inputKey": string, "value": string|number|boolean }`
Use absolute paths under /runpod-volume/... to avoid base64 blobs in requests.

The handler returns:

```json
Copy code
{ "status": "SUBMITTED", "comfy": { "...": "raw /prompt response" } }
```

(Extend it to poll Comfy’s `/history/<prompt_id>` and upload outputs to B2 if desired.)

## Troubleshooting

- **“Value not in list … not in []” in Comfy validators**
  Comfy didn’t find models. Check that:
  - Your Network Volume is attached (mounts at /runpod-volume).
  - `extra_model_paths.yaml` exists at `/runpod-volume/ComfyUI/extra_model_paths.yaml`.
  - The YAML lists the correct categories (e.g., `diffusion_models`, `text_encoders`, `vae`, `clip_vision`, `clip`).
  - **Where do my S3 keys map?**
    `s3://<NETWORK_VOLUME_ID>/path/file` ↔ `/runpod-volume/path/file` in Serverless workers.
  - **Local test only starts the handler, not Docker**
    That’s expected when using the SDK’s local mode; it runs Python directly. For container-parity tests, use the Docker command shown above. (Community Q&A discusses both patterns.)
  - **Health & operations**
    Your endpoint lifecycle and job submission are via the RunPod endpoint operations API—not custom routes inside your image.

## Notes & links

- RunPod docs:
  Getting started / build a worker, local testing, handler functions, endpoint operations, endpoint config, volumes.
- ComfyUI: Extra model paths (extra_model_paths.yaml).
- Official worker templates (good references): worker-template, model workers.

## License

This worker code is provided under the project’s root license. See repository root for details.
