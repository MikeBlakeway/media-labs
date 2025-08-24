# Epics — Media Labs

Date: 2025-08-24
Author: GitHub Copilot

Below are Jira-style epics aligned to the project requirements. Each epic includes a summary, description, acceptance criteria, components, priority, labels, story points, related requirement IDs, dependencies, and risks.

---

## EPIC-001 — Prompt Submission & Job UX

- Summary: End-to-end UX for submitting prompts (text + optional images) and tracking job progress.
- Description: Implement frontend submission flow, client-side validation, API contract for creating jobs, and UI job list/detail pages with real-time status updates (SSE/WebSocket). Ensure example prompts and presets are available.
- Acceptance Criteria:
  - UI allows text prompt + optional image upload and preset selection.
  - POST /api/jobs endpoint documented and accepts payloads used by UI.
  - Job appears in UI job list with statuses: queued, running, completed, failed.
  - Real-time status updates reflected in UI (SSE or WS).
- Components: apps/ui, apps/api
- Priority: High
- Labels: ui, api, ux
- Story Points: 8
- Related REQs: REQ-001, REQ-012, REQ-013, REQ-090–REQ-092
- Dependencies: Job Queue & Worker epic (EPIC-002)
- Risks: Incomplete API contract or lacking real-time infra.

---

## EPIC-002 — Job Queue & Worker Orchestration

- Summary: Reliable enqueue/dequeue, job lifecycle, retries, and status transitions for video and audio jobs.
- Description: Implement a robust queue (e.g., BullMQ/Redis or DB-backed), worker consumers for video and audio lanes, consistent status model, retry/backoff policies, and health endpoints.
- Acceptance Criteria:
  - Jobs can be enqueued via API and dequeued by workers.
  - Worker emits status transitions and logs for observability.
  - Retries and failure handling configured with clear behaviors.
  - Health and queue metrics endpoints exist.
- Components: apps/api, apps/worker
- Priority: High
- Labels: worker, queue, reliability
- Story Points: 13
- Related REQs: REQ-002, REQ-030, REQ-031, REQ-032
- Dependencies: Storage & Secure File Access (EPIC-003), Observability (EPIC-008)
- Risks: Scalability and cross-host coordination.

---

## EPIC-003 — Secure Storage & Signed File Access

- Summary: S3-compatible object storage integration with signed upload/download links and predictable storage paths.
- Description: Implement storage integration (MinIO/S3), signed URL generation, path conventions for inputs/outputs, and access controls. Provide local env examples and tests.
- Acceptance Criteria:
  - apps/api provides signed upload and download URLs.
  - Storage path convention documented and enforced.
  - Uploads validated for allowed types and sizes.
  - End-to-end upload/download tested in CI or dev script.
- Components: apps/api, pods (MinIO), docs
- Priority: High
- Labels: storage, s3, security
- Story Points: 8
- Related REQs: REQ-003, REQ-022, REQ-072
- Dependencies: Job Queue (EPIC-002)
- Risks: Misconfigured ACLs or exposed objects.

---

## EPIC-004 — Image-to-Video & Video-to-Video Pipelines

- Summary: Implement worker pipelines that run ComfyUI workflows to produce image-to-video and video-to-video outputs.
- Description: Integrate ComfyUI docker/pod, define pipeline steps, worker orchestration, parameter mapping, and sample pipelines for preview/standard/high quality. Include smoke tests.
- Acceptance Criteria:
  - Worker can execute ComfyUI pipeline for an image-to-video job.
  - Quality presets (preview/standard/high) produce expected artifacts.
  - Pipeline parameters map to API and UI fields.
  - End-to-end smoke test runs with fake-gpu and produces expected file.
- Components: apps/worker, pods/comfyui, docs
- Priority: High
- Labels: pipeline, comfyui, video
- Story Points: 21
- Related REQs: REQ-010, REQ-011, REQ-012, REQ-013
- Dependencies: Pods infra (EPIC-007), Secure Storage (EPIC-003)
- Risks: Model runtime incompatibilities, native GPU dependency issues.

---

## EPIC-005 — Audio Processing & Separation Lane

- Summary: Independent audio job lane that separates audio into stems and stores predictable outputs.
- Description: Build audio processing worker(s), define audio job schema, storage conventions for stems, and UI endpoints to retrieve audio outputs. Ensure parallel execution with video jobs.
- Acceptance Criteria:
  - Audio jobs enqueue and execute independently.
  - Outputs stored in documented paths and accessible via signed URLs.
  - API exposes endpoints to list and download stems.
  - Parallel job runs do not interfere with video lane.
- Components: apps/worker, apps/api, apps/ui
- Priority: Medium-High
- Labels: audio, worker
- Story Points: 13
- Related REQs: REQ-020, REQ-021, REQ-022, REQ-031, REQ-032
- Dependencies: Job Queue (EPIC-002), Storage (EPIC-003)
- Risks: Long-running compute cost and sync issues.

---

## EPIC-006 — LoRA Management & User Uploads

- Summary: Curated LoRA catalog, user upload workflow, validation (.safetensors), and governance/quarantine.
- Description: Provide UI to browse curated LoRAs, an upload flow for user LoRAs with validation, size limits, storage quarantine, and admin review process.
- Acceptance Criteria:
  - Curated LoRA catalog available in UI.
  - Upload endpoint accepts .safetensors, validates file type/size, and stores in quarantine pending review.
  - Admin can approve/reject uploaded LoRAs.
  - LoRA metadata stored for selection in workflows.
