# API Documentation for Media Labs

## Overview

The Media Labs API is designed to facilitate the generation of videos from images using open-source AI models. This API serves as the backend for the Media Labs web application, handling requests, processing jobs, and managing interactions with the database and GPU resources.

## Directory Structure

The API is organized as follows:

```bash
apps/api/
├── src/
│   ├── index.ts          # Entry point for the API application
│   ├── controllers/      # Contains business logic for handling requests
│   ├── routes/           # Defines API routes and their handlers
│   ├── services/         # Encapsulates business logic and data interactions
│   └── utils/            # Utility functions for common tasks
├── prisma/
│   └── schema.prisma     # Database schema definition for Prisma
├── package.json           # Configuration file for the API application
├── tsconfig.json          # TypeScript configuration for the API application
└── README.md              # Documentation for the API application
```

## Getting started (local)

Prerequisites:

- Node.js 20+ (the monorepo's CI uses Node 20)
- pnpm (recommended) — the repo pins pnpm via the `packageManager` field

Install and prepare the workspace from the repo root:

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

The API ships helper scripts for Prisma in `package.json` (generate/migrate/seed/studio). For a lightweight local dev experience we default to SQLite using `DATABASE_URL` in `apps/api/.env.example`.

Create a local env and generate the client:

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter ./apps/api run prisma:generate
```

If you want to create and apply local migrations (SQLite):

```bash
pnpm --filter ./apps/api run prisma:migrate
pnpm --filter ./apps/api run prisma:seed
```

### Running the API

Recommended: run the monorepo dev script from the repo root (uses Turborepo to group logs):

```bash
pnpm run dev
```

Or run just the API package using pnpm filtering:

```bash
pnpm --filter ./apps/api dev
```

Default local port: `http://localhost:4000`.

## API Endpoints

### Job Management

- **Create Job**

  - `POST /api/jobs`
  - Description: Submits a new job for processing.

- **Get Job Status**
  - `GET /api/jobs/:id`
  - Description: Retrieves the status of a specific job.

### LoRA Management

- **List LoRAs**

  - `GET /api/loras`
  - Description: Retrieves a list of available LoRAs.

- **Upload LoRA**
  - `POST /api/loras/upload`
  - Description: Allows users to upload their own LoRAs for processing.

## Contributing

Contributions to the Media Labs API are welcome! Please follow the standard Git workflow for submitting changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
