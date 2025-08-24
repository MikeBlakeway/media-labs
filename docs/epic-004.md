# EPIC-004 — Image-to-Video & Video-to-Video Pipelines

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Implement worker pipelines that run ComfyUI workflows (or equivalent) to produce image-to-video and video-to-video outputs with configurable presets and reproducible artifacts.

## Acceptance criteria / Definition of Done

- Workers can execute ComfyUI-based pipelines for image-to-video and video-to-video jobs end-to-end.
- Quality presets (preview/standard/high) are available and produce reproducible artifacts within expected resource/time budgets.
- Pipeline parameters map cleanly to API fields and are surfaced in the UI.
- End-to-end smoke tests run with the `fake-gpu` dev pod and produce expected outputs.

## High-level story breakdown

- **STORY-004.1 — ComfyUI pod integration & worker bootstrapping** (4)

  - Add pod/docker config for ComfyUI and wiring so workers can call pipelines via a stable local endpoint or gRPC interface.

- **STORY-004.2 — Pipeline definitions & sample workflows** (5)

  - Create canonical workflows for image-to-video and video-to-video (preview/standard/high) with parameter annotations and sample inputs.

- **STORY-004.3 — Parameter mapping & API contract** (3)

  - Define API request shapes and map them to pipeline parameters; validate input ranges and defaults.

- **STORY-004.4 — Resource isolation & retries** (3)

  - Ensure pipelines run in isolated lanes, implement retry logic and graceful degradation for GPU failures.

- **STORY-004.5 — Presets & UX interoperability** (3)

  - Implement presets in the API and update frontend presets to match; include preview mode with fast turnaround.

- **STORY-004.6 — Smoke tests & CI integration** (3)
  - Add CI smoke tests that run pipelines in `fake-gpu`/comfyui pod and verify output artifacts.

## Acceptance & QA checklist

- Run local end-to-end: submit image-to-video job, confirm worker picks it up, and retrieve signed output via storage.
- Validate each preset (preview/standard/high) produces artifacts within expected quality and size.

## Dependencies & notes

- Depends on EPIC-007 (pods infra & dev stack) and EPIC-003 (secure storage for artifacts).
- Consider maintaining a small set of canonical model weights and ComfyUI flow definitions under `pods/comfyui/samples` for reproducibility.

## Estimates

- Rough story points: 21

## How to convert into Jira

- Create Jira tickets for each STORY-004.\* with acceptance criteria, CI smoke steps, and components: worker, pods, ui.
