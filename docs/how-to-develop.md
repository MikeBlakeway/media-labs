# How to develop — Media Labs

This document explains how to set up, run, debug, and contribute to Media Labs both locally and in GitHub Codespaces. It assumes you are working on the `development` branch and have Node.js 20+ available.

## Quick start (recommended)

1. Clone the repository and change into it:

```bash
git clone <repository-url>
cd media-labs
```

1. Enable Corepack and activate the pinned `pnpm` version (the repo pins `pnpm@10.15.0` in the root `package.json`):

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm -v
```

1. Install workspace dependencies from the repo root:

```bash
pnpm install
```

1. Copy environment examples for local development and the API:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

1. Start the monorepo in development (uses Turborepo to group logs):

```bash
pnpm run dev
```

Open the frontend at <http://localhost:3000> and the API at <http://localhost:4000> (defaults).

## Makefile & Scripts

The repository includes a `Makefile` and `scripts/dev.sh` for convenient development workflows:

### Using the Makefile

```bash
make setup      # Complete setup including env files and Prisma
make dev        # Start all development servers
make dev-ui     # Start only UI development server
make dev-api    # Start only API development server
make build      # Build all packages
make test       # Run tests across workspace
make lint       # Run linting across workspace
make clean      # Clean build artifacts
make docker     # Start with Docker Compose
make help       # Show all available commands
```

### Using the Development Script

```bash
./scripts/dev.sh setup    # Complete setup
./scripts/dev.sh dev      # Start development servers
./scripts/dev.sh build    # Build all packages
./scripts/dev.sh test     # Run tests
./scripts/dev.sh lint     # Run linting
./scripts/dev.sh clean    # Clean artifacts
./scripts/dev.sh help     # Show help
```

Both the Makefile and script automatically handle Corepack and pnpm@10.15.0 activation.

## Prerequisites

- Node.js 20+ (the CI/workflows target Node 20)
- Corepack (bundled with modern Node.js; used to activate the pinned `pnpm`)
- Docker & Docker Compose (optional — used by `docker-compose.yml` and pods)
- Git and a GitHub account for PRs

Optional but useful:

- VS Code with the Remote - Containers / Codespaces extension
- `pnpm` installed globally if you prefer (not required when using Corepack)

## Workspace layout (quick)

- `apps/ui` — Next.js frontend
- `apps/api` — Node/TypeScript API and Prisma schema
- `apps/worker` — background worker process
- `packages/shared` & `packages/sdk` — internal packages
- `pods/` — Docker pods for ComfyUI and fake GPU

## Running locally (detailed)

Run everything (recommended):

```bash
pnpm run dev
```

Run a single package (pnpm filtering):

```bash
# UI
pnpm --filter ./apps/ui dev

# API
pnpm --filter ./apps/api dev

# Worker
pnpm --filter ./apps/worker dev
```

Build & run for a single package:

```bash
pnpm --filter ./apps/ui build
pnpm --filter ./apps/ui start
```

Notes:

- `pnpm run dev` runs Turborepo which starts dev scripts in parallel and groups logs.
- Use the `--filter` flag for targeted work when you only need one service.

## Prisma (local development)

The repo includes Prisma tooling. For a lightweight local development flow we use SQLite by default (see `apps/api/.env.example`).

Generate Prisma client (required after installing or changing schema):

```bash
pnpm --filter ./apps/api run prisma:generate
```

Run local migrations (SQLite) and seed (if present):

```bash
pnpm --filter ./apps/api run prisma:migrate
pnpm --filter ./apps/api run prisma:seed
```

If a package requires native build scripts during `pnpm install` you may need to approve them locally:

```bash
pnpm approve-builds
```

Only run `prisma generate` or `prisma migrate` after you have a valid datasource configured in `apps/api/prisma/schema.prisma` and an appropriate `DATABASE_URL` in `apps/api/.env`.

## Docker & Docker Compose

You can use Docker Compose to run a minimal stack (API + pods). From repo root:

```bash
docker-compose up --build
```

Docker is helpful for pods (ComfyUI, fake GPU). The UI is often run locally for faster iteration.

## Devcontainer & GitHub Codespaces

The repository includes a complete devcontainer configuration for a reproducible development environment.

### Using Devcontainers (VS Code)

1. **Prerequisites**: Install VS Code with the "Remote - Containers" extension.
2. **Open in Container**: Open the repository in VS Code and click "Reopen in Container" when prompted.
3. **Automatic Setup**: The devcontainer will automatically:

   - Set up Node 20 with Corepack and pnpm@10.15.0
   - Install dependencies
   - Configure VS Code with recommended extensions and settings
   - Start optional services (Redis, MinIO, PostgreSQL)

4. **Start Development**: Once the container is ready, run:

```bash
make setup    # Complete setup with env files and Prisma
make dev      # Start all development servers
```

### Using GitHub Codespaces

1. Create a Codespace for the repository (GitHub UI -> Code -> Codespaces -> New codespace).
2. Wait for the container to build and dependencies to install.
3. The devcontainer will handle the Corepack/pnpm setup automatically.
4. Run the setup and development commands:

```bash
make setup    # Complete setup with env files and Prisma
make dev      # Start all development servers
```

### Devcontainer Services

The devcontainer includes optional services for local development:

- **Redis** (port 6379): For caching and session storage
- **MinIO** (ports 9000, 9001): S3-compatible local storage
- **PostgreSQL** (port 5432): Alternative to SQLite for development

Access MinIO console at `http://localhost:9001` (minioadmin/minioadmin123).

