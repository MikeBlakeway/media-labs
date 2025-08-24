# EPIC-003 — Secure Storage & Signed File Access

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Add a secure, S3-compatible object storage layer with signed upload/download URLs, predictable path conventions, validation, and lifecycle policies so clients and workers can reliably read/write artifacts.

## Acceptance criteria / Definition of Done

- `apps/api` provides stable signed upload and download endpoints for input and output artifacts.
- Storage path conventions are documented and enforced (inputs, outputs, logs, tmp).
- Upload validation rejects disallowed types and oversized files.
- Automatic lifecycle policies or archival rules available for older artifacts.
- End-to-end dev smoke script demonstrates upload → worker processing → signed download.

## High-level story breakdown

- **STORY-003.1 — Storage SDK integration & config** (3)

  - Add S3/MinIO client wrapper, configuration, and env var examples.

- **STORY-003.2 — Path conventions & naming scheme** (3)

  - Define canonical paths for inputs, outputs, logs, and temporary files; document expectations.

- **STORY-003.3 — Signed URL generation (uploads/downloads)** (5)

  - Implement endpoints that return pre-signed URLs for uploads and downloads with TTL and permissions.

- **STORY-003.4 — Upload validation middleware** (4)

  - Validate MIME types, file extensions, size limits, and content scanning hooks (optional quarantine).

- **STORY-003.5 — Storage migration & local dev (MinIO) setup** (3)

  - Add dev docker-compose example using MinIO and scripts to seed test data.

- **STORY-003.6 — Lifecycle and retention policies** (3)

  - Implement configurable retention/archival rules and a CLI to clean or archive old outputs.

- **STORY-003.7 — Audit logging and access controls** (4)
  - Record uploads/downloads with job_id and user_id and ensure signed URLs are rate-limited.

## Acceptance & QA checklist

- Run local smoke: request signed upload URL, upload a sample, trigger worker, and download result via signed URL.
- Verify upload validation rejects an oversized or disallowed file.

## Dependencies & notes

- Depends on EPIC-002 for job lifecycle integration and consumers (workers).

- For development use MinIO; in prod use S3-compatible endpoint with proper credentials.

## Estimates

- Rough story points: 21

## How to convert into Jira

- Create Jira tickets for each STORY-003.\* with acceptance criteria and test steps; tag components: api, infra, pods.
