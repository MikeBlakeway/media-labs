# Media Labs Web Application

Welcome to the Media Labs web application! This project is designed to generate short videos from images using open-source AI models. Below you will find setup instructions, usage guidelines, and other relevant information to help you get started.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development](#development)
4. [Deployment](#deployment)
5. [Contributing](#contributing)
6. [License](#license)

## Getting Started

To get started with the Media Labs web application, follow these steps:

### Prerequisites

- Node.js 20+
- pnpm (recommended) — the repo pins pnpm via `packageManager` in the root `package.json`
- Docker (optional)

### Installation

From the repo root use Corepack to activate the pinned pnpm and install all workspace dependencies:

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

Copy environment examples for local development:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

## Project Structure

The project is organized as follows:

```bash
/media-labs
├── apps
│   ├── ui               # Frontend application
│   │   ├── src           # Source files for the UI app
│   │   ├── package.json   # UI app dependencies and scripts
│   │   ├── tsconfig.json  # TypeScript configuration
│   │   └── next.config.mjs # Next.js configuration
│   ├── api               # API application
│   └── worker            # Background worker for processing jobs
├── packages              # Shared packages and SDK
├── pods                  # Docker containers for services
├── scripts               # Utility scripts for development and build
├── prisma                # Database schema and seeding
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # Root project documentation
```

## Development

Recommended: run the monorepo dev script from the repo root (uses Turborepo for grouped logs):

```bash
pnpm run dev
```

Or run only the UI package via pnpm filtering:

```bash
pnpm --filter ./apps/ui dev
```

The UI will be available at <http://localhost:3000> by default.

## Deployment

Build and start from the package or via the workspace scripts:

```bash
pnpm --filter ./apps/ui build
pnpm --filter ./apps/ui start
```

Ensure production environment variables are set (e.g., `DATABASE_URL`, `NODE_ENV=production`).

## Contributing

We welcome contributions! Please follow the standard GitHub workflow:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push your branch and create a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