### macOS-Specific Notes

- **Docker Desktop**: Ensure Docker Desktop is installed and running
- **Apple Silicon**: For M1/M2 Macs, ensure Docker Desktop has Apple Silicon support enabled
- **Native Builds**: If you encounter native build issues, run `pnpm approve-builds`
- **Node.js**: Alternatively install Node.js 20+ locally with `brew install node`

Codespaces and devcontainers provide forwarded ports; use the VS Code port preview or the forwarded URLs to access the UI (3000) and API (4000).

## Debugging

Common debugging tasks and tips:

- Logs: use Turborepo's grouped logs from `pnpm run dev` to see per-package output.
- API logs: run `pnpm --filter ./apps/api dev` and inspect the terminal output.
- Inspect network: use browser devtools to verify requests from the UI to the API.
- Ports: default UI `3000`, API `4000` — change via env if needed.
- Node inspector: to attach a debugger, run the package with `--inspect` in the start script or use VS Code launch configs.

VS Code launch quick example (add to `.vscode/launch.json` for the API):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "pwa-node",
      "request": "launch",
      "name": "Launch API",
      "program": "${workspaceFolder}/apps/api/dist/index.js",
      "preLaunchTask": "tsc: build - apps/api",
      "cwd": "${workspaceFolder}/apps/api"
    }
  ]
}
```

Adjust `program`/`preLaunchTask` for your compiled output or run the TS directly with ts-node for faster iteration.

## Testing, linting, and type checking

Run tests/lint/typecheck across the workspace or per-package.

```bash
# workspace (if configured)
pnpm -w run lint
pnpm -w run typecheck

# per package
pnpm --filter ./apps/ui run lint
pnpm --filter ./apps/api run test
```

Add unit tests under each package and wire them into CI as needed.

## Contributing

Workflow suggestions:

1. Create a feature branch off `development` (or follow your branching policy):

```bash
git checkout -b feat/my-feature
```

1. Make small, focused commits. Run lint/test locally before pushing.

1. Push and open a pull request against `development` (or configured target branch).

1. Fill the PR description with what changed, why, and any manual test steps.

1. Address code review feedback and squash/rebase as appropriate.

Guidelines:

- Keep PRs small and focused.
- Run `pnpm install` and `pnpm run dev` locally to smoke test changes.
- Update `README.md` or package-level docs when behavior or scripts change.

## CI notes

- CI is configured to pin `pnpm` via Corepack and run installs with `--frozen-lockfile`.
- The GitHub Actions workflow targets Node 20.

## Troubleshooting

- pnpm install errors about native builds: run `pnpm approve-builds` and re-run install.
- Prisma errors about missing datasource: ensure `apps/api/prisma/schema.prisma` has a valid `datasource` and `apps/api/.env` provides `DATABASE_URL`.
- Port conflicts: change ports in `.env` or stop the conflicting process.
- If Turborepo caching behaves strangely, try `rm -rf .turbo && pnpm run build` to re-populate cache.

## Useful commands (cheat sheet)

```bash
# install
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install

# dev (all)
pnpm run dev

# dev (single package)
pnpm --filter ./apps/api dev

# prisma
pnpm --filter ./apps/api run prisma:generate
pnpm --filter ./apps/api run prisma:migrate

# approve native builds
pnpm approve-builds

# docker compose
docker-compose up --build
```
