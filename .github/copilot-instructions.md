# GitHub Copilot Instructions — Media Lab

**ALWAYS follow these instructions first and fallback to additional search and context gathering only if the information here is incomplete or found to be in error.**

This is an experimental AI-powered media lab for generating and transforming images, video, and audio using open-source models. The repository is a monorepo using npm workspaces with a Next.js frontend and FastAPI backend.

## Working Effectively

### Bootstrap and Dependencies

Install all dependencies first:

```bash
cd /home/runner/work/media-lab/media-lab
npm install                              # Root dependencies (15 seconds)
cd apps/web && npm install              # Web dependencies (1 second)
cd ../../services/api && pip install -r requirements.txt  # API dependencies (9 seconds)
```

### Environment Setup

Copy environment files:

```bash
cp .env.example .env
# Web app .env is not needed yet (no .env.example exists)
```

Root `.env` controls API settings and artifact storage. Default values work for local development.

### Build Commands

Build the web application:

```bash
npm run build                           # Build from root (27 seconds)
# OR from apps/web directory:
cd apps/web && npm run build           # Build from web dir (20 seconds)
```

**NEVER CANCEL builds** - they complete in under 30 seconds. Set timeout to 60+ seconds minimum.

### Run Applications

**Development server:**

```bash
npm run dev                             # Start from root (2 seconds startup)
# App available at http://localhost:3000
```

**Production server:**

```bash
npm run build && npm run start         # Build first, then start production
# Must run build before start or it will fail
```

**API server (NOT IMPLEMENTED YET):**

```bash
cd services/api
# This will fail - no main.py or app files exist yet
uvicorn main:app --reload --port 8000   # DOES NOT WORK - API not implemented
```

### Quality Assurance Commands

**Linting and formatting:**

```bash
npm run lint                            # Lint web app + root (6 seconds)
npm run typecheck                       # TypeScript checking (3 seconds)
npm run format                          # Format all files (2 seconds)
npm run format:check                    # Check formatting (2 seconds)
```

**Testing:**

```bash
cd apps/web && npm run test            # Jest tests (no tests exist yet)
```

**NEVER CANCEL linting or testing** - all complete in under 10 seconds.

## Repository Structure

### Key Directories

```
/home/runner/work/media-lab/media-lab/
├── apps/web/              # Next.js 15 frontend (React 19)
├── services/api/          # FastAPI backend (PLACEHOLDER ONLY)
├── .github/               # GitHub workflows and templates
├── docs/                  # Documentation
└── package.json           # Root workspace configuration
```

### Important Files

- `package.json` (root) — Workspace manifest and proxy scripts
- `apps/web/package.json` — Web app dependencies and scripts
- `services/api/requirements.txt` — Python dependencies (implementation missing)
- `.github/workflows/copilot-setup-steps.yml` — Pre-install dependencies for Copilot
- `docs/how-to-develop.md` — Detailed development guide

## Validation Requirements

### Manual Testing Scenarios

**ALWAYS test the web application after making changes:**

1. Start dev server: `npm run dev`
2. Open <http://localhost:3000> in browser
3. Verify the Next.js welcome page loads correctly
4. Check console for any errors

**For production builds:**

1. Run `npm run build`
2. Run `npm run start`
3. Verify production app serves correctly

### Pre-commit Validation

**ALWAYS run before committing:**

```bash
npm run lint                            # Must pass
npm run typecheck                       # Must pass
npm run format:check                    # Must pass
npm run build                           # Must succeed
```

## Current Limitations

### What Works

- ✅ Frontend build, development, and production serving
- ✅ Linting, typechecking, and formatting
- ✅ npm workspace scripts from root directory
- ✅ Environment file setup
- ✅ GitHub workflows and Copilot pre-install

### What Doesn't Work

- ❌ **API service** - only requirements.txt exists, no Python implementation files
- ❌ **Docker environments** - referenced in docs but not implemented
- ❌ **Job management endpoints** - API not built yet
- ❌ **ComfyUI integration** - not implemented
- ❌ **Tests** - Jest configured but no test files exist

### Known Issues

- Running `npm run start` from root fails if build artifacts are missing
- API documentation references `uvicorn main:app` but `main.py` doesn't exist
- Docker Compose commands mentioned in docs will fail (no docker-compose.yml)

## Development Workflow

### For Frontend Changes

1. Make changes to files in `apps/web/src/`
2. Test with `npm run dev`
3. Run quality checks: `npm run lint && npm run typecheck`
4. Build to ensure no errors: `npm run build`
5. Test production build: `npm run start`

### For API Changes (When Implemented)

1. Create Python files in `services/api/`
2. Install dependencies: `pip install -r requirements.txt`
3. Test with: `uvicorn main:app --reload` (once main.py exists)
4. Add tests in `services/api/tests/`

### Common Commands Reference

| Command             | Directory | Time | Description              |
| ------------------- | --------- | ---- | ------------------------ |
| `npm install`       | root      | 15s  | Install all dependencies |
| `npm run build`     | root      | 27s  | Build web application    |
| `npm run dev`       | root      | 2s   | Start development server |
| `npm run lint`      | root      | 6s   | Lint code                |
| `npm run typecheck` | root      | 3s   | TypeScript checking      |
| `npm run format`    | root      | 2s   | Format all files         |

## Timeout Guidelines

**NEVER CANCEL builds or long-running commands**

- **Dependency installation:** Set 10+ minute timeout (actual: under 30 seconds)
- **Builds:** Set 5+ minute timeout (actual: under 30 seconds)
- **Linting/testing:** Set 2+ minute timeout (actual: under 10 seconds)
- **Development server startup:** Set 1+ minute timeout (actual: under 5 seconds)

## Technology Stack

### Frontend (apps/web)

- **Framework:** Next.js 15 with App Router
- **React:** Version 19
- **TypeScript:** Full type checking enabled
- **Styling:** TailwindCSS v4
- **Linting:** ESLint + Prettier
- **Testing:** Jest (configured, no tests yet)

### Backend (services/api)

- **Framework:** FastAPI (planned)
- **Python:** Version 3.12+
- **Server:** uvicorn with auto-reload
- **Status:** PLACEHOLDER ONLY - no implementation files exist

### Development Tools

- **Workspace:** npm workspaces for monorepo management
- **Git Hooks:** Husky + lint-staged for pre-commit checks
- **CI/CD:** GitHub Actions with Copilot pre-install workflow
- **Package Manager:** npm 11.5.2+, Node.js 20+

## Troubleshooting

### Build Failures

- **"No build cache found"** - Normal warning, can be ignored
- **"Could not find production build"** - Run `npm run build` first
- **"Module not found"** - Run `npm install` to install dependencies

### Development Server Issues

- **Port 3000 in use** - Stop existing processes or change port in next.config.ts
- **Import errors** - Check TypeScript compilation with `npm run typecheck`
- **CSS issues** - TailwindCSS v4 syntax may differ from older versions

### API Service Issues

- **"No module named 'main'"** - API implementation doesn't exist yet
- **Docker commands fail** - Docker setup not implemented despite documentation references
- **uvicorn command fails** - No FastAPI app exists yet

Remember: This project is in early development. Focus on frontend development and prepare for API implementation.
