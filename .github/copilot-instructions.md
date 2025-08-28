# GitHub Copilot Instructions — Media Labs

ALWAYS follow these instructions first and fall back to additional search and repository context only if something here is incomplete or appears to be out of date.

This repository is a pnpm/Turborepo monorepo for a small media-labs project that produces short videos from images. It contains a Next.js frontend (`apps/ui`), a Node/TypeScript API (`apps/api`) with Prisma schema, and a background worker (`apps/worker`). The repo pins `pnpm@10.15.0` in the root `package.json` and targets Node 20 in CI.

## Goal for Copilot assist

- Help contributors bootstrap, develop, test, and create PRs that are small and well-tested.
- Keep changes compatible with the monorepo: use `pnpm` workspace filters and `turbo` when orchestrating multi-package tasks.
- Prefer non-destructive edits (don't refactor large areas) unless the change is explicitly requested.

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

**TIMING:** Install takes ~30 seconds. NEVER CANCEL - Set timeout to 60+ seconds for safety.

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

**TIMING:** Dev servers start in ~10 seconds. NEVER CANCEL - Set timeout to 60+ seconds.

- Run a single package:

```bash
pnpm --filter ./apps/ui dev      # Next.js UI on localhost:3000
pnpm --filter ./apps/api dev     # Express API on localhost:4000
pnpm --filter ./apps/worker dev  # Background worker
```

- Build workspace:

```bash
pnpm run build
```

**TIMING:** Full build takes ~30 seconds. NEVER CANCEL - Set timeout to 120+ seconds.

## Prisma notes

- Runtime package: `@prisma/client`
- CLI package: `prisma` (devDependency)

Generate Prisma client after schema changes or installs:

```bash
pnpm --filter ./apps/api run prisma:generate
```

**TIMING:** Prisma generation takes ~3 seconds. NEVER CANCEL - Set timeout to 30+ seconds.

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
pnpm run lint    # ~5 seconds - NEVER CANCEL, timeout 60+ seconds
pnpm run test    # ~5 seconds - NEVER CANCEL, timeout 60+ seconds
pnpm run build   # ~30 seconds - NEVER CANCEL, timeout 120+ seconds
```

- If you changed Prisma schema, run `pnpm --filter ./apps/api run prisma:generate` and include generated client diffs if any.

## Validation scenarios

**ALWAYS test actual functionality after making changes:**

1. **API functionality test:**

```bash
# Start API dev server
pnpm --filter ./apps/api dev
# In another terminal, test the health endpoint
curl http://localhost:4000/_health
# Should return: {"ok":true}
```

2. **UI functionality test:**

```bash
# Start UI dev server
pnpm --filter ./apps/ui dev
# Test the frontend responds
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK
```

3. **Full build validation:**

```bash
pnpm run build
# Verify no build errors and all packages compile successfully

## Terminal usage for long-running processes

When running continuous or long-lived processes (dev servers, watchers, or background services), always open a separate terminal for each long-running command.

- Start servers or watch processes in their own terminals (for example, one terminal for `pnpm --filter ./apps/ui dev`, another for `pnpm --filter ./apps/api dev`).
- Do not reuse a terminal running a continuous process to run follow-up commands like commits, tests, or other interactive steps — the terminal may be blocked or non-interactive.
- When automating via scripts, if a command starts a server in the foreground, explicitly spawn it in the background or use a separate terminal session.

This avoids situations where Copilot (or contributors) attempts to run further commands in a terminal that's already occupied by a running process.
```

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

- **Docker limitations:** `docker-compose.yml` exists but main apps (ui/api/worker) lack Dockerfiles. Use `pnpm run dev` for local development instead.
- API implementation may be minimal; check `apps/api` for schema and server code before assuming endpoints exist.
- If `pnpm install` reports native build scripts, run `pnpm approve-builds` interactively or pre-approve in CI.
- If Prisma complains about missing datasource: ensure `apps/api/prisma/schema.prisma` exists and `apps/api/.env` defines `DATABASE_URL`.
- If Turborepo cache causes stale builds, run `rm -rf .turbo && pnpm run build` locally.
- **Turbo dev output:** `pnpm run dev` may primarily show worker output due to Turborepo grouping. Individual dev servers work fine.

## Timing & timeouts (guidance for runners)

**CRITICAL: Always use these timeout values to prevent premature cancellation:**

- **Dependency install:** 60+ seconds (tested: ~30 seconds actual)
- **Build:** 120+ seconds (tested: ~30 seconds actual)
- **Tests/lint:** 60+ seconds (tested: ~5 seconds actual)
- **Prisma generation:** 30+ seconds (tested: ~3 seconds actual)
- **Dev server startup:** 60+ seconds (tested: ~10 seconds actual)

**NEVER CANCEL operations before these timeouts!** The tested times are much faster than the safety margins.

## When to ask for more context

- If a requested change touches multiple packages and tests fail, ask for a small repro and which package is the source-of-truth for versions.
- If CI fails on platform-specific native modules (sharp/prisma engines), request the OS/runner logs.

---

## Documentation index — required reading for Copilot

Before beginning any development work, Copilot MUST read and follow the repository documentation listed below. Insist that the human requester confirms which document is the source-of-truth if there is any ambiguity. If a document contains explicit instructions (coding conventions, PR process, environment setup, or migration steps), follow those instructions before making code changes.

Required documents (read fully, in roughly this order):

- `README.md` (project root) — high-level project overview and quick start
- `docs/how-to-develop.md` — developer onboarding and local dev guidance
- `docs/requirements.md` — project requirements and acceptance criteria
- `docs/epics.md` — product epics and feature context
- `docs/api-audio-jobs.md` — API design and audio job schema details
- `docs/api-audio-jobs-testing.md` — integration test notes and manual test steps
- `docs/flf2v-bootstrap.md` — additional setup or bootstrap instructions

Package-level and contextual READMEs and guides (review as relevant to the task):

- `apps/api/README.md`
- `apps/ui/README.md`
- `apps/worker/README.md`
- `.devcontainer/README.md`
- `pods/comfyui-video/README.md`
- `pods/fake-gpu/README.md`

Related automation and contribution guidance (review when changing workflows, CI, or PRs):

- `.github/ISSUE_TEMPLATE/` (bug_report.md, feature_request.md, pull_request_template.md)
- `.github/prompts/commit_message.prompt.md`
- `.github/prompts/pull_request.prompt.md`
- `.github/instructions/context7.instructions.md`
- `.github/copilot-model-rules.json`
- `.github/instructions/commit-message.instructions.md`

Update the index when new documentation is added. If you (Copilot) detect that a required document is missing or out-of-date for the requested task, stop and request clarification from the human before proceeding.

End of Copilot instructions.

## Keeping these Copilot instructions in sync

The `/.github/copilot-instructions.md` file is the single source-of-truth for how Copilot should behave in this repository. Maintainers and Copilot must follow these rules:

- Whenever new documentation is added to the repository (for example a new file under `docs/`, a package README, or a new `.github/instructions/*` file), update `/.github/copilot-instructions.md` to include the new document in the Documentation index before treating the documentation-related task as complete.
- Copilot MUST verify that `/.github/copilot-instructions.md` references any newly added docs and, if it does not, pause and ask the human to either (a) confirm the new doc should be added to the index, or (b) provide the canonical source-of-truth to reference.
- When a document in the Documentation index contains specific procedural instructions (for setup, migrations, coding conventions, or CI), Copilot must follow those procedures exactly for tasks that affect the areas covered by those documents.

If you are unsure whether a document should be indexed, ask the human for clarification before proceeding.

## No automatic commits or pushes

Copilot MUST NEVER stage, commit, or push changes to the repository unless the human explicitly and unambiguously requests that action in the chat. In addition, Copilot MUST NOT offer to run `git commit`, `git push`, or similar commands, and MUST NOT present options that would automatically execute those commands without explicit confirmation.

Hard rules (enforced):

- Do not stage or commit changes automatically. Do not run any git command that changes repository state without an explicit, separate human instruction to do so.
- Do not offer or suggest running `git commit` / `git push` as part of a normal reply or as an automated follow-up action. If the user asks for a commit message, only provide a suggested message (and, optionally, the exact git commands to run) — do not run them.
- If the user requests a commit, present the proposed commit message and the exact shell commands that will be run (for example, `git add <files>`; `git commit -m "..."`; `git push origin <branch>`). Then wait for an explicit confirmation to execute those commands.
- When generating patches or file edits, provide the patch/diff and wait for explicit user approval before staging or committing anything.
- If the user asks Copilot to run background asynchronous agents that may create PRs (for example using the `#github-pull-request_copilot-coding-agent` hashtag), Copilot may proceed only under that explicit instruction and within the agent's documented scoping rules.

Behavior expectations:

- If a local operation would open a long-running process (server, watcher), do not simultaneously attempt to commit or run any other interactive commands in the same terminal — open a new terminal instead.
- If Copilot arrives in a state where files are edited but not committed, present a concise summary of the changes and wait for the user's explicit instruction to stage/commit/push.

These restrictions prevent accidental repository state changes and ensure maintainers retain control over commits and pushes.
