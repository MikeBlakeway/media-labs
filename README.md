# Media Labs

Media Labs is a self-hosted, low-cost web application designed to generate short videos from images using open-source AI models. The application aims to provide a seamless user experience while keeping operational costs minimal.

## Project Structure

The project is organized into several key components:

- **apps/ui**: The frontend of the application built with Next.js, containing the main application logic, reusable components, custom hooks, and styles.
- **apps/api**: The backend API that handles requests, processes jobs, and interacts with the database.
- **apps/worker**: The worker service responsible for processing jobs and managing GPU resources.
- **packages/shared**: Contains shared types and client implementations used across different applications.
- **packages/sdk**: Intended for SDK implementation, providing client libraries or APIs for interacting with Media Labs services.
- **pods**: Contains Docker configurations for the ComfyUI video processing service and a fake GPU service for testing.
- **scripts**: Utility scripts for development and building the project.
- **prisma**: Contains the database schema and seeding logic for the application.
- **docker-compose.yml**: Defines the services and configurations for running the application stack using Docker Compose.

## Features

- Generate videos from images using AI models.
- Support for user-defined parameters such as video length, quality, and frame rate.
- Job management with status tracking and retry policies.
- Integration with ControlNet and LoRA for enhanced functionality.
- Lightweight dashboard for usage statistics and cost estimates.
- Parallel processing capabilities for video and audio tasks.

## Getting Started

To get started with the Media Labs project, follow these steps.

1. Clone the repository:

```bash
git clone <repository-url>
cd media-labs
```

1. Enable Corepack and activate the pinned pnpm version (recommended):

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate

# verify
pnpm -v
```

1. Install workspace dependencies from the repo root:

```bash
pnpm install
```

1. Copy environment examples and customize for your environment:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

1. Start the monorepo in development (recommended):

```bash
# turborepo groups logs and runs services in parallel
pnpm run dev
```

1. Visit the frontend at <http://localhost:3000> and the API at <http://localhost:4000> (defaults).

## Quick Development Scripts

For convenience, use the included Makefile or development script:

```bash
# Complete setup (env files, dependencies, Prisma)
make setup

# Start all development servers
make dev

# Build all packages
make build

# Or use the development script
./scripts/dev.sh setup
./scripts/dev.sh dev
```

Both automatically handle Corepack and pnpm@10.15.0 activation.

## Devcontainer & GitHub Codespaces

The repository includes a complete devcontainer configuration for reproducible development:

- **VS Code**: Use "Remote - Containers" extension and "Reopen in Container"
- **GitHub Codespaces**: Create a new codespace from the repository
- **Included Services**: Redis, MinIO (S3-compatible), PostgreSQL for local development

See [.devcontainer/README.md](.devcontainer/README.md) for detailed setup instructions.

## pnpm & Corepack

This repository uses pnpm workspaces and pins the pnpm version via the `packageManager` field in the root `package.json` (pnpm@10.15.0).

Use Corepack (recommended) to enable the pinned pnpm without installing it globally:

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm -v
```

If you don't want to use Corepack, install pnpm globally with npm or Homebrew instead.

## Running the monorepo with Turborepo

Turborepo is used to run and orchestrate local development tasks with better grouped logs and caching. The repo includes a `dev` script that runs `turbo` and grouping is enabled by default.

Recommended:

```bash
pnpm run dev   # runs turbo and starts apps in parallel with grouped logs
```

If you prefer to run a single package directly, use pnpm filtering:

```bash
pnpm --filter ./apps/ui dev
pnpm --filter ./apps/api dev
pnpm --filter ./apps/worker dev
```

## Turborepo remote cache (optional)

Turborepo can share build artifacts across machines and CI using a remote cache. This repo ships with a safe, disabled-by-default `remoteCache` in `turbo.json`.

To enable Vercel Remote Cache (recommended for teams):

1. Create a Vercel account and generate a Turbo token for your team.
2. In GitHub, add `TURBO_TOKEN` as a secret and `TURBO_TEAM` as a repository or organization variable.
3. In CI, set the env vars (or use the GitHub secrets) and then `pnpm run build` — turbo will read `TURBO_TOKEN`/`TURBO_TEAM` and use the remote cache.

Quick local commands to link and test:

```bash
# log in and link this repo to your Vercel remote cache (interactive)
pnpm dlx turbo login
pnpm dlx turbo link

# build and check cache usage (after linking)
pnpm run build

# delete local cache and confirm remote cache download on next run
rm -rf .turbo && pnpm run build
```

If you prefer a self-hosted remote cache, consult the Turborepo docs for `remoteCache.apiUrl` and `turbo link --api` for custom endpoints.

## FLF2V Integration Bootstrap

The repository includes automated GitHub project planning tools for the FLF2V (First-Last-Frame-to-Video) cloud mode implementation:

```bash
# Validate bootstrap data structure
pnpm run validate:flf2v

# Execute bootstrap automation (requires GITHUB_TOKEN)
GITHUB_TOKEN=<token> pnpm run bootstrap:flf2v
```

This auto-generates:
- **12 GitHub labels** for organization and tracking
- **5 milestones** with due dates for phased implementation
- **15 detailed issues** with tasks and acceptance criteria

See [docs/flf2v-bootstrap.md](docs/flf2v-bootstrap.md) for complete documentation.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
