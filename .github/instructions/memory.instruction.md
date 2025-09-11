---
applyTo: '**'
---

# User Memory

## User Preferences

- Programming languages: TypeScript, Python
- Code style preferences: Strict TypeScript, hooks-first architecture, Zod validation, Conventional Commits
- Development environment: macOS, VS Code, Node 20+, Next.js 15
- Communication style: Concise, action-oriented; prefer automation and documentation-first

## Project Context

- Current project type: Next.js web app with serverless workers and a Python volume-worker
- Tech stack: Next.js 15, React 19, TypeScript 5, Jest 29, Zod 4, AWS SDK v3, Tailwind 4
- Architecture patterns: App Router, hooks-based, S3-backed storage, serverless integration
- Key requirements: Maintainability, CI quality gates (lint, types, tests, build), secure S3 handling, staging/prod deploys

## Coding Patterns

- Prefer short-lived feature branches; squash merges
- Zod-first validation and strict TypeScript
- Unit tests via Jest; Python worker via Makefile tests
- Documentation-first with README and docs under `docs/`

## Context7 Research History

- Libraries researched: commitlint (Conventional Commits), semantic-release, Changesets
- Best practices: Enforce Conventional Commits via commitlint; automate releases with semantic-release or Changesets; protect `main` and `release/*` branches; use tags `vX.Y.Z` for immutable releases
- Implementation patterns: GitHub Actions with branch regex, commitlint action, Node setup cache, type-check/test/build gates, optional preview/staging/prod deploys
- Version-specific findings: Use Node 20.x runners; actions/checkout@v4 and actions/setup-node@v4

## Conversation History

- Decision to implement a formal branching & release strategy with CI enforcement
- Default cadence: weekly release branches, staging on `release/*`, production on `v*` tags
- Choose semantic-release configuration file; keep flexibility in CI to toggle between semantic-release and Changesets

## Notes

- TODO: Confirm preview provider (Vercel/Netlify/Render) and staging/prod deploy commands
- TODO: Add secrets for PREVIEW/STAGING/PROD tokens; NPM_TOKEN and GH_TOKEN for releases if publishing packages

### Session Progress (Release Strategy)

- Created docs: `docs/branching-release-strategy.md`, `docs/README-CI.md`
- Added commitlint config and semantic-release config
- Patched CI to enforce branch names, commitlint, type-check/build, staging on `release/*`, prod on `v*`
