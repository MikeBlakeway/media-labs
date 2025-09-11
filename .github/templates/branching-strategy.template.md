---
title: Branching & Release Strategy
owner: ${ORG}/${REPO}
status: Draft
last-updated: YYYY-MM-DD
description: Defines our branching model, release process, and CI/CD enforcement.
---

## Objectives

- Keep `main` always releasable.
- Ship on a predictable cadence (e.g., weekly).
- Ensure safe hotfixes and low MTTR.
- Enforce quality gates (lint, types, tests, build, security).

## Decision Matrix

### Choices Table

| Model                              | Pros                                 | Cons                  | Fit for Us |
| ---------------------------------- | ------------------------------------ | --------------------- | ---------- |
| Trunk-Based                        | Fast, simple                         | Needs strong flags    | ☐          |
| GitHub Flow                        | Simple PRs                           | No formal staging     | ☐          |
| GitFlow                            | Clear roles                          | Heavy, slow           | ☐          |
| **Release Branches (Recommended)** | Stabilization window, staging parity | Slightly more process | **☑**      |

### Decision Summary Table

| Metric         | Decision                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| Cadence        | Weekly                                                                                    |
| Model          | Short-lived feature branches off `main`; weekly `release/<vX.Y.Z>` for stabilization      |
| Release Source | Tag on `release/*` to deploy production                                                   |
| Environments   | PR preview (ephemeral) → Staging (`release/*`) → Prod (tag `v*`)                          |
| Versioning     | SemVer from Conventional Commits; auto-generate CHANGELOG                                 |
| Hotfix         | Branch from `main`; merge to `main` → cherry-pick to active `release/*` if pending        |
| Backports      | Not required (latest only). Optional future `release/<major.minor>` for long-term support |

## Final Strategy

- **Feature branches**: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`
- **Weekly release branches**: `release/<vX.Y.Z>` cut from `main`
- **Hotfix branches**: `hotfix/<desc>` from `main`
- **Tags**: `vX.Y.Z` (SemVer)

## Branch Policy

- **Protected:** `main`, `release/*`
- **Working branches:**
  - `feat/<area>-<desc>`
  - `fix/<issue>`
  - `chore/<task>`
  - `docs/<topic>`
  - `refactor/<area>`
- **Release branches:** `release/<vX.Y.Z>` (ISO week)
- **Hotfix branches:** `hotfix/<desc>`
- **Rules:**
  - Branch name regex `^(feat|fix|chore|docs|refactor|hotfix|release)\/[a-z0-9._-]+$`
  - Branches live ≤ 1–3 days
  - Rebase/merge from `main` frequently
  - Squash merges only.
  - Delete on merge.
  - Required checks before merge (see CI/CD Enforcement).

## Release & Versioning

- Conventional Commits drive SemVer.
- Auto-generate changelog & release notes (Changesets or semantic-release).
- Tag from **release branch** when shipping prod.
- Cut `release/<vX.Y.Z>` from `main` at start of week.
- Auto-deploy `release/*` to Staging.
- When green: tag `vX.Y.Z` on the release branch → deploy to Prod.

## Environments & Deploy Triggers

- **PRs** → Preview env
- **release/\* push** → Staging deploy
- **v\* tag** → Production deploy

> TODO: Document provider(s) and URLs
> Staging: ${STAGING_URL}
> Production: ${PROD_URL}

## CI/CD Enforcement (see `.github/workflows/ci.yml`)

- Lint, type-check, tests, build
- Audit & (optional) bundle size
- Commitlint on PRs and pushes
- Staging deploy on `release/*`
- Prod deploy on `v*` tags

## Branch Protections

- `main`, `release/*`: required checks, up-to-date with base, squash-only, restricted pushes
- (Optional) signed commits

## Hotfix & Rollback

- Create `hotfix/<desc>` from `main`
- Merge → `main`; cherry-pick to active `release/*` if needed
- Tag `vX.Y.Z` and deploy
- Rollback: revert commit or redeploy last known good tag

## Runbooks

- **Cut a release branch**: `git checkout -b release/<vX.Y.Z> && git push -u origin release/<vX.Y.Z>`
- **Tag a release**: `git tag vX.Y.Z && git push origin vX.Y.Z`
- **Cherry-pick**: `git cherry-pick <sha>`

## Appendix

- Glossary (Conventional Commits, SemVer, MTTR, etc.)
- Links to CI secrets and environment set-up
