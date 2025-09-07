# AGENTS.md - AI Agent Guide for Media Labs

## Project Overview

Media Labs is a modern monorepo combining a Next.js web application with a ComfyUI worker for AI-powered image generation. The project uses a professional workspace structure with comprehensive automation via Makefile.

## Repository Structure

```bash
media-labs/
├── AGENTS.md                    # This file - AI agent guidance
├── Makefile                     # Comprehensive automation commands
├── README.md                    # Main project documentation
├── package.json                 # Workspace root configuration
├── .env.example                 # Environment variable template
├── packages/
│   ├── web/                     # Next.js application (TypeScript, React 19, Tailwind)
│   └── worker/                  # ComfyUI worker (Python, Docker, RunPod)
├── tools/                       # Shared tooling configurations
├── docs/                        # All project documentation
├── scripts/                     # Development automation scripts
└── data/                        # Shared data and configurations
```

## Architecture Overview

### Web Application (`packages/web/`)

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5.x with strict mode
- **UI**: React 19.1.0 + Tailwind CSS 4.x
- **Validation**: Zod 4.1.5 for runtime schema validation
- **API Layer**: Next.js API routes acting as middleware to RunPod worker
- **Template System**: Workflow templates stored in `data/workflows/` with parameter patching

### Worker (`packages/worker/`)

- **Base**: ComfyUI serverless worker on RunPod platform
- **Runtime**: Python 3.12 with RunPod serverless framework
- **Models**: Downloaded at runtime from HuggingFace to S3 volume
- **Storage**: RunPod S3-compatible volume for models, Backblaze B2 for outputs
- **Deployment**: Docker images built locally and pushed to GitHub Container Registry

## Development Workflows

### Essential Commands

```bash
# Complete setup (run once)
make setup

# Daily development
make dev                    # Start all services
make dev-web               # Web app only
make dev-worker            # Worker only

# Building and deployment
make build                 # Build everything
make push                  # Build and push worker image
make deploy                # Full deployment pipeline

# Code quality
make lint                  # Lint all code
make format                # Format all code
make test                  # Run all tests

# Environment management
make env-check             # Verify environment variables
make env-setup             # Initialize environment from template
```

### Environment Variables

**Required for development:**

```bash
# RunPod Configuration
RUNPOD_API_KEY=your_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id

# RunPod S3 Volume
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key
RUNPOD_S3_ENDPOINT=https://volume_id.vol.runpod.net
RUNPOD_S3_REGION=us-east-1
RUNPOD_VOLUME_ID=your_volume_id

# Backblaze B2 (for output storage)
B2_S3_ACCESS_KEY_ID=your_b2_key
B2_S3_SECRET_ACCESS_KEY=your_b2_secret
B2_S3_ENDPOINT=your_b2_endpoint
B2_S3_BUCKET=your_b2_bucket

# Development
USE_LOCAL_WORKER=true              # Use local worker for development
LOCAL_WORKER_URL=http://localhost:8000
```

## Key Design Patterns

### Template-Based Workflows

- Workflows stored as JSON in `data/workflows/`
- Runtime parameter patching via API endpoints
- Zod schemas for validation (`src/lib/*.schema.ts`)
- Type inference for TypeScript safety

### Error Handling Pattern

```typescript
const parsed = Schema.safeParse(payload)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

### S3 Operations Pattern

```typescript
try {
  await s3Client.send(new HeadObjectCommand({ Bucket, Key }))
  return true
} catch (err) {
  // Defensive error parsing for S3-compatible providers
  if (err && typeof err === 'object') {
    const statusCode = err.$response?.statusCode || err.$metadata?.httpStatusCode
    if (statusCode === 404) return false
  }
  throw err
}
```

### API Route Structure

```typescript
export const runtime = 'nodejs' // Declare Node.js runtime

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    // Process request
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

## Testing Strategy

### Web Application Tests

- Unit tests for utility functions and schemas
- API route testing with mock requests
- Component testing with React Testing Library
- Integration tests for workflow execution

### Worker Tests

- Python unit tests in `packages/worker/tests/`
- Docker container integration tests
- S3 model loading validation
- RunPod handler functionality tests

### End-to-End Tests

- Full workflow execution from web UI to worker
- File upload and processing
- S3 storage verification

