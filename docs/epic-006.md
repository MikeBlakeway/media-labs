# EPIC-006 — LoRA Management & User Uploads

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Provide a curated LoRA catalog and a secure user upload workflow with validation, quarantine, and admin review so users can contribute models safely.

## Acceptance criteria / Definition of Done

- Curated LoRA catalog is available in the UI with metadata and licensing information.
- Upload endpoint accepts `.safetensors`, validates file signatures and sizes, and places uploads into quarantine for review.
- Admins can approve or reject uploaded LoRAs; approved LoRAs become selectable in pipelines.
- LoRA metadata (name, author, license, hash) is stored and surfaced to workers and UI.

## High-level story breakdown

- **STORY-006.1 — LoRA catalog schema & UI** (2)

  - Define storage schema for LoRA metadata and implement a UI browsing experience.

- **STORY-006.2 — Secure upload flow & validation** (3)

  - Implement upload endpoint, validate `.safetensors` format, enforce size limits, and quarantine uploads.

- **STORY-006.3 — Admin review workflow** (2)

  - Admin UI for approving/rejecting uploads, with audit logs and metadata verification.

- **STORY-006.4 — Integration with pipelines** (1)
  - Ensure approved LoRAs are selectable in pipeline definitions and included in worker runtime path resolution.

## Acceptance & QA checklist

- Upload a valid `.safetensors` file, approve it via admin UI, and confirm it appears in the catalog and is usable by workers.
- Attempt to upload invalid or oversized files and confirm they are rejected or quarantined.

## Dependencies & notes

- Depends on EPIC-003 (storage) and EPIC-009 (auth/permissions).
- Consider virus/malware scanning and license verification as optional steps.

## Estimates

- Rough story points: 8

## How to convert into Jira

- Create Jira tickets for each STORY-006.\* with acceptance criteria and test steps; tag components: ui, api, worker.
