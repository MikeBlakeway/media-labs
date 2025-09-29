# AGENTS.md - AI Agent Guide for Media Labs

## Project Overview

Media Labs is a Next.js web application for AI-powered image generation using RunPod's hosted ComfyUI serverless endpoints. The project uses a simplified single-repository structure with automation via Makefile.

## Repository Structure

```bash
media-labs/
├── AGENTS.md                    # This file - AI agent guidance
├── Makefile                     # Development automation commands
├── README.md                    # Main project documentation
├── package.json                 # Next.js application configuration
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── postcss.config.mjs           # PostCSS configuration (TailwindCSS v4)
├── .env.example                 # Environment variable template
├── src/                         # Next.js application source code
│   ├── app/                     # App Router (pages and API routes)
│   ├── components/              # UI components (23 components)
│   ├── hooks/                   # Custom hooks (22 hooks)
│   └── lib/                     # Utilities and libraries
├── public/                      # Static assets
├── docs/                        # Project documentation
├── data/                        # Workflow templates
├── release/                     # Release documentation and notes
│   ├── docs/                    # Release process documentation
│   └── notes/                   # Individual release notes ({version}.release.md)
├── workers/                     # Worker implementations
│   ├── volume-worker/           # S3 volume management and model operations
│   └── multi-model-worker/      # Multi-modal AI inference worker
└── .github/                     # GitHub configuration and AI prompts
```

## Architecture Overview

### Hooks-Based Architecture

The application has been **fully refactored** into a comprehensive hooks-based architecture:

- **21 Custom Hooks**: All business logic extracted into focused, reusable hooks
- **22 UI Components**: Pure presentation components that consume hooks
- **Complete Separation**: Clear boundaries between logic (hooks) and presentation (components)
- **100% Consistency**: All async operations (fetch calls) organized into hooks

#### Hook Categories

##### Workflow Management

- `useWorkflowTemplate` - Template loading and metadata management
- `useWorkflowsList` - Workflow list fetching with error handling
- `useWorkflowRegistration` - Workflow registration with validation
- `useWorkflowManagement` - CRUD operations for workflows
- `useWorkflowEditor` - Workflow editing state management

##### Job & Execution

- `useJobManagement` - Job submission, polling, and result management
- `useWorkflowRunnerJob` - Job-specific execution and status tracking
- `useEnhancedPolling` - Robust polling with retry logic

##### Form & UI

- `useWorkflowForm` - Form state management and validation
- `useFieldLabeling` - Enhanced field labeling for workflows
- `useFileUpload` - File upload functionality
- `useUploadCard` - Upload card specific state management

##### Utility & Specialized

- `useManualPreflight` - Model preflight checks
- `useWorkflowPreflight` - Workflow-specific preflight validation
- `useResultHistory` - Result history management with filtering
- `useProgressCalculation` - Progress calculation utilities
- `useProgressTimer` - Progress timing functionality
- `useOutputProcessor` - Output processing logic
- `useResultsDisplay` - Results display state management

### Next.js Web Application

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5.x with strict mode
- **UI**: React 19.1.0 + Tailwind CSS 4.x
- **Validation**: Zod 4.1.5 for runtime schema validation
- **API Layer**: Next.js API routes acting as middleware to RunPod ComfyUI endpoints
- **Template System**: Workflow templates stored in `data/workflows/` with parameter patching

### RunPod Integration

- **Endpoint**: Hosted ComfyUI serverless endpoints on RunPod
- **Models**: Pre-configured on RunPod infrastructure
- **Execution**: Direct API calls to RunPod endpoints
- **Storage**: Optional S3 volume for custom models/assets

## Development Workflows

### Essential Commands

```bash
# Complete setup (run once)
make setup

# Daily development
make dev                    # Start web application

# Building and deployment
make build                 # Build web application
make deploy                # Prepare for deployment

# Code quality
make lint                  # Lint code
make format                # Format code
make test                  # Run tests

# Environment management
make env-check             # Verify environment variables
```