- Components: apps/ui, apps/api, apps/worker, docs
- Priority: Medium
- Labels: lora, models, uploads
- Story Points: 8
- Related REQs: REQ-040, REQ-041
- Dependencies: Secure Storage (EPIC-003), Auth (EPIC-009)
- Risks: Malformed or malicious model files and licensing issues.

---

## EPIC-007 — Developer Experience & Local Dev Stack (fake-gpu)

- Summary: Fast local developer onboarding: Corepack/pnpm bootstrap, MinIO, fake-gpu runner, and reproducible quickstart.
- Description: Provide clear devcontainer/Codespaces guidance, scripts to start pods (fake-gpu, comfyui, MinIO), smoke test scripts, and a short quickstart doc. Ensure corepack/pnpm steps per copilot-instructions.
- Acceptance Criteria:
  - docs/quickstart with Corepack/pnpm sequence and env examples.
  - Shell script to start local stack and run a smoke job using fake-gpu.
  - fake-gpu pod container present and documented.
- Components: pods/, docs, .github
- Priority: High
- Labels: devx, docs, pods
- Story Points: 5
- Related REQs: REQ-070–REQ-073
- Dependencies: none (self-contained)
- Risks: Platform-specific native build issues.

---

## EPIC-008 — Observability, Metrics & Logging

- Summary: Metrics, structured logs, job-level telemetry, and dashboards for operators.
- Description: Instrument API and workers for Prometheus metrics, expose health endpoints, integrate tracing/log correlation for job IDs, and add sample Grafana dashboards and alert rules.
- Acceptance Criteria:
  - Key metrics exported: job counts, queue depth, job durations, error rates.
  - Logs include job ID and status transitions in structured JSON.
  - Example Grafana dashboard and alert rules added to docs.
- Components: apps/api, apps/worker, infra/docs
- Priority: Medium-High
- Labels: observability, metrics, logging
- Story Points: 8
- Related REQs: REQ-005
- Dependencies: Job Queue (EPIC-002)
- Risks: Metrics noise and cost.

---

## EPIC-009 — Security, Auth & Rate Limiting

- Summary: Authentication, authorization, rate limiting, signed callback verification, and CORS/audit policies.
- Description: Implement token-based auth for API, admin roles for LoRA review, rate-limiting middleware, signature verification for provider callbacks, CORS config, and maintain audit logs for uploads and job actions.
- Acceptance Criteria:
  - Auth required for job submission with documented token flow.
  - Rate limits enforced per-user and per-IP.
  - Signed callback verification implemented for third-party webhooks.
  - Audit logs persisted for uploads and job lifecycle events.
- Components: apps/api, apps/ui, docs
- Priority: High
- Labels: security, auth, audit
- Story Points: 13
- Related REQs: REQ-003, REQ-060–REQ-064, REQ-041
- Dependencies: Secure Storage (EPIC-003)
- Risks: Breaking public API or UX friction.

---

## EPIC-010 — Infra & Cost Controls / Autoscaling Playbook

- Summary: Infrastructure templates, autoscaling rules, cost controls, and ops runbook to keep single-user cost < $20/month.
- Description: Define worker instance types, autoscaling policies, spot/GPU rental strategy, storage tiering, and cost-monitoring checks. Provide Terraform/helm examples or deployment manifests and an ops playbook.
- Acceptance Criteria:
  - Ops playbook describing cost controls and scaling rules.
  - Example infra manifests for deployment and autoscaling.
  - Cost-estimate and monitoring guide included in docs.
- Components: pods/, docs, infra (if present)
- Priority: Medium
- Labels: infra, cost, ops
- Story Points: 8
- Related REQs: REQ-004, REQ-080–REQ-083
- Dependencies: Observability (EPIC-008)
- Risks: Provider pricing changes and capacity limits.

---

## EPIC-011 — Frontend UX: Presets, Settings & Accessibility

- Summary: Polished frontend features: quality presets, parameter caps UI, settings persistence, and accessibility.
- Description: Expose preset quality modes, enforce server caps in UI, provide persisted user settings, LoRA browser, and accessibility improvements. Add UI tests/screenshots.
- Acceptance Criteria:
  - Preset chooser implemented and mapped to API.
  - UI prevents users from selecting values above server caps.
  - User preferences persisted across sessions.
  - Basic accessibility checks and UI test coverage added.
- Components: apps/ui, apps/api
- Priority: Medium
- Labels: ux, accessibility, tests
- Story Points: 8
- Related REQs: REQ-012, REQ-013, REQ-014, REQ-090–REQ-095
- Dependencies: Prompt Submission (EPIC-001), Security (EPIC-009)
- Risks: Divergence between UI and server validation.

---

## EPIC-012 — CI/CD, Releases & Workflow Versioning

- Summary: Standardized CI pipeline, pinned pnpm usage, build/test gating, and model/workflow versioning for reproducible releases.
- Description: Ensure CI follows Corepack/pnpm sequence, run lint/tests/build across monorepo, produce deploy artifacts, and add workflow/model version metadata to artifacts and APIs.
- Acceptance Criteria:
  - CI uses corepack/pnpm pinned version and runs install/lint/test/build.
  - Generated artifacts include workflow/model version metadata.
  - Release checklist documented.
- Components: .github, apps/\*, docs
- Priority: Medium
- Labels: ci, release, versioning
- Story Points: 5
- Related REQs: REQ-100–REQ-102, copilot-instructions
- Dependencies: All service epics (for integration tests)
- Risks: Native build tooling causing CI flakes.
