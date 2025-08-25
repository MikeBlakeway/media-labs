# GitHub Copilot Instructions — Media Labs

ALWAYS follow these instructions first and fall back to additional search and repository context only if something here is incomplete or appears to be out of date.

This repository is a pnpm/Turborepo monorepo for a small media-labs project that produces short videos from images. It contains a Next.js frontend (`apps/ui`), a Node/TypeScript API (`apps/api`) with Prisma schema, and a background worker (`apps/worker`). The repo pins `pnpm@10.15.0` in the root `package.json` and targets Node 20 in CI.

## Goal for Copilot assist

- Help contributors bootstrap, develop, test, and create PRs that are small and well-tested.
- Keep changes compatible with the monorepo: use `pnpm` workspace filters and `turbo` when orchestrating multi-package tasks.
- Prefer non-destructive edits (don't refactor large areas) unless the change is explicitly requested.

## Routing for documentation checks

When a user asks to "check the most recent documentation", "fetch latest docs", "show current API docs", or similar, prefer the Context7 (MCP) documentation flow: resolve the Context7-compatible library ID for the target, fetch the latest documentation using the Context7 docs retriever, and provide a concise summary (3–6 bullets) with links to the relevant sections and suggested follow-ups. If the target library or repo is ambiguous, ask a clarifying question before calling the docs tools.

## Bootstrap and dependencies (trusted sequence)

Always prefer Corepack to activate the pinned pnpm version. Example sequence (run from repo root):

```bash
git clone <repo-url>
cd media-labs
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm -v
pnpm install
```

Notes:

- The repo uses a workspace layout. Installing from the root will install all workspace packages.
- Some native modules (sharp, prisma engines, etc.) may require `pnpm approve-builds` in CI or locally during interactive runs. If `pnpm install` fails with a native build warning, run `pnpm approve-builds` to allow their postinstall steps.

## Environment files

Copy and customize env files for local development:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Only put non-secret example values in repo files. For real secrets use GitHub Secrets or local keychain.

## Quick dev commands

- Start all services (recommended, Turborepo groups logs):

```bash
pnpm run dev
```

- Run a single package:

```bash
pnpm --filter ./apps/ui dev
pnpm --filter ./apps/api dev
pnpm --filter ./apps/worker dev
```

- Build workspace:

```bash
pnpm run build
```

## Prisma notes

- Runtime package: `@prisma/client`
- CLI package: `prisma` (devDependency)

Generate Prisma client after schema changes or installs:

```bash
pnpm --filter ./apps/api run prisma:generate
```

Run local migrations (if using SQLite locally):

```bash
pnpm --filter ./apps/api run prisma:migrate
pnpm --filter ./apps/api run prisma:seed
```

In CI we attempt a best-effort `prisma:generate` step; if you need strict behaviour for production builds, configure CI to set `DATABASE_URL` and fail the build on generation errors.

## Codespaces / devcontainer

If the repo provides a devcontainer or you use Codespaces, the sequence is the same. Prefer running Corepack in the Codespace to activate the pinned pnpm before `pnpm install`.

## CI expectations

- CI uses Node 20 and prepares the pinned pnpm via Corepack.
- CI runs `pnpm install --frozen-lockfile`, runs lint, tests, and then `pnpm run build` across the workspace.
- Turborepo cache and pnpm store are cached in CI for speed.

## Testing and QA (always run before PR)

Before opening a PR run these locally and include results in the PR description where relevant:

```bash
pnpm install
pnpm run lint
pnpm run test
pnpm run build
```

- If you changed Prisma schema, run `pnpm --filter ./apps/api run prisma:generate` and include generated client diffs if any.

## Recommended PR workflow

1. Branch from `development` for features.
2. Keep PRs small and focused; include a short description and manual test steps.
3. Run lint/tests/build locally and fix issues before pushing.
4. Include screenshots or short videos for UI changes where applicable.
5. Tag reviewers and request a review.

## Project structure (short)

```bash
media-labs/
├─ apps/
│  ├─ ui/        # Next.js frontend
  │  ├─ api/       # Node API + Prisma
  │  └─ worker/    # background worker
├─ packages/      # shared packages
├─ pods/          # dockerized helper services (comfyui, fake-gpu)
├─ .github/       # workflows and copilot instructions
├─ docs/          # developer docs
```

## Useful commands cheat-sheet

```bash
# activate pinned pnpm
corepack enable
corepack prepare pnpm@10.15.0 --activate

# install
pnpm install

# dev (all)
pnpm run dev

# dev (single package)
pnpm --filter ./apps/api dev

# build
pnpm run build

# prisma
pnpm --filter ./apps/api run prisma:generate
pnpm --filter ./apps/api run prisma:migrate

# approve interactive native builds
pnpm approve-builds
```

## Issue templates and prompts

Use the repository `/.github/ISSUE_TEMPLATE/` templates when opening issues — they capture required context, reproduction steps, and labels the project expects. When creating issues programmatically or via AI-assisted prompts, prefer using the canonical templates as a base.

The `/prompts/` folder contains useful prompt templates for automation tasks, PR description generation, and developer-onboarding messages — use them as examples and copy/edit only when appropriate.

Refer to these locations for consistent issue and PR content:

- `/.github/ISSUE_TEMPLATE/`
- `/prompts/`

## Commit message style — Conventional Commits

All commits should follow Conventional Commits (https://www.conventionalcommits.org/) so tooling can auto-generate changelogs and the changelist is consistent.

Common types:

- `feat:` — a new feature
- `fix:` — a bug fix
- `chore:` — changes to build process or auxiliary tools
- `docs:` — documentation only changes
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests

Examples:

```
feat(ui): add responsive header with theme toggle
fix(api): handle missing user gracefully on /me endpoint
docs: update contributing guide and README
chore: bump pnpm and add turbo config
```

Quick local check (lightweight):

```bash
# show last commit and check format roughly with a regex
git log -1 --pretty=%B | grep -E "^(feat|fix|chore|docs|refactor|test)(\(.+\))?: .+" || echo "WARNING: commit message doesn't match Conventional Commits"
```

For stronger enforcement, add `commitlint` + `husky` in the repo and configure a pre-commit/pre-push hook to block commits that don't match the style.

## Known limitations & troubleshooting

- API implementation may be minimal; check `apps/api` for schema and server code before assuming endpoints exist.
- If `pnpm install` reports native build scripts, run `pnpm approve-builds` interactively or pre-approve in CI.
- If Prisma complains about missing datasource: ensure `apps/api/prisma/schema.prisma` exists and `apps/api/.env` defines `DATABASE_URL`.
- If Turborepo cache causes stale builds, run `rm -rf .turbo && pnpm run build` locally.

## Timing & timeouts (guidance for runners)

- Dependency install: allow 10+ minutes (network + native builds)
- Build: allow 5+ minutes per workspace (depends on package size)
- Tests/lint: allow 2+ minutes

## When to ask for more context

- If a requested change touches multiple packages and tests fail, ask for a small repro and which package is the source-of-truth for versions.
- If CI fails on platform-specific native modules (sharp/prisma engines), request the OS/runner logs.

---

End of Copilot instructions.