### Environment Variables

**Required for development:**

```bash
# RunPod Configuration
RUNPOD_API_KEY=your_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id

# Optional: Local development worker
USE_LOCAL_WORKER=false
LOCAL_WORKER_URL=http://localhost:8000
```

**Optional (for custom model uploads and storage):**

```bash
# RunPod S3 Volume (optional)
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key
RUNPOD_S3_ENDPOINT=https://volume_id.vol.runpod.net
RUNPOD_S3_REGION=us-east-1
RUNPOD_VOLUME_ID=your_volume_id

# Backblaze B2 (optional - for output storage)
BUCKET_ACCESS_KEY_ID=your_b2_key
BUCKET_SECRET_ACCESS_KEY=your_b2_secret
BUCKET_ENDPOINT_URL=your_b2_endpoint
BUCKET_NAME=your_b2_bucket
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

### RunPod Integration Pattern

```typescript
import { runSync, runAsync } from '@/lib/runpod'

// For quick workflows (< 20MB)
const result = await runSync({ workflow })

// For larger workflows or async processing
const { id } = await runAsync({ workflow })
// Poll status with: await getStatus(id)
```

### S3 Operations Pattern (Optional)

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

### Creating Test Scripts

When creating temporary test scripts for debugging or development:

1. **Location**: All test scripts must be placed in `scripts/test/`
2. **Language**: All test scripts must be written in TypeScript (`.ts` extension)
3. **Naming**: Use descriptive names with `test-` prefix: `test-feature-name.ts`
4. **Cleanup**: Remove temporary test scripts once they are no longer needed
5. **Documentation**: Useful ongoing scripts should be documented in `scripts/README.md`

#### Execution Pattern

```bash
# Execute test scripts from project root
npx tsx scripts/test/test-example.ts
```

#### File Organization

```text
scripts/
├── README.md           # Script documentation (must be maintained)
├── test/              # Temporary test scripts directory
│   ├── test-api.ts    # Example test script
│   └── test-feature.ts # Another test script
├── deploy.sh          # Production deployment script
└── validate-workflows.ts # Production validation script
```

#### Documentation Requirements

- Always check if `scripts/README.md` exists before creating it
- Update the README when adding useful scripts for ongoing debugging
- Document script purpose, usage, and cleanup status
- Follow established markdown formatting standards

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

## Video Workflow Support

### Overview

The Media Labs application now supports workflows that generate video outputs. This enhancement includes the following updates:

- **New Components**:

  - `VideoPlayer.tsx`: A robust video player for rendering video outputs.
  - `MediaDisplay.tsx`: A unified component for displaying both images and videos.

- **Updated Hooks**:

  - `useWorkflowOutputType`: Determines the output type (image or video) for a given workflow.

- **Workflow Templates**:
  - Example video workflow templates are stored in `data/workflows/`.

### Development Workflow

1. **Adding Video Workflows**:

   - Create a new JSON file in `data/workflows/`.
   - Ensure the `outputType` field is set to `video`.
   - Validate the workflow using the preflight endpoint.

2. **Testing Video Components**:

   - Unit tests for `VideoPlayer.tsx` are located in `src/components/__tests__/`.
   - Integration tests ensure proper rendering of video workflows.

3. **Updating Documentation**:
   - Update relevant sections in `AGENTS.md` and `.github/copilot-instructions.md`.

### Key Commands

```bash
# Run tests for video components
make test

