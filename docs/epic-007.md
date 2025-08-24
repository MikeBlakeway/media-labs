# EPIC-007 — Developer Experience & Local Dev Stack (fake-gpu)

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Provide a reproducible developer experience with a local dev stack (including `fake-gpu` and MinIO pods), clear onboarding docs, and fast feedback loops so contributors can iterate locally.

## Acceptance criteria / Definition of Done

- A documented devstack (devcontainer/docker-compose/pods) starts and runs the UI, API, and worker with `pnpm` commands.
- `fake-gpu` pod provides a fast test harness for GPU-like flows.
- Onboarding docs and scripts let a new contributor run the full stack and pass a smoke test within 15 minutes.

## High-level story breakdown

- **STORY-007.1 — Devcontainer & local scripts** (3)

  - Add recipes, Makefile/scripts, and a devcontainer that boots a reproducible environment.

- **STORY-007.2 — `fake-gpu` pod & local pods orchestration** (4)

  - Implement `fake-gpu` and sample comfyui/comfy-pod compose files and provide sample workloads for quick feedback.

- **STORY-007.3 — Onboarding docs & troubleshooting** (2)

  - Expand `docs/how-to-develop.md` with step-by-step setup and common troubleshooting tips.

- **STORY-007.4 — Fast smoke harness** (2)
  - Add a lightweight smoke script that validates end-to-end submission → worker → artifact retrieval locally.

## Acceptance & QA checklist

- Follow the onboarding guide and run the smoke script successfully.
- Confirm `fake-gpu` produces expected sample outputs for the smoke test.

## Dependencies & notes

- Depends on EPIC-003 (storage) and EPIC-004 (pipelines) for meaningful smoke tests.
- Keep dev images small and cache-friendly to speed iteration.

## Estimates

- Rough story points: 11

## How to convert into Jira

- Create Jira tickets for each STORY-007.\* with setup commands and validation steps; tag component: dev-experience.
