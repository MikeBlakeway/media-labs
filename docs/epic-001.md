# EPIC-001 — Prompt Submission & Job UX

Date: 2025-08-24
Author: GitHub Copilot

## Summary

End-to-end UX for submitting prompts (text + optional images) and tracking job progress. This epic covers frontend flows, API endpoints, validation, real-time updates, basic presets, and E2E smoke tests.

## Acceptance criteria / Definition of Done

- Users can submit a job with a text prompt and optional input image(s) from the UI.
- API accepts job creation requests and returns a job id and initial status.
- Jobs appear in a Job List and Job Detail UI with statuses: queued, running, completed, failed.
- Real-time status updates are delivered to the UI (SSE or WebSocket) and reflected without manual refresh.
- Basic quality presets (preview, standard, high) are selectable and mapped to API parameters.
- Server-side validation rejects malformed requests and enforces parameter caps.
- End-to-end smoke test demonstrating a job lifecycle (UI → API → worker → storage) exists and passes in dev.

## High-level story breakdown

Note: story IDs here are informal and intended for tracking when converting into Jira issues.

### UI stories

- **STORY-001.1 — Job submission form** (8)

  - Add a form for prompt text, optional image upload, preset selector, and submit button.
  - Client-side validation for required fields and allowed file types/sizes.
  - Map form values into the API contract.

- **STORY-001.2 — Job list & brief cards** (5)

  - Implement a Job List page showing job id, prompt excerpt, status, and timestamp.
  - Provide link to Job Detail page.

- **STORY-001.3 — Job detail & result viewer** (8)

  - Show full prompt, parameters used, logs/status timeline, and links to outputs.
  - Provide a Retry / Cancel action where appropriate.

- **STORY-001.4 — Presets & quick-select UI** (3)
  - Implement the preview/standard/high presets and local persistence of last-used preset.

### API stories

- **STORY-001.5 — POST /api/jobs (API contract + validation)** (5)

  - Define the request and response shape (JSON). Example request: { prompt, images[], preset, params }.
  - Validate payload server-side and return 400 on invalid input.
  - Return created job id and initial status.

- **STORY-001.6 — GET /api/jobs & GET /api/jobs/:id** (5)

  - Implement list and detail endpoints that the UI can call.

- **STORY-001.7 — Real-time status stream (SSE) endpoint** (6)
  - Implement an SSE endpoint (e.g., `/api/jobs/stream` or `/api/jobs/:id/stream`) that emits status transitions for a job.
  - Ensure authentication/rate limits as required.

### Worker / Integration stories

- **STORY-001.8 — Ensure workers emit status transitions to the jobs store** (4)

  - Worker must update job status in the canonical store (DB) and emit events consumable by SSE layer.

- **STORY-001.9 — Job creation hooks enqueue work into the queue** (4)
  - On job creation, API should enqueue a job into the queue system used by workers.

### Validation & Security

- **STORY-001.10 — Server-side parameter caps & validation** (3)

  - Enforce max frames, resolution, steps, and file sizes.

- **STORY-001.11 — Auth for job creation (optional)** (3)
  - Implement token check or allow anonymous but rate-limited submissions depending on product decision.

## Testing & QA

- **STORY-001.12 — Unit tests for API validation and endpoints** (5)

  - Add unit tests for request validation and happy/failure paths.

- **STORY-001.13 — Integration test for job lifecycle** (8)

  - End-to-end test (can use fake-gpu) that creates a job via API and asserts status transitions to completion and the presence of an output path.

- **STORY-001.14 — UI integration tests (Playwright/Cypress)** (8)
  - Tests for submit flow, job list visibility, and live update handling.

## Docs / Developer Experience

- **STORY-001.15 — API contract docs and sample curl requests** (2)

  - Add docs in `docs/` for `POST /api/jobs`, sample payloads, and SSE usage.

- **STORY-001.16 — Quickstart smoke script** (2)
  - Provide a small script `scripts/smoke-epic-001.sh` that submits a job and polls/verifies the result (works with fake-gpu).

## Operations / Observability

- **STORY-001.17 — Job metrics & health** (3)
  - Add metrics for job submission rate, queue depth, and job durations; expose health endpoints for UI to check.

## Acceptance & QA checklist

- Manual test: Submit a job from UI with prompt + image, confirm it appears in list and completes with outputs.
- Run integration test: `pnpm --filter ./apps/api run test:integration` (or repo equivalent).
- Verify SSE: job detail page receives a live update when worker changes status.
- Verify server-side rejects input exceeding caps.

## Dependencies & notes

- Depends on EPIC-002 (Job Queue & Worker) to exist and be reachable in dev.
- Depends on EPIC-003 for signed upload URLs if image uploads use object storage.
- Keep API contract small and stable to avoid repeated UI churn.

## Estimates

- Total rough story points: 81 (sum of story estimates above) — split into several sprints; refine when converting to Jira stories.