# Validate video workflow templates
make validate-workflows
```

## Story Management Requirements

### Mandatory Story Documentation Process

When working on any story from the `/docs/stories/` folder, AI assistants must follow this comprehensive process:

1. **Story Progress Tracking**:

   - Always update the story document checklist items as tasks are completed
   - Mark each checklist item with `[x]` when completed
   - Update both "Inspect and modify", "Tests", and "General" sections
   - Mark all "Definition of Done" criteria when satisfied

2. **Comprehensive Work Summary**:

   - Add a detailed "Summary of Work Completed" section at the end of each story document
   - Include overview of all completed tasks with specific details
   - Document directory structures created, files implemented, and test results
   - Provide architectural alignment notes and integration points
   - List key implementation highlights and deliverables
   - Include validation results (test passes, functionality confirmation)
   - Note current status and readiness for next phases

3. **Documentation Structure Requirements**:

   ```markdown
   ## Summary of Work Completed

   ### Overview

   [Brief summary of story completion and date]

   ### [Component] Implementation

   [Detailed breakdown of each major component]

   ### Key Implementation Highlights

   [Important technical details and achievements]

   ### Test Results / Validation

   [Comprehensive test results and verification]

   ### Architectural Alignment

   [Integration with existing systems and patterns]

   ### Foundation for Next Phases

   [What this enables for subsequent work]

   ### Quality Metrics

   [Coverage, standards compliance, deliverables]

   ### Deliverables Summary

   [Final checklist of all completed items]

   **Status**: **COMPLETE** ✅
   **Next Phase**: [Clear identification of follow-up work]
   **Foundation Quality**: [Assessment of readiness]
   ```

4. **Story Completion Verification**:
   - Ensure all acceptance criteria are explicitly addressed
   - Verify all checklist items are marked complete
   - Confirm all Definition of Done criteria are satisfied
   - Validate that the work summary is comprehensive and accurate

### Agentic Documentation Maintenance

AI assistants must maintain agentic worker-focused documents continuously:

1. **AGENTS.md Files**:

   - Update worker-specific AGENTS.md files with new patterns, requirements, and guidelines
   - Add implementation patterns and development workflows as they are established
   - Document quality standards and integration points
   - Keep current status and phase information up to date
   - Add new rules for AI agents as patterns emerge

2. **Copilot-Instructions.md**:

   - Update architecture overviews when new components are added
   - Add new code patterns and conventions as they are established
   - Update technology versions and dependencies when changed
   - Maintain current project structure and file organization patterns
   - Add new error handling patterns and best practices

3. **Documentation Consistency**:
   - Ensure all agentic documents are synchronized with current project state
   - Cross-reference between documents for consistency
   - Update examples and code snippets to reflect current implementation
   - Maintain alignment between worker-specific and project-wide guidance

### Enforcement Standards

1. **Every Story Session**:

   - Must begin by reading the story document and understanding requirements
   - Must update checklist progress as work proceeds
   - Must complete comprehensive work summary before session end
   - Must update relevant agentic documentation with new patterns

2. **Documentation Quality**:

   - Work summaries must be detailed and comprehensive
   - Technical details must be specific and actionable
   - Status indicators must be accurate and clear
   - Integration notes must be complete and helpful for future work

3. **Continuous Maintenance**:
   - Agentic documents must reflect current project state at all times
   - New patterns and requirements must be documented immediately
   - Cross-references between documents must be maintained
   - Examples and code snippets must be kept current

## Mandatory Documentation Review

### AI Assistant Standards

To ensure all changes and tasks align with project standards and requirements, AI assistants must adhere to the following:

1. **Documentation Review**:

   - Before interacting with the codebase, AI assistants must read and understand the application documentation, including:
     - `AGENTS.md`
     - `.github/copilot-instructions.md`
     - Any other relevant project-specific documentation.

2. **Compliance Verification**:

   - All generated code, edits, and tasks must strictly follow the standards outlined in the documentation.
   - This includes adhering to architectural principles, coding conventions, and testing requirements.

3. **Session Enforcement**:

   - This review process is mandatory for every chat session.
   - AI assistants must confirm compliance with the documentation before proceeding with any tasks.

4. **Story Management Compliance**:

   - Follow the mandatory story documentation process for all `/docs/stories/` work
   - Update story checklists and provide comprehensive work summaries
   - Maintain agentic documentation continuously throughout development

5. **Error Reporting**:
   - If any ambiguity or conflict arises in the documentation, it must be flagged and clarified before make changes.

By enforcing these standards, we ensure consistency, maintainability, and quality across the project.
