# GitHub Copilot Instructions

## Priority Guidelines

When generating code for this repository:

1. **Version Compatibility**: Always detect and respect the exact versions of languages, frameworks, and libraries used in this project
2. **Context Files**: Prioritize patterns and standards defined in the .github/copilot directory
3. **Codebase Patterns**: When context files don't provide specific guidance, scan the codebase for established patterns
4. **Architectural Consistency**: Maintain our layered serverless architectural style and established boundaries
5. **Code Quality**: Prioritize maintainability, performance, security, and testability in all generated code

## Technology Version Detection

Before generating code, scan the codebase to identify:

1. **Language Versions**:

   - TypeScript 5.x with strict mode enabled (see tsconfig.json)
   - ES2017 target with modern ESNext modules
   - Node.js 18+ (20+ recommended per README.md)

2. **Framework Versions**:

   - Next.js 15.5.2 with App Router architecture
   - React 19.1.0 with React DOM 19.1.0
   - TailwindCSS 4.x with PostCSS-only configuration

3. **Library Versions**:
   - Zod 4.1.5 for schema validation
   - AWS SDK v3.879.0 (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner)
   - ESLint 9.x with Next.js TypeScript configuration
   - Jest 29.7.0 with ts-jest for TypeScript testing

## Architecture Overview

- **Next.js App Router (Next 15)**: Client and server components under `src/app/`
- **Hooks-Based Architecture**: Comprehensive custom hooks for all business logic under `src/hooks/`
- **Component Composition**: Focused UI components under `src/components/` using hooks for data
- **API Routes**: Server-side routes under `src/app/api/*` implementing workflows, preflight checks, and file uploads
- **Runtime Declaration**: Many routes declare `export const runtime = 'nodejs'` for Node.js runtime
- **S3 Storage**: Model files live on S3-compatible RunPod volume configured in `src/lib/runpodVolume.ts`
- **Model Storage Convention**: All model files must be stored under `models/<type>/...` at the root of your S3 bucket
- **Template Storage**: Workflow templates stored on disk under `data/workflows/*.json` and served via `src/lib/templates.fs.ts`

## Hooks-Based Architecture

The application follows a comprehensive hooks-based architecture where all business logic is extracted into custom hooks:

### **Workflow Management Hooks**

- `useWorkflowTemplate` - Template loading and metadata management
- `useWorkflowsList` - Workflow list fetching with error handling
- `useWorkflowRegistration` - Workflow registration with validation
- `useWorkflowManagement` - CRUD operations for workflows
- `useWorkflowEditor` - Workflow editing state management

### **Job & Execution Hooks**

- `useJobManagement` - Job submission, polling, and result management
- `useWorkflowRunnerJob` - Job-specific execution and status tracking
- `useEnhancedPolling` - Robust polling with retry logic

### **Form & UI Hooks**

- `useWorkflowForm` - Form state management and validation
- `useFieldLabeling` - Enhanced field labeling for workflows
- `useFileUpload` - File upload functionality
- `useUploadCard` - Upload card specific state management

### **Utility & Specialized Hooks**

- `useManualPreflight` - Model preflight checks
- `useWorkflowPreflight` - Workflow-specific preflight validation
- `useResultHistory` - Result history management with filtering
- `useProgressCalculation` - Progress calculation utilities
- `useProgressTimer` - Progress timing functionality
- `useOutputProcessor` - Output processing logic
- `useResultsDisplay` - Results display state management
- `useWorkflowOutputType` - Determines the output type (image or video) for a given workflow

## Component Architecture Principles

### **Separation of Concerns**

- **Hooks**: Handle all business logic, API calls, and state management
- **Components**: Focus purely on UI rendering and user interaction
- **Lib**: Contain pure utility functions and reusable logic

### **Component Composition Pattern**

Components are organized into logical groups with clear responsibilities:

- **Form Components**: `FormFields.tsx`, `WorkflowRunnerForm.tsx`, `UploadForm.tsx`
- **Display Components**: `WorkflowResults.tsx`, `ImageGallery.tsx`, `VideoDisplay.tsx`, `MediaDisplay.tsx`
- **Status Components**: `JobStatus.tsx`, `PreflightStatus.tsx`, `ProgressIndicator.tsx`
- **Container Components**: `WorkflowRunner.tsx`, `UploadCard.tsx`, `ResultHistory.tsx`

## Code Quality Standards

### Maintainability

- Write self-documenting code with clear, descriptive naming following patterns in the codebase
- Function names use camelCase: `sanitizeFilename`, `objectExists`, `inferModelRequirements`
- Type names use PascalCase with descriptive suffixes: `ModelRequirement`, `TemplateMeta`, `ExportApiWorkflow`
- Constant names use UPPER_SNAKE_CASE: `RUNPOD_BUCKET`, `MODELS_PREFIX`, `MAX_UPLOAD_BYTES`
- Keep functions focused on single responsibilities following existing patterns
- **Hooks-First Architecture**: Extract all business logic into custom hooks under `src/hooks/`
- **Component Simplicity**: Keep components focused on UI rendering, delegate logic to hooks
- Organize code in logical modules under `src/lib/` for reusable logic

### Performance

- Use `HeadObjectCommand` for S3 existence checks instead of listing operations
- Apply timeout handling for S3 operations to prevent hanging requests
- Stream file uploads without converting to base64
- Use Next.js Turbopack for development builds via `--turbopack` flag
- Implement defensive error handling with detailed logging for troubleshooting

### Security

- Keep all secrets server-side only - never expose RunPod/B2 credentials to browser
- Sanitize filenames using established pattern: reject path traversal, limit length to 200 chars
- Validate file types with `isAllowedMime()` function from `src/lib/filename.ts`
- Apply size limits using `MAX_UPLOAD_BYTES` constant (200MB default)
- Use parameterized S3 operations with proper key validation

### Testability

- Structure functions for easy testing with clear input/output contracts
- Separate business logic from API routes into `src/lib/` modules
- Use dependency injection patterns for S3 clients and external services
- Follow established error handling patterns with typed responses

## Documentation Requirements

- Follow JSDoc-style comments for complex functions and type definitions
- Document function parameters and return types explicitly when not obvious from TypeScript
- Include inline comments for non-obvious business logic, especially S3 error handling
- Document environment variables and their purposes in configuration modules
- Use descriptive commit messages and maintain clear file organization

## RunPod Documentation Reference

This project includes comprehensive RunPod documentation in the `docs/runpod/` directory. Familiarize yourself with these resources when working with RunPod-related functionality:

### Core Documentation Structure

- **`docs/runpod/glossary.md`** — Key terminology for serverless, workers, endpoints, handlers, and infrastructure concepts
- **`docs/runpod/serverless/`** — Complete serverless endpoint documentation including configuration, operations, job states, and management
- **`docs/runpod/storage/`** — Storage options including network volumes, S3-compatible storage, and container volumes
- **`docs/runpod/development/`** — Development workflows, local testing, debugging, environment setup, and deployment patterns

### Key Documentation Files for Development

- **`docs/runpod/serverless/overview.md`** — Fundamental concepts of endpoints, execution modes (async/sync), auto-scaling, and integration options
- **`docs/runpod/storage/s3-api.md`** — S3-compatible storage integration patterns and best practices
- **`docs/runpod/development/test-locally.md`** — Local testing strategies using the RunPod SDK
- **`docs/runpod/development/debugging.md`** — Debugging techniques and log level configuration
- **`docs/runpod/development/environment-variables.md`** — Environment configuration for development and production
- **`docs/runpod/serverless/workers/handler-functions.md`** — Handler function patterns and implementation guidelines

### Documentation Usage Guidelines

When implementing RunPod-related features:

1. **Reference First**: Check the relevant documentation files for established patterns and best practices
2. **Terminology Consistency**: Use terminology from `glossary.md` to maintain consistency across code and comments
3. **Implementation Patterns**: Follow patterns documented in the development and serverless sections
4. **Storage Integration**: Refer to storage documentation when working with S3 volumes, network volumes, or container storage
5. **Testing Strategies**: Use local testing patterns from the development documentation before deploying

## Key Files to Read First

- `src/app/w/[slug]/page.tsx` — dynamic workflow form, client-side submit & polling
- `src/app/api/workflows/preflight/route.ts` — model presence checks (HEAD-based with defensive parsing)
- `src/lib/workflow.preflight.ts` — infers required models and builds `s3Key` + `workerPath` (`modelPaths`)
- `src/lib/runpodVolume.ts` — S3 client config and required env vars
- `src/lib/templates.fs.ts` — templates storage and schema interactions
- `workers/volume-worker/AGENTS.md` — volume worker architecture, operations, and integration patterns
- `workers/multi-model-worker/AGENTS.md` — multi-modal inference worker requirements and implementation strategy
- `docs/runpod/` — comprehensive RunPod documentation for serverless, storage, and development patterns
- `docs/RUNPOD_IMPROVEMENTS.md` — detailed analysis of needed RunPod integration improvements
- `docs/RUNPOD_ROADMAP.md` — quick reference for current RunPod implementation status and next steps
- `release/` — complete release documentation and notes (see release/README.md for structure)

## Codebase Scanning Instructions

When context files don't provide specific guidance:

1. **Identify Similar Files**: Look for existing implementations in the same directory or with similar functionality
2. **Analyze Patterns**: Extract consistent patterns for naming, error handling, validation, and module organization
3. **Follow Established Conventions**: Prioritize patterns found in multiple files over single instances
4. **Error Handling**: Use the defensive S3 error parsing pattern from `src/app/api/workflows/preflight/route.ts`
5. **Validation**: Follow the Zod-first validation pattern used throughout API routes

## Project conventions & strict rules

- Strict TypeScript: do not use `any`. When a new shape is needed, add a typed interface or use `z.infer<>` alongside a Zod schema in `src/lib`.
- Zod-first validation for all API inputs/outputs. Pattern used across repo: `const parsed = Schema.safeParse(val); if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 })`.
- S3 existence checks: current codebase prefers `HeadObjectCommand` with careful inspection of `err.$response`/`err.$metadata` for 404s and certain provider-specific parsing failures. Use HEAD where possible; add a ListObjectsV2 fallback only if a provider lacks HEAD support.
- Params handling:
  - Server route handlers receive `params` as a Promise: e.g. `export async function GET(req, ctx: { params: Promise<{ slug: string }> }) { const { slug } = await ctx.params }` (this repo follows that pattern).
  - Client components in this repo unwrap route params with React's `use` hook: `import { use } from 'react'; const { slug } = use(params)` in `use client` components. The `next/navigation` `useParams()` hook is an alternative but this codebase uses `use(params)` in places.

## TypeScript Guidelines

- Use strict TypeScript settings from tsconfig.json (target: ES2017, strict: true)
- Prefer explicit typing over type inference for public APIs and module boundaries
- Use Zod schemas for runtime validation and derive TypeScript types with `z.infer<>`
- Structure types in dedicated schema files under `src/lib/` for reusability
- Follow naming convention: Schema suffix for Zod schemas, Type suffix for inferred types

## React/Next.js Guidelines

- Use App Router patterns from Next.js 15.5.2
- Declare server runtime explicitly: `export const runtime = 'nodejs'` in API routes
- Use `'use client'` directive only when necessary for client-side interactivity
- Import Next.js utilities from their canonical paths: `next/navigation`, `next/headers`
- Follow component composition patterns from existing components in `src/components/`

## AWS SDK Guidelines

