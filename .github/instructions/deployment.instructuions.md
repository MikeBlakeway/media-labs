# Deployment — RunPod + ComfyUI + Vercel

This runbook explains how to run the MVP on low-cost infrastructure (hybrid cloud). It focuses on spinning up a ComfyUI headless instance on RunPod for GPU processing, a FastAPI backend (optional) to orchestrate jobs, Cloudflare R2 for storage, and a Vercel-hosted Next.js frontend.

## Architecture recap

- Frontend: Next.js app deployed to Vercel (Hobby / free)
- API / Job Gateway: FastAPI running on a small container service (Railway / Render / Cloud Run) or co-hosted with ComfyUI if desired
- GPU Processing: ComfyUI (headless) running on a RunPod GPU instance (on-demand)
- Storage: Cloudflare R2 for uploads and outputs
- Database: Supabase (free tier) for jobs, metadata, user accounts (optional)

## Quick RunPod + ComfyUI guide

1. Create a RunPod account and start a GPU instance (e.g., RTX 3090 / 4090). Use an image/container that includes Python 3.10+, CUDA drivers, and Docker if you want to run ComfyUI in a container.

2. Example (RunPod UI):

   - Choose a GPU instance.
   - Provide a startup script or Docker image that installs ComfyUI and required models.

### Minimal start script (example)

```bash
# On the RunPod instance (bash)
# 1. Update and install dependencies
sudo apt update && sudo apt install -y git python3-venv python3-pip

# 2. Clone ComfyUI and create venv
git clone https://github.com/comfyanonymous/ComfyUI.git comfyui
cd comfyui
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. (Optional) Add models to the models/ directory. Download SDXL/SVD checkpoints to comfyui/models/
# 4. Start ComfyUI headless with the API/queue enabled
python main.py --headless --api --queue
```

Notes:

- Ensure the instance has proper CUDA drivers and GPU access for PyTorch.
- If using Docker, build an image with ComfyUI and start the container with GPU access (NVIDIA runtime or equivalent).

## Networking

- Expose ComfyUI's API port securely. Prefer connecting from your FastAPI backend running in a private network or via an SSH tunnel rather than exposing the GPU node publicly.
- If you must expose, use a reverse proxy with authentication (Caddy, nginx) and TLS.

## FastAPI job gateway (optional)

- The FastAPI backend receives uploads from the frontend, stores them in R2, creates a job entry in Supabase, and posts prompts to ComfyUI's queue API.
- It also listens for ComfyUI WebSocket events for progress updates and stores outputs back to R2.

## Vercel frontend notes

- Deploy your Next.js app to Vercel using the Vercel CLI or Git integration.
- Keep secrets (RunPod auth, R2 keys, Supabase keys) out of the client; store them as Vercel environment variables and use the FastAPI backend as a proxy for privileged actions.

## Cost control

- Stop the RunPod instance when idle. Use scripts or RunPod's automation to start/stop on demand.
- Use small instance types for development and upscale for heavy processing.
- Cache warm model states if you keep instances alive for short bursts.

## Troubleshooting

- ComfyUI errors on startup: check Python/PyTorch/CUDA compatibility (PyTorch+CUDA must match installed drivers).
- WebSocket connection issues: ensure firewall allows outbound/inbound on configured ports and that any reverse proxy forwards WebSocket connections correctly.

## Next steps / improvements

- Add an autoscaler or a short-lived serverless function to start RunPod instances on-demand and stop them after inactivity.
- Implement a model registry to manage different checkpoints and their licenses.
- Add monitoring and alerting for cost spikes and long-running jobs.
