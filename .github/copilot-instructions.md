# Copilot Instructions for Media Lab

## Project Overview

* A modular **AI media lab** for text→image, image/video generation, audio separation, frame interpolation, face swapping, and video transformation.
* Built with open‑source models under **research‑only/non‑commercial** licenses (e.g., Stable Diffusion XL, SVD, AnimateDiff, VideoCrafter, Demucs, InsightFace).
* Deployable via **Docker** and scalable to **GPU-backed servers** (e.g. RunPod), with a Next.js frontend on **Vercel**.

## Business Context

* MVP is aimed at **prototyping, demos, and internal experimentation**; cost-efficiency is critical.
* **Non-commercial license restrictions** require visible labelling and easy model swap for future commercialization.
* The team expects a **lean operation**: spin up GPU only when needed, track usage, and monitor resource consumption.

## Roles for Copilot

When drafting or editing code, Copilot should consider:

* **Architecture Designer**: maintain clear separation across services (`api`, `comfy`, `faceswap`, `demucs`, `rife`, `web`).
* **DevOps / Infra Architect**: write Dockerfiles, compose files, CI/CD workflows that support both CPU-only local testing and GPU deployment.
* **Product Engineer**: ensure job workflows (T2I, I2V, etc.) are robust, resumable, and user-triggered from the UI; include prompts, progress websockets, and download links.
* **Compliance Auditor**: embed license notices, watermarking, and usage confirmations for research-only components.
* **Observability Specialist**: add logs, metrics, cost tracking, job queueing, and rate-limiting features.

## Common Tasks & Commands

Examples of tasks where Copilot should generate context-aware solutions:

* Create a FastAPI endpoint `/jobs` with create/status/list/cancel semantics using memory initially.
* Stencil a ComfyUI workflow JSON for SDXL T2I (prompt, seed, steps) and for SVD I2V (image input, frame count, fps).
* Write Dockerfiles: one base image for CPU local dev and one GPU-enabled for RunPod with models volume-mounted.
* Draft a GitHub Actions workflow (`copilot-setup-steps.yml`) to pre-install Python dependencies and media tools like `ffmpeg`.
* Add Redis-based job queue logic with retry/backoff and persistence to PostgreSQL.
* Write a snippet to measure and log GPU job duration for cost tracking.
* Annotate UI pages with license badges: `research-only`, `non-commercial`, etc.

## Environment & Copilot Setup

* Add `.github/workflows/copilot-setup-steps.yml` with a `copilot-setup-steps` job to pre-install dependencies (Python, Node, ffmpeg, Redis client).
* Define environment variables in GitHub Environments:

  * `ENV=dev`, `RUNPOD_TOKEN`, `STORAGE_URL`, etc.
* Add secrets for secure resource access.

## Copilot Agent Permissions & Actions

* Use GitHub’s **MCP (Model Context Protocol)** to extend Copilot with tool access (e.g., job queue, caching, observability tools).
* Configure via repository Settings under “Copilot → Coding Agent.”
* Provide a **Copilot environment** named `copilot` in GitHub “Environments,” add secrets like `COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN` for expanded context.
* Ensure workflows for Copilot **fail gracefully**: setup steps should log warnings if they fail, not block the session.
