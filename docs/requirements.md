# Media Labs Requirements Document

**Participants:** Product Owner, Development Team (Frontend, Backend, Infra), Stakeholders (Creative Users, Future Monetization Partners)

**Status:** In design phase — on target.

**Target Release:** MVP projected Q4 2025.

---

## Goals

- Deliver a low-cost, self-hosted creative platform for video and audio generation.
- Empower users with deep customisation (LoRAs, presets, NSFW opt-in).
- Keep infra and operational costs under \$20/month for single-user scale.
- Provide a foundation that can scale to multi-user or commercial usage.

## Background

- Media Labs originates from the need to experiment with open-source video generation tools without incurring high API costs.
- ComfyUI is selected as the core engine due to its flexibility and strong community ecosystem.
- The MVP focuses on image-to-video and audio separation, with future extensibility to more workflows.

## Assumptions

- Users are technically savvy enough to manage prompts and experiment with parameters.
- Infrastructure will primarily use low-cost GPU rentals (SaladCloud, RunPod) and S3-compatible object storage.
- Development team is comfortable with TypeScript, Next.js, Node.js, Prisma, and Docker.
- Regulatory environment permits NSFW content when safely gated and compliant with provider terms.

## Out of Scope

- Monetization features (subscriptions, payments) are not part of the MVP.
- Mobile applications (iOS/Android) are deferred to a later phase.
- Multi-user collaboration features are excluded from MVP.
- Advanced moderation beyond NSFW toggle (e.g., detailed ML classifiers) is not planned initially.
- Integration with third-party social platforms is outside current scope.

This document serves as the **single source of truth** for Media Labs requirements. Each requirement is given a unique reference code (`REQ-###`) so that related epics, stories, and tasks can link back here.

---