## Common Tasks for AI Agents

### Adding New Workflow Templates

1. Create workflow JSON in `data/workflows/`
2. Add to template registry in `src/lib/templates.fs.ts`
3. Update schema if needed in `src/lib/templates.schema.ts`
4. Test via preflight endpoint

### Adding New API Endpoints

1. Create in `src/app/api/` following existing patterns
2. Use Zod for request/response validation
3. Implement proper error handling
4. Add TypeScript types in `src/lib/`

### Updating Worker Configuration

1. Modify `packages/worker/Dockerfile` for image changes
2. Update `packages/worker/src/start.sh` for runtime behavior
3. Add environment variables to both `.env.example` and `Makefile`
4. Rebuild with `make build-worker`

### Adding Dependencies

```bash
# Web dependencies
make install-web PKG=package-name

# Worker Python dependencies
make install-worker PKG=package-name
```

## Deployment Process

### Local Development

1. `make setup` - Complete project setup
2. `make dev` - Start development servers
3. Worker runs in Docker with S3 volume mount
4. Web app proxies to local worker or RunPod endpoint

### Production Deployment

1. `make build` - Build all packages
2. `make push` - Push worker image to GHCR
3. Update RunPod template with new image
4. Deploy web app to hosting platform
5. `make env-check` - Verify production environment

## Troubleshooting Guide

### Common Issues

#### "Missing environment variable"

- Run `make env-check` to identify missing variables
- Copy from `.env.example` and fill in values

#### "Docker build fails"

- Check Docker is running: `docker version`
- Clear cache: `make clean`
- Rebuild: `make build-worker`

#### "Worker not responding"

- Check worker logs: `make logs`
- Verify S3 credentials: `make s3-check`
- Test local worker: `make dev-worker`

#### "Template not found"

- Verify template exists in `data/workflows/`
- Check template registry in `src/lib/templates.fs.ts`
- Validate JSON schema

### Debugging Commands

```bash
make logs                  # View all service logs
make shell-worker         # Open shell in worker container
make inspect-worker       # Inspect worker image contents
make health-check         # Check service health
make test-integration     # Run integration tests
```

## File Organization Conventions

### TypeScript Files

- **Schema files**: `*.schema.ts` - Zod schemas and validation
- **Type files**: `*.types.ts` - TypeScript interfaces
- **Utility files**: `*.ts` - Pure functions and business logic
- **API routes**: `src/app/api/*/route.ts` - Next.js API endpoints

### Python Files

- **Handler**: `packages/worker/handler.py` - RunPod serverless handler
- **Scripts**: `packages/worker/scripts/` - Utility scripts
- **Tests**: `packages/worker/tests/` - Python test files

### Configuration Files

- **Tools**: `tools/` - Shared ESLint, Prettier, TypeScript configs
- **Package configs**: Individual `package.json` files in packages
- **Environment**: `.env.example` template, `.env` for local development

## Security Considerations

### Environment Variable Management

- Never commit `.env` files to git
- Use server-side only for sensitive credentials
- Validate all environment variables at startup

### API Security

- Validate all inputs with Zod schemas
- Sanitize file names and paths
- Implement rate limiting for production
- Use HTTPS for all external communications

### Docker Security

- Use specific base image versions, not `latest`
- Run containers as non-root user when possible
- Keep dependencies updated via `make update`

## Performance Guidelines

### Web Application

- Use Next.js App Router for optimal performance
- Implement proper loading states for async operations
- Cache template data appropriately
- Optimize images and assets

### Worker

- Use runtime model loading vs baking into images
- Implement proper error handling and timeouts
- Monitor S3 operation performance
- Use appropriate Docker image sizes (runtime vs dev)

## Contributing Guidelines

### Code Style

- Run `make format` before committing
- Follow existing patterns in the codebase
- Add tests for new functionality
- Update documentation for significant changes

### Commit Messages

- Use conventional commit format
- Include scope: `feat(web):`, `fix(worker):`, etc.
- Reference issues when applicable

### Pull Request Process

1. Create feature branch from `development`
2. Implement changes with tests
3. Run `make lint && make test`
4. Update documentation if needed
5. Submit PR with clear description

This guide should provide AI agents with comprehensive understanding of the Media Labs project structure, development workflows, and best practices for contributing effectively.