- Use AWS SDK v3.879.0 patterns for S3 operations
- Prefer command-based API: `runpodS3.send(new HeadObjectCommand(...))`
- Implement defensive error handling for S3-compatible endpoints
- Use environment-based configuration pattern from `src/lib/runpodVolume.ts`
- Apply timeout protection for potentially hanging operations

## Env vars (server-only)

- Runpod S3: `RUNPOD_VOLUME_ID` (used as RUNPOD_BUCKET), `RUNPOD_S3_REGION`, `RUNPOD_S3_ENDPOINT`, `RUNPOD_S3_ACCESS_KEY_ID`, `RUNPOD_S3_SECRET_ACCESS_KEY`.
- Model mapping: All models must be stored under `models/<type>/...` at the root of your S3 bucket. Per-type directories: `RUNPOD_MODEL_DIR_UNET`, `RUNPOD_MODEL_DIR_CLIP`, `RUNPOD_MODEL_DIR_CLIP_VISION`, `RUNPOD_MODEL_DIR_VAE`, `RUNPOD_MODEL_DIR_LORA`, `RUNPOD_MODEL_DIR_CHECKPOINTS`.
- Backblaze B2 output storage: `BUCKET_ENDPOINT_URL`, `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_ACCESS_KEY_ID`, `BUCKET_SECRET_ACCESS_KEY`.

## Error Handling Patterns

### Zod Validation Pattern

```typescript
const parsed = Schema.safeParse(payload)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

### S3 Error Handling Pattern

```typescript
try {
  await runpodS3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  return true
} catch (err: unknown) {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>

    // Check $response.statusCode
    const rawResp = obj['$response']
    if (rawResp && typeof rawResp === 'object') {
      const statusVal = (rawResp as Record<string, unknown>)['statusCode']
      if (typeof statusVal === 'number' && statusVal === 404) return false
    }

    // Check $metadata.httpStatusCode
    const meta = obj['$metadata']
    if (meta && typeof meta === 'object') {
      const httpStatusCode = (meta as Record<string, unknown>)['httpStatusCode']
      if (typeof httpStatusCode === 'number' && httpStatusCode === 404) return false
    }
  }

  console.error('S3 operation failed', { bucket, key, error: err })
  return false
}
```

### Environment Configuration Pattern

```typescript
function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}
```

## Developer commands

- Dev server: `npm run dev` (Next dev with turbopack)
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: `npm run lint`
- Test: `npm test` (Jest with TypeScript)
- Test watch: `npm run test:watch`
- Test coverage: `npm run test:coverage`

## API Route Patterns

### Basic Route Structure

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  // Define request schema
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Process request
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Dynamic Route Handler

```typescript
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Handle request with slug parameter
}
```

## Client Component Patterns

### Zod Schema Usage in Components

```typescript
'use client'

import { z } from 'zod'

const ResponseSchema = z.object({
  // Define response schema
})

// In component
const handleSubmit = async () => {
  const response = await fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) })
  const json = await response.json()

  const parsed = ResponseSchema.safeParse(json)
  if (!parsed.success) {
    setError('Invalid response format')
    return
  }

  // Use parsed.data
}
```

### Form State Management

```typescript
const [formData, setFormData] = useState<Record<string, ValueUnion>>({})
const [errors, setErrors] = useState<string[]>([])
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
```

## Troubleshooting checklist — HEAD vs LIST fallback

1. Verify the computed S3 key (server-side):

- Confirm `modelPaths()` produced the expected `s3Key` and `workerPath` for the model. Example: `models/diffusion_models/wan2.1_flf2v_720p_14B_fp16.safetensors` → `/runpod-volume/models/diffusion_models/wan2.1_flf2v_720p_14B_fp16.safetensors`.

## File Organization Patterns

### Library Module Structure (`src/lib/`)

- **Schema files**: `*.schema.ts` - Zod schemas and type definitions
- **Type files**: `*.types.ts` - TypeScript interfaces and type aliases
- **Utility files**: `*.ts` - Pure functions and business logic
- **Client files**: `*.client.ts` - Browser-specific utilities
- **Config files**: Environment and configuration management

### API Route Organization (`src/app/api/`)

- **Grouped by feature**: `/workflows/`, `/volume/`, `/runpod/`
- **Dynamic routes**: `[slug]/route.ts` for parameterized endpoints
- **Nested routes**: `/workflows/[slug]/raw/route.ts` for specialized endpoints

### Component Structure (`src/components/`)

- **PascalCase naming**: `UploadCard.tsx`, `WorkflowRunner.tsx`
- **Single responsibility**: Each component focused on one concern
- **Client/Server distinction**: Use `'use client'` directive when needed

## Testing Patterns

### Schema Validation Testing

```typescript
// Test Zod schemas explicitly
const validData = {
  /* valid data */
}
const invalidData = {
  /* invalid data */
}

