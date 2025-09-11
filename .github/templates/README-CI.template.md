# CI/CD Overview

This repo enforces quality and safe releases via GitHub Actions.

## Pipelines

- **Branch Name Check**: Enforces regex for `feat/*`, `fix/*`, etc.
- **Build & Test**: Lint → Type check → Unit tests → Build.
- **Audit & Size**: Security audit (warn-only) + optional bundle size check.
- **Commitlint**: Validates Conventional Commits.
- **PR Preview**: Deploys ephemeral previews for pull requests.
- **Staging Deploy**: Push to `release/*` → staging deploy.
- **Production Release**: Tag `v*` → build, release notes, production deploy.

## Versioning & Releases

- **Conventional Commits** drive **SemVer**.
- Choose one:
  - **Changesets** (manual versioning + changelog)
  - **semantic-release** (automated)

## Hotfixes

- Branch from `main`: `hotfix/<desc>`
- Merge to `main`, cherry-pick to active `release/*` if pending
- Tag `vX.Y.Z` and deploy

## Required Secrets

- `${PREVIEW_PROVIDER}_TOKEN` (e.g., `VERCEL_TOKEN`, `NETLIFY_AUTH_TOKEN`, `RENDER_API_KEY`)
- `GH_TOKEN` (for releases) — _if using semantic-release_
- `NPM_TOKEN` (if publishing packages)
- Any provider-specific org/project IDs

> TODO: add provider commands & environment URLs in the workflow and strategy doc.
