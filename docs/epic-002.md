# EPIC-002 — Job Queue & Worker Orchestration

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Reliable enqueue/dequeue, job lifecycle, retries, and status transitions for video and audio jobs. This epic delivers the queueing infra, worker consumers for distinct processing lanes, retry/backoff policies, and health/metrics endpoints for operators.

## Acceptance criteria / Definition of Done

- A durable job model exists in the canonical store (DB) with statuses, timestamps, and metadata.
- Jobs enqueued by the API are reliably delivered to workers and processed by the appropriate lane (video or audio).
- Workers update the canonical job status and emit events consumable by SSE/notification layers.
- Retry/backoff and dead-letter handling are implemented and configurable.
- Health endpoints and basic queue metrics (queue depth, inflight, failed) are exposed.
- End-to-end integration test demonstrates enqueue → worker → status updates → output.

## High-level story breakdown

### Infrastructure / Core stories

- **STORY-002.1 — Choose and wire queue backend (BullMQ/Redis or DB-backed)** (5)

  - Evaluate options and add chosen dependency.
  - Add configuration and env vars for connection.

- **STORY-002.2 — Canonical job schema & migrations (DB)** (5)

  - Define Job table/model: id, status, payload, result_paths, retries, timestamps, lane, attempts, metadata.
  - Add DB migration and Prisma/client or ORM model.

- **STORY-002.3 — Job enqueue API hooks** (4)

  - Implement API-side enqueue logic that writes job to DB and enqueues to queue backend.

- **STORY-002.4 — Worker process scaffold & runner** (6)

  - Create worker entrypoint with lane registration (video, audio) and pluggable task handlers.

- **STORY-002.5 — Video lane worker implementation** (13)

  - Implement worker handler that consumes video jobs, runs pipeline (or calls ComfyUI pod), streams logs, and writes outputs.

- **STORY-002.6 — Audio lane worker implementation** (8)
  - Implement worker handler for audio jobs, separation logic, and output storage.

### Reliability & error handling

- **STORY-002.7 — Retries and backoff policies** (5)

  - Implement configurable retry/backoff, max attempts, and move to dead-letter queue after threshold.

- **STORY-002.8 — Dead-letter processing & alerting** (4)

  - Add a dead-letter consumer for manual inspection and email/alert integration for repeated failures.

- **STORY-002.9 — Idempotency & deduplication** (5)
  - Ensure workers handle duplicate messages idempotently and implement deduplication where necessary.

### Observability & health

- **STORY-002.10 — Queue metrics & health endpoints** (5)

  - Expose metrics: queue depth, processing rate, success/failure counts; add `/health` and `/metrics` endpoints.

- **STORY-002.11 — Structured logging & correlation ids** (4)
  - Ensure logs include job_id, attempt, and lane; include trace IDs for correlation with requests.

### Integration & events

- **STORY-002.12 — Event bus / publish events for job status** (6)

  - Publish canonical events (job.created, job.started, job.progress, job.completed, job.failed) to a channel consumable by SSE or other listeners.

- **STORY-002.13 — SSE / notification integration** (6)
  - Ensure SSE layer subscribes to job events and relays them to connected clients.

### Security & operations

- **STORY-002.14 — Worker auth & secure connections** (3)

  - Secure connections between API, queue, and workers (TLS, auth tokens) for remote deployments.

- **STORY-002.15 — Configurable concurrency and rate limits** (4)
  - Allow per-lane concurrency configuration and rate limits to be set via env/config.

### Testing & QA

- **STORY-002.16 — Unit tests for enqueue/dequeue logic** (5)

  - Add unit tests covering DB writes, enqueue calls, and failure scenarios.

- **STORY-002.17 — Integration test with fake queue and fake-gpu** (8)
  - End-to-end test that enqueues a job, runs a worker against the fake-gpu, and asserts state transitions and output presence.

### Docs / DevX

- **STORY-002.18 — Developer docs for running workers locally** (2)

  - Document how to start worker(s) locally, configure lanes, and read logs.

- **STORY-002.19 — Example env config & deployment snippets** (2)
  - Provide example env vars and a simple docker-compose snippet for running queue + worker locally.

## Acceptance & QA checklist

- Run integration smoke test: job enqueued via API is processed by worker and status becomes `completed` with output path.

- Query `/metrics` shows queue depth and processing metrics after test.

## Dependencies & notes

- Depends on EPIC-003 for storage of input/output artifacts.

- Careful selection of queue backend affects operational complexity (Redis/BullMQ vs DB-backed queues).

## Estimates

- Total rough story points: 104 — refine during grooming.

## How to convert into Jira

- Create Jira issues for each STORY-002.\* under Epic EPIC-002 with Acceptance Criteria, estimate, and labels (worker, queue, reliability, infra).