const validResult = Schema.safeParse(validData)
expect(validResult.success).toBe(true)

const invalidResult = Schema.safeParse(invalidData)
expect(invalidResult.success).toBe(false)
```

### API Route Testing

```typescript
// Test API routes with proper error handling
const response = await POST(mockRequest, mockContext)
const body = await response.json()

expect(response.status).toBe(200)
expect(body).toMatchObject({ expected: 'response' })
```

## General Best Practices

- Follow naming conventions exactly as they appear in existing code
- Match code organization patterns from similar files
- Apply error handling consistent with existing patterns
- Follow the same approach to testing as seen in the codebase
- Match logging patterns from existing code
- Use the same approach to configuration as seen in the codebase

## Test Script Conventions

When creating temporary test scripts for debugging or development:

### Location and Structure

- **Directory**: All test scripts must be placed in `scripts/test/`
- **Language**: All test scripts must be written in TypeScript (`.ts` extension)
- **Naming**: Use descriptive names with `test-` prefix: `test-feature-name.ts`

### Lifecycle Management

- **Cleanup**: Remove temporary test scripts once they are no longer needed
- **Documentation**: Useful ongoing scripts should be documented in `scripts/README.md`
- **Maintenance**: Update `scripts/README.md` when adding, removing, or modifying scripts

### Execution Pattern

```bash
# Execute test scripts from project root
npx tsx scripts/test/test-example.ts
```

### File Organization

```text
scripts/
├── README.md           # Script documentation (must be maintained)
├── test/              # Temporary test scripts directory
│   ├── test-api.ts    # Example test script
│   └── test-feature.ts # Another test script
├── deploy.sh          # Production deployment script
└── validate-workflows.ts # Production validation script
```

### Documentation Requirements

- Always check if `scripts/README.md` exists before creating it
- Update the README when adding useful scripts for ongoing debugging
- Document script purpose, usage, and cleanup status
- Follow established markdown formatting standards

## Migration Note

**As of September 2025, all model files must be stored under `models/<type>/...` at the root of your S3 bucket.**
If you previously used `ComfyUI/models/`, move your files to `models/` and update all references and worker configuration accordingly.

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

### 🚨 CRITICAL PROCESS ENFORCEMENT

**MANDATORY ACTIVATION**: All AI assistants working on story documents MUST activate the **Story Management Chatmode** and follow comprehensive documentation requirements.

#### **Required Infrastructure Usage**

- **Chatmode**: `.github/chatmodes/Story Mode.chatmode.md` - MANDATORY for all story work
- **Instructions**: `.github/instructions/story-documentation.instructions.md` - Comprehensive templates
- **Agentic Maintenance**: `.github/instructions/agentic-maintenance.instructions.md` - Documentation update procedures

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

1. **Every Story Session** - MANDATORY REQUIREMENTS:

   - **MUST begin** by reading the story document and understanding requirements
   - **MUST update** checklist progress as work proceeds (mark `[x]` for completed items)
   - **MUST complete** comprehensive work summary before session end - THIS IS NON-NEGOTIABLE
   - **MUST update** relevant agentic documentation with new patterns
   - **FAILURE to complete story documentation is a critical process violation**

2. **Documentation Quality** - MANDATORY STANDARDS:

   - Work summaries **MUST be** detailed and comprehensive with specific technical details
   - Technical details **MUST be** specific and actionable for future developers
   - Status indicators **MUST be** accurate and clear with explicit completion confirmation
   - Integration notes **MUST be** complete and helpful for future work phases
   - **ALL checklist items MUST be marked as `[x]` when story is complete**

3. **Continuous Maintenance** - MANDATORY UPDATES:

   - Agentic documents **MUST reflect** current project state at all times
   - New patterns and requirements **MUST be documented** immediately during implementation
   - Cross-references between documents **MUST be maintained** for consistency
   - Examples and code snippets **MUST be kept** current with latest implementations

4. **Story Documentation Process Violations** - IMMEDIATE CORRECTION REQUIRED:

   - **If story checklist is not updated**: Stop all work and update immediately
   - **If work summary is missing**: Session cannot end until comprehensive summary is added
   - **If agentic docs are not updated**: All new patterns must be documented before session close
   - **No exceptions** - story documentation is as critical as code implementation

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
   - If any ambiguity or conflict arises in the documentation, it must be flagged and clarified before making changes.

## **MANDATORY PROCESS CHECKLISTS FOR ALL STORY WORK**

Every AI assistant working on stories MUST use these checklists. They are also embedded in each story document for immediate reference.

### **Pre-Session Checklist** - COMPLETE BEFORE STARTING WORK

- [ ] Read and understand the complete story document including all acceptance criteria
- [ ] Identify all checklist items that will be addressed in this session
- [ ] Commit to updating documentation throughout the session (not just at the end)
- [ ] Plan the comprehensive work summary structure required at session end
- [ ] Verify understanding of all Definition of Done criteria

### **Session End Checklist** - COMPLETE BEFORE ENDING SESSION

- [ ] All completed work is marked with `[x]` in story checklists
- [ ] Comprehensive work summary added with all required sections
- [ ] All acceptance criteria explicitly addressed and confirmed complete
- [ ] All Definition of Done items verified and marked complete
- [ ] Agentic documents updated with new patterns
- [ ] Status clearly marked as **COMPLETE** ✅ with next phase identified

### **Process Violation Recovery** - IMMEDIATE ACTION IF CHECKLIST MISSED

- [ ] **If story checklist not updated**: STOP all work, update immediately
- [ ] **If work summary missing**: Session CANNOT end until summary added
- [ ] **If agentic docs not updated**: All patterns MUST be documented
- [ ] **Acknowledge violation**: Add explicit process improvement note

**⚠️ ABSOLUTELY CRITICAL**: These process requirements are NON-NEGOTIABLE. Story documentation is as important as code implementation.

### **Process Infrastructure Reference**

For comprehensive guidance on story documentation and process enforcement:

- **📋 Story Management Chatmode**: `.github/chatmodes/Story Mode.chatmode.md`

  - Mandatory activation for all story work
  - Comprehensive process enforcement requirements
  - Quality gates and violation recovery procedures
  - Direct integration with instruction files for detailed guidance

- **📚 Story Documentation Instructions**: `.github/instructions/story-documentation.instructions.md`

  - Detailed work summary templates and structure requirements
  - Quality standards and technical specificity requirements
  - Validation checklists and enforcement mechanisms

- **🔧 Agentic Maintenance Instructions**: `.github/instructions/agentic-maintenance.instructions.md`
  - Step-by-step guidance for maintaining AGENTS.md and copilot-instructions.md
  - Documentation update triggers and procedures
  - Cross-document consistency validation

By enforcing these standards, we ensure consistency, maintainability, and quality across the project.
