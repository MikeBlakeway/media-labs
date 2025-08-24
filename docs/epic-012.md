# EPIC-012 — CI/CD, Releases & Workflow Versioning

Date: 2025-08-24
Author: GitHub Copilot

## Summary

Establish continuous integration and release practices, including workflow versioning for pipelines and models so builds are traceable and reproducible.

## Acceptance criteria / Definition of Done

- CI runs lint, tests, and builds across the monorepo on PRs and mainline.
- Pipeline/workflow definitions are versioned and tied to releases; workers can pin a version of a workflow.
- Release notes / changelogs are produced automatically via conventional commits.

## High-level story breakdown

- **STORY-012.1 — CI pipeline for monorepo** (4)

  - Implement CI that runs install, lint, test, and build for affected packages.

- **STORY-012.2 — Workflow & model versioning** (4)

  - Add versioning for pipeline/workflow definitions and model artifact manifests; allow workers to opt into pinned versions.

- **STORY-012.3 — Release automation & changelog** (3)

  - Use conventional commits to generate changelogs and automate releases.

- **STORY-012.4 — Canary & staged rollout** (2)
  - Support canary releases and staged rollout for critical infra changes.

## Acceptance & QA checklist

- Create a PR and confirm CI runs required jobs; create a release and verify changelog generation.

## Dependencies & notes

- Integrates with infra (EPIC-010) and pipelines (EPIC-004).

## Estimates

- Rough story points: 13

## How to convert into Jira

- Create tickets for each STORY-012.\* with CI definitions and release workflow steps; tag: ci, releases.