| ID      | Title                         | Description                                                                                                                              |                Related Epics | Notes                                |
| ------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------: | ------------------------------------ |
| REQ-001 | Prompt Submission             | As a user, I want to submit prompts (text and optional input images) so that I can generate video outputs.                               |                     EPIC-001 |                                      |
| REQ-002 | Job Queue                     | As a user, I want my jobs to be queued and tracked with statuses so that I know whether they are waiting, running, completed, or failed. |                     EPIC-002 |                                      |
| REQ-003 | Secure File Access            | As a user, I want secure upload and download links so that my inputs and outputs remain private and safe.                                |           EPIC-003, EPIC-009 |                                      |
| REQ-004 | Self-Hosted Infrastructure    | As a product owner, I want the system to run on self-hosted or rented GPUs so that we avoid expensive third-party inference APIs.        |                     EPIC-010 | Provider TBD                         |
| REQ-005 | Observability                 | As an operator, I want to see job counts, queue times, and render times so that I can monitor system health.                             |                     EPIC-008 |                                      |
| REQ-010 | Image-to-Video                | As a user, I want to generate videos from still images so that I can animate static content.                                             |                     EPIC-004 |                                      |
| REQ-011 | Video-to-Video                | As a user, I want to transform videos into new styles so that I can edit and remix content creatively.                                   |                     EPIC-004 |                                      |
| REQ-012 | Fine-Tuning Parameters        | As a user, I want to adjust frames, fps, resolution, steps, and CFG so that I can control the quality and length of my video.            | EPIC-001, EPIC-004, EPIC-011 |                                      |
| REQ-013 | Quality Presets               | As a user, I want preset quality modes so that I can quickly choose between preview, standard, or high quality.                          | EPIC-001, EPIC-004, EPIC-011 |                                      |
| REQ-014 | Parameter Caps                | As an operator, I want limits on frames, resolution, and steps so that runaway jobs do not impact costs or performance.                  |                     EPIC-011 |                                      |
| REQ-020 | Audio Separation              | As a user, I want to separate audio into stems so that I can remix or edit individual tracks.                                            |                     EPIC-005 |                                      |
| REQ-021 | Parallel Audio Jobs           | As a user, I want audio jobs to run independently from video jobs so that both can finish faster.                                        |                     EPIC-005 |                                      |
| REQ-022 | Audio Storage Paths           | As a user, I want audio outputs stored in predictable locations so that I can easily retrieve stems.                                     |           EPIC-003, EPIC-005 |                                      |
| REQ-030 | Processing Lanes              | As a developer, I want distinct lanes for video and audio so that they can scale and run independently.                                  |                     EPIC-002 |                                      |
| REQ-031 | Concurrency                   | As a user, I want video and audio jobs to run at the same time so that I don’t have to wait for one to finish.                           |           EPIC-002, EPIC-005 |                                      |
| REQ-032 | Independent Scaling           | As an operator, I want to scale audio and video workers separately so that I can control costs.                                          |           EPIC-002, EPIC-005 |                                      |
| REQ-040 | Curated LoRAs                 | As a user, I want curated LoRAs available so that I can apply trusted styles easily.                                                     |                     EPIC-006 |                                      |
| REQ-041 | User-Uploaded LoRAs           | As a user, I want to upload my own LoRAs in `.safetensors` format so that I can apply my custom styles.                                  |           EPIC-006, EPIC-009 |                                      |
| REQ-042 | LoRA Upload Constraints       | As an operator, I want upload size limits and deduplication so that storage and security risks are controlled.                           |                     EPIC-006 |                                      |
| REQ-043 | Multi-LoRA Support            | As a user, I want to combine multiple LoRAs with different strengths so that I can achieve complex styles.                               |                     EPIC-006 |                                      |
| REQ-044 | Advanced LoRA Parameters      | As a power user, I want to adjust encoder vs UNet strength and trigger words so that I can fine-tune outputs.                            |                     EPIC-006 |                                      |
| REQ-045 | LoRA Quarantine & Review      | As an operator, I want to quarantine non-compliant LoRAs so that unsafe uploads don’t enter the system.                                  |                     EPIC-006 |                                      |
| REQ-050 | Safe Mode Default             | As a user, I want the system to default to safe mode so that I don’t see NSFW content unless I opt in.                                   |           EPIC-009, EPIC-011 |                                      |
| REQ-051 | NSFW Opt-In                   | As a user, I want a toggle to enable NSFW content so that I can choose when to generate it.                                              |           EPIC-009, EPIC-011 |                                      |
| REQ-052 | NSFW Filtering                | As an operator, I want prompts and models filtered by tags so that NSFW content is controlled.                                           |                     EPIC-009 |                                      |
| REQ-053 | Hard Ban Categories           | As a user, I want reassurance that illegal or harmful categories are always blocked so that the platform is safe.                        |                     EPIC-009 |                                      |
| REQ-054 | NSFW Storage Separation       | As an operator, I want NSFW outputs stored separately so that they are not accidentally exposed.                                         |                     EPIC-009 |                                      |
| REQ-060 | Admin Authentication          | As an admin, I want bearer token authentication so that only authorized users access admin endpoints.                                    |                     EPIC-009 |                                      |
| REQ-061 | Rate Limiting                 | As an operator, I want job creation rate limits so that the system is protected from abuse.                                              |                     EPIC-009 |                                      |
| REQ-062 | Secure Callbacks              | As a developer, I want signed callbacks from GPU pods so that only trusted events update job statuses.                                   |                     EPIC-009 |                                      |
| REQ-063 | CORS Restrictions             | As a developer, I want CORS limited to known domains so that APIs are not misused.                                                       |                     EPIC-009 |                                      |
| REQ-064 | Audit Logging                 | As an operator, I want audit logs of uploads, jobs, and NSFW settings so that I can track system activity.                               |                     EPIC-009 |                                      |
| REQ-070 | Local Dev Support             | As a developer, I want to run the stack locally so that I can test changes without cloud resources.                                      |                     EPIC-007 |                                      |
| REQ-071 | Fake GPU Runner               | As a developer, I want a fake GPU runner so that I can test end-to-end without needing a GPU.                                            |                     EPIC-007 |                                      |
| REQ-072 | Hybrid Dev Mode               | As a developer, I want to run locally but connect to remote GPUs so that I can iterate quickly.                                          |           EPIC-007, EPIC-003 |                                      |
| REQ-073 | Local Storage Options         | As a developer, I want MinIO or local storage so that I can test outputs without cloud costs.                                            |                     EPIC-007 |                                      |
| REQ-080 | Cost Efficiency               | As a product owner, I want infra costs kept under $20/month so that the MVP is affordable.                                               |                     EPIC-010 |                                      |
| REQ-081 | On-Demand GPU Pods            | As a developer, I want to spin up GPU pods on demand so that costs only accrue when jobs are running.                                    |                     EPIC-010 | Provider TBD                         |
| REQ-082 | S3-Compatible Storage         | As a developer, I want outputs stored in S3-compatible storage so that it works with many providers.                                     |           EPIC-003, EPIC-010 |                                      |
| REQ-083 | Autoscaling with Idle Timeout | As an operator, I want idle pods to shut down after a few minutes so that GPU spend is minimized.                                        |                     EPIC-010 |                                      |
| REQ-090 | Frontend Framework            | As a developer, I want to build the UI with Next.js 15, TS, Tailwind so that it’s modern and maintainable.                               |                     EPIC-011 |                                      |
| REQ-091 | Job List & Status UI          | As a user, I want to see a list of my jobs and their status so that I can track progress and results.                                    |           EPIC-001, EPIC-011 |                                      |
| REQ-092 | Live Progress Updates         | As a user, I want live job updates via SSE so that I can see progress without refreshing.                                                |                     EPIC-001 |                                      |
| REQ-093 | LoRA Style Browser            | As a user, I want a browser to preview and select LoRAs so that I can choose styles visually.                                            |           EPIC-006, EPIC-011 |                                      |
| REQ-094 | Preset & Advanced Editing     | As a user, I want simple presets and advanced controls so that I can balance ease and customisation.                                     |                     EPIC-011 |                                      |
| REQ-095 | Persist User Settings         | As a user, I want my last-used settings saved so that I don’t have to reconfigure every session.                                         |                     EPIC-011 |                                      |
| REQ-100 | Workflow Extensibility        | As a developer, I want to add new workflows without breaking existing ones so that the platform grows.                                   |                     EPIC-012 |                                      |
| REQ-101 | Versioned Models & Workflows  | As a developer, I want versioned workflows and models so that changes are traceable and reproducible.                                    |                     EPIC-012 |                                      |
| REQ-102 | Usage Dashboard               | As a product owner, I want a dashboard of usage stats and costs so that I can monitor adoption and spending.                             |                     EPIC-012 | Example: may integrate Grafana later |

---

## Technical Decisions

| Decision ID | Requirement ID | Problem                                      | Decision                                                          | Name             |
| ----------- | -------------- | -------------------------------------------- | ----------------------------------------------------------------- | ---------------- |
| DEC-001     | REQ-004        | Need to avoid expensive API-based inference. | Use self-hosted or rented GPU infrastructure (SaladCloud/RunPod). | Product Owner    |
| DEC-002     | REQ-041        | Risk of unsafe model formats like .ckpt.     | Restrict LoRA uploads to `.safetensors` format only.              | Development Team |
