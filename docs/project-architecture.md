# Project Architecture

## 1. Architecture Detection and Analysis

### Technology Stack

Media Labs is built using the following technologies:

- **Frontend/Backend Framework**: Next.js 15.5.2 with App Router
- **Runtime**: React 19.1.0 with TypeScript (strict mode)
- **Styling**: TailwindCSS 4.x with PostCSS
- **Schema Validation**: Zod 4.1.5 for runtime type safety
- **Cloud Infrastructure**: AWS S3-compatible APIs (RunPod, Backblaze B2)
- **External Services**: RunPod Serverless GPU instances, ComfyUI AI workflows
- **Build Tool**: Turbopack (Next.js)
- **Package Manager**: npm

### Architectural Pattern

The system implements a **Serverless Microservices** architecture with **Clean Architecture** principles:

- **API-first design** with clear separation between client and server
- **Domain-driven organization** with workflow templates as the core domain
- **External service integration** through adapter patterns
- **Event-driven workflows** with async job processing
- **File-based persistence** for templates with S3 for binary assets

## 2. Architectural Overview

Media Labs serves as a bridge between web-based ComfyUI workflow management and cloud GPU execution. The architecture follows these guiding principles:

- **Local-first development** with cloud execution
- **Type safety throughout** using TypeScript and Zod schemas
- **No base64 encoding** for file transfers - direct S3 streaming
- **Separation of concerns** between UI, API, domain logic, and infrastructure
- **Immutable workflow templates** with runtime patching for customization

Key architectural boundaries:

- **Presentation Layer**: React components and Next.js pages
- **API Layer**: Next.js API routes with runtime validation
- **Domain Layer**: Workflow templates, field inference, and business logic
- **Infrastructure Layer**: S3 clients, RunPod integration, file system operations

## 3. Architecture Visualization

### High-Level System Architecture

```bash
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js App)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Workflow    │  │ Upload      │  │ Manage      │              │
│  │ Runner      │  │ Component   │  │ Templates   │              │
│  │ /w/[slug]   │  │             │  │ /manage     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                               \/
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js API Routes                      │
├─────────────────────────────────────────────────────────────────┤
│  /api/workflows/         /api/volume/        /api/runpod/       │
│  ├─ run                  ├─ upload           ├─ status/[id]     │
│  ├─ preflight            └─ (files)          └─ (job status)    │
│  ├─ register                                                    │
│  ├─ list                                                        │
│  └─ [slug]/raw                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                               \/
┌─────────────────────────────────────────────────────────────────┐
│                         Domain Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Templates   │  │ Workflow    │  │ Model       │              │
│  │ Management  │  │ Inference   │  │ Validation  │              │
│  │ (FS-based)  │  │ & Patching  │  │ (Preflight) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                               \/
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ RunPod S3   │  │ RunPod API  │  │ Backblaze   │              │
│  │ (Volume)    │  │ (Serverless)│  │ B2 (Output) │              │
│  │             │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                               \/
┌─────────────────────────────────────────────────────────────────┐
│                        Worker Environment                      │
├─────────────────────────────────────────────────────────────────┤
│  ComfyUI + Custom Handler (Python)                             │
│  ├─ /runpod-volume/ (mounted from RunPod Network Volume)       │
│  ├─ /opt/ComfyUI/ (ComfyUI installation)                       │
│  └─ /outputs/ → Backblaze B2 upload                            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```bash
User Upload → /api/volume/upload → RunPod S3 → /runpod-volume/inputs/
                                                        │
                                                       \/
User Run → /api/workflows/run → RunPod API → ComfyUI Worker
            │                                        │
            ├─ Apply patches                         ├─ Process workflow
            ├─ Model validation                      ├─ Generate outputs
            └─ Mode selection                        └─ Upload to B2
                                                        │
                                                       \/
Status Poll → /api/runpod/status → RunPod API → Job Results → Display
```

## 4. Core Architectural Components

### 4.1 Presentation Layer (`src/app/`, `src/components/`)

**Purpose and Responsibility**:

- User interface for workflow execution and template management
- Client-side state management for upload progress and job status
- Real-time polling for async job completion

**Internal Structure**:

- **Pages**: App Router structure with dynamic routes for workflow execution
- **Components**: Reusable UI components for file upload and workflow running
- **State Management**: React hooks for local state, no external state library

**Interaction Patterns**:

- API communication through fetch with Zod validation
- Real-time updates via polling (WebSocket planned for future)
- File upload with progress tracking
- Error boundary patterns for graceful degradation

### 4.2 API Layer (`src/app/api/`)

**Purpose and Responsibility**:

- HTTP API endpoints exposing workflow and file operations
- Request/response validation using Zod schemas
- Integration with external services (RunPod, S3)

**Internal Structure**:

```bash
/api/
├─ workflows/
│  ├─ run/route.ts          # Execute workflows with patching
│  ├─ preflight/route.ts    # Model validation before execution
│  ├─ register/route.ts     # Template registration
│  ├─ list/route.ts         # Template listing
│  └─ [slug]/
│     ├─ route.ts           # Template CRUD operations
│     └─ raw/route.ts       # Raw workflow JSON access
├─ volume/
│  └─ upload/route.ts       # File upload to RunPod volume
└─ runpod/
   └─ status/[id]/route.ts  # Job status polling
```

**Interaction Patterns**:

- All routes use `runtime = 'nodejs'` for server-side execution
- Zod schemas for type-safe request/response handling
- Error handling with structured JSON responses
- Integration with domain services through dependency injection pattern

### 4.3 Domain Layer (`src/lib/`)

**Purpose and Responsibility**:

- Core business logic for workflow management
- Template inference from ComfyUI Export API format
- Model requirement validation and preflight checks

**Internal Structure**:

**Templates Module** (`templates.*.ts`):

- `templates.fs.ts`: File system operations for template persistence
- `templates.schema.ts`: Zod schemas for template validation
- `templates.types.ts`: TypeScript type definitions

**Workflow Module** (`workflow.*.ts`):

- `workflow.infer.ts`: Field inference from ComfyUI workflows
- `workflow.preflight.ts`: Model requirement validation
- `patchWorkflow.ts`: Runtime workflow modification

**Integration Module**:

- `runpod.ts`: RunPod API client
- `runpodVolume.ts`: S3 client for RunPod volumes
- `b2.ts`: Backblaze B2 S3 client

**Interaction Patterns**:

- Functional programming approach with pure functions
- Immutable data structures with runtime patching
- Schema-first validation at all boundaries
- Error handling through Result-like patterns

### 4.4 Infrastructure Layer

**Purpose and Responsibility**:

- External service integration and I/O operations
- File system abstraction for template storage
- Cloud storage abstractions for S3-compatible services

**Internal Structure**:

- **S3 Adapters**: Unified interface for RunPod and B2 storage
- **HTTP Clients**: RunPod API integration with retry logic
- **File System**: Local template storage with atomic operations

**Interaction Patterns**:

- Adapter pattern for multiple S3 providers
- Configuration injection through environment variables
- Graceful degradation for network failures
- Structured logging for debugging

## 5. Architectural Layers and Dependencies

### Layer Structure

```bash
┌─────────────────────────────────────────┐
│            Presentation Layer           │
│  (React Components, Next.js Pages)      │ ← User Interface
├─────────────────────────────────────────┤
│               API Layer                 │
│     (Next.js API Routes + Validation)   │ ← HTTP Endpoints
├─────────────────────────────────────────┤
│              Domain Layer               │
│  (Business Logic, Workflow Management)  │ ← Core Logic
├─────────────────────────────────────────┤
│           Infrastructure Layer          │
│    (S3 Clients, File System, HTTP)     │ ← External I/O
└─────────────────────────────────────────┘
```

### Dependency Rules

1. **Presentation → API**: Components call API routes via HTTP
2. **API → Domain**: API routes use domain services directly
3. **Domain → Infrastructure**: Domain uses infrastructure through interfaces
4. **No circular dependencies**: Strict unidirectional dependency flow

### Dependency Injection Patterns

The system uses environment variable injection and module imports:

```typescript
// Configuration injection pattern
function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}

// S3 client configuration
export const runpodS3 = new S3Client({
  region: req('RUNPOD_S3_REGION'),
  endpoint: req('RUNPOD_S3_ENDPOINT')
  // ...
})
```

## 6. Data Architecture

### Domain Model Structure

**Core Entities**:

```typescript
// Workflow Template (Aggregate Root)
interface WorkflowTemplate {
  slug: string // Unique identifier
  name: string // Display name
  workflow: ExportApiWorkflow // ComfyUI workflow definition
  fields: FieldSpec[] // Inferred user input fields
  createdAt: number // Creation timestamp
}

// Field Specification (Value Object)
interface FieldSpec {
  id: string // Unique field identifier
  label: string // User-facing label
  type: FieldType // Input type (file, string, etc.)
  required: boolean // Validation flag
  nodeId: string // ComfyUI node reference
  inputKey: string // Node input key
  // ... additional metadata
}

// Export API Workflow (External Format)
type ExportApiWorkflow = Record<string, ExportApiNode>
interface ExportApiNode {
  class_type: string
  inputs: Record<string, unknown>
}
```

### Data Access Patterns

**Template Repository Pattern**:

```typescript
// File-based repository implementation
export function saveTemplate(tpl: WorkflowTemplate): void
export function getTemplate(slug: string): WorkflowTemplate | null
export function listTemplates(): Array<{ slug: string; name: string }>
export function deleteTemplate(slug: string): boolean
export function updateTemplate(slug: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate
```

**Storage Strategy**:

- **Templates**: JSON files in `data/workflows/` directory
- **Binary Assets**: S3-compatible storage (RunPod volumes, B2)
- **Job State**: Ephemeral (polling-based, no persistence)

### Data Transformation Patterns

**Workflow Patching**:

```typescript
// Immutable patching with type safety
function applyPatches(workflow: ExportApiWorkflow, patches: PatchSpec[]): ExportApiWorkflow {
  const out: Record<string, ExportApiNode> = {}
  for (const [nodeId, node] of Object.entries(workflow)) {
    const nodePatches = patches.filter(p => p.nodeId === nodeId)
    if (nodePatches.length === 0) {
      out[nodeId] = node
    } else {
      const newInputs = { ...node.inputs }
      for (const patch of nodePatches) {
        newInputs[patch.inputKey] = patch.value
      }
      out[nodeId] = { ...node, inputs: newInputs }
    }
  }
  return out
}
```

## 7. Cross-Cutting Concerns Implementation

### 7.1 Error Handling & Resilience

**API Error Handling**:

```typescript
// Structured error responses
try {
  const result = await someOperation()
  return NextResponse.json(result, { status: 200 })
} catch (err) {
  const message = err instanceof Error ? err.message : 'unknown error'
  return NextResponse.json({ error: message }, { status: 500 })
}
```

**S3 Operation Resilience**:

```typescript
// Graceful degradation for S3 operations
async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await runpodS3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (err) {
    // Handle various error formats from S3-compatible APIs
    if (isNotFoundError(err)) return false
    console.error('HEAD failed', { bucket, key, error: err })
    return false // Conservative: assume not present
  }
}
```

### 7.2 Validation

**Schema-First Validation**:

```typescript
// Zod schemas at API boundaries
const RunReqSchema = z.object({
  slug: z.string(),
  patches: z.array(PatchSpecSchema),
  mode: z.enum(['auto', 'sync', 'async']).optional()
})

// Runtime validation in API routes
const parsed = RunReqSchema.safeParse(bodyUnknown)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

**Business Rule Validation**:

```typescript
// Model requirement validation
export function inferModelRequirements(workflow: ExportApiWorkflow): ModelRequirement[] {
  const requirements: ModelRequirement[] = []
  for (const [nodeId, node] of Object.entries(workflow)) {
    for (const rule of NODE_MODEL_MAP) {
      if (matchesRule(node, rule)) {
        requirements.push(extractRequirement(nodeId, node, rule))
      }
    }
  }
  return deduplicateRequirements(requirements)
}
```

### 7.3 Configuration Management

**Environment-Based Configuration**:

```typescript
// Required configuration validation
function req(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]
    if (value && value.trim()) return value
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}

// Service configuration
export const RUNPOD_BUCKET = req('RUNPOD_VOLUME_ID')
export const RUNPOD_REGION = req('RUNPOD_S3_REGION')
export const RUNPOD_S3_ENDPOINT = req('RUNPOD_S3_ENDPOINT')
```

**Feature Flags**:

```typescript
// Runtime mode selection
const mode = body.mode || (payloadSize <= SYNC_THRESHOLD ? 'sync' : 'async')
```

### 7.4 Logging & Monitoring

**Structured Logging**:

```typescript
// Error context logging
console.error('HEAD failed', {
  bucket,
  key,
  status,
  note: 'raw $response present'
})

// Operation logging
console.log('Starting ComfyUI', {
  command: cmd.join(' '),
  timeout: timeout_s
})
```

## 8. Service Communication Patterns

### External Service Integration

**RunPod API Communication**:

```typescript
// HTTP client with bearer token authentication
export async function runSync(input: RunpodInput) {
  const res = await fetch(`${apiBase}/${endpointId}/runsync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.RUNPOD_API_KEY}`
    },
    body: JSON.stringify({ input })
  })
  if (!res.ok) throw new Error(`runsync failed: ${res.status}`)
  return res.json()
}
```

**S3 Communication Pattern**:

```typescript
// S3-compatible client configuration
export const runpodS3 = new S3Client({
  region: RUNPOD_REGION,
  endpoint: RUNPOD_S3_ENDPOINT,
  forcePathStyle: true, // Required for S3-compatible endpoints
  credentials: {
    accessKeyId: req('RUNPOD_S3_ACCESS_KEY_ID'),
    secretAccessKey: req('RUNPOD_S3_SECRET_ACCESS_KEY')
  }
})
```

### Async Processing Patterns

**Job Submission Flow**:

1. **Sync vs Async Decision**: Based on payload size (20MB threshold)
2. **Async Job Submission**: Returns job ID immediately
3. **Status Polling**: Client polls `/api/runpod/status/[id]` endpoint
4. **Result Retrieval**: Final results include S3 URLs for outputs

**Error Recovery**:

- **Transient Errors**: Automatic retry at client level
- **Permanent Failures**: Structured error responses with context
- **Timeout Handling**: Configurable timeouts for different operations

## 9. React Architectural Patterns

### Component Composition Strategy

**Container/Presentation Pattern**:

```typescript
// Container component with state management
export default function WorkflowPage() {
  const [status, setStatus] = useState('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  // ... business logic

  return <WorkflowRunner onSubmit={handleSubmit} status={status} />
}

// Presentation component
function WorkflowRunner({ onSubmit, status }: Props) {
  // ... UI rendering only
}
```

**Hook-Based State Management**:

```typescript
// Custom hooks for API integration
function useWorkflowExecution() {
  const [state, setState] = useState(initialState)

  const executeWorkflow = useCallback(async params => {
    setState(prev => ({ ...prev, status: 'submitting' }))
    try {
      const result = await apiCall(params)
      setState(prev => ({ ...prev, result, status: 'completed' }))
    } catch (error) {
      setState(prev => ({ ...prev, error, status: 'failed' }))
    }
  }, [])

  return { state, executeWorkflow }
}
```

### State Management Approach

**Local State with React Hooks**:

- Component-level state for UI interactions
- No global state management library
- Server state fetched on-demand with loading states

**Side Effect Handling**:

```typescript
// Polling pattern for async jobs
useEffect(() => {
  if (jobId && status === 'IN_PROGRESS') {
    const pollInterval = setInterval(async () => {
      try {
        const result = await fetch(`/api/runpod/status/${jobId}`)
        const data = await result.json()
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setStatus(data.status)
          setResult(data)
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }
}, [jobId, status])
```

## 10. Implementation Patterns

### 10.1 Interface Design Patterns

**Functional Interface Segregation**:

```typescript
// Separate interfaces for different operations
interface TemplateReader {
  getTemplate(slug: string): WorkflowTemplate | null
  listTemplates(): Array<{ slug: string; name: string }>
}

interface TemplateWriter {
  saveTemplate(template: WorkflowTemplate): void
  deleteTemplate(slug: string): boolean
  updateTemplate(slug: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate
}
```

**Schema-Driven Interfaces**:

```typescript
// API contracts defined by Zod schemas
const PreflightReqSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('slug'), slug: z.string() }),
  z.object({ kind: z.literal('workflow'), workflow: ExportApiWorkflowSchema })
])

type PreflightRequest = z.infer<typeof PreflightReqSchema>
```

### 10.2 Service Implementation Patterns

**Pure Function Services**:

```typescript
// Stateless service functions
export function inferModelRequirements(workflow: ExportApiWorkflow): ModelRequirement[] {
  // Pure function - no side effects
}

export function modelPaths(modelPrefix: string, req: ModelRequirement): PathInfo {
  // Deterministic path generation
}
```

**Error Boundary Pattern**:

```typescript
// Graceful error handling in API routes
export async function POST(req: NextRequest) {
  try {
    // ... operation logic
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### 10.3 Repository Implementation Patterns

**File-Based Repository**:

```typescript
// Atomic file operations
export function saveTemplate(tpl: WorkflowTemplate) {
  ensureDir() // Create directory if needed
  const content = JSON.stringify(tpl, null, 2)
  fs.writeFileSync(filePath(tpl.slug), content, 'utf8')
}

// Safe read operations
export function getTemplate(slug: string): WorkflowTemplate | null {
  try {
    const raw = fs.readFileSync(filePath(slug), 'utf8')
    return JSON.parse(raw) as WorkflowTemplate
  } catch {
    return null // File not found or invalid JSON
  }
}
```

## 11. Testing Architecture

### Testing Strategy

**Layer-Specific Testing**:

- **API Routes**: Integration tests with mock external services
- **Domain Logic**: Unit tests for pure functions
- **Components**: React Testing Library for user interactions
- **E2E**: Planned for critical workflows

**Mock Strategy**:

```typescript
// External service mocking
jest.mock('@/lib/runpod', () => ({
  runSync: jest.fn(),
  runAsync: jest.fn(),
  getStatus: jest.fn()
}))

// File system mocking for template operations
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}))
```

## 12. Deployment Architecture

### Runtime Environment

**Next.js Serverless Deployment**:

- API routes deploy as serverless functions
- Static assets served from CDN
- Environment variables injected at runtime

**External Dependencies**:

```bash
Next.js App (Vercel/Self-hosted)
├─ Environment Variables (secrets)
├─ RunPod Network Volume (S3-compatible)
├─ RunPod Serverless GPU (ComfyUI worker)
└─ Backblaze B2 (output storage)
```

**Worker Deployment**:

```dockerfile
# Custom Docker image for RunPod
FROM comfyui/base-image
COPY worker/src ./src
ENV COMFY_ARGS="--extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml"
CMD ["python3", "-m", "runpod.serverless.start", "--handler", "src.handler"]
```

### Configuration Management

**Environment Variable Structure**:

```bash
# RunPod Integration
RUNPOD_API_KEY=rp_***            # API authentication
RUNPOD_ENDPOINT_ID=***           # Serverless endpoint
RUNPOD_S3_ENDPOINT=https://***   # S3-compatible endpoint
RUNPOD_VOLUME_ID=***             # Network volume (bucket name)

# Storage Configuration
RUNPOD_MODEL_DIR_UNET=unet       # Model directory mapping
RUNPOD_MODEL_DIR_CLIP=clip       # per model type
# ... additional model directories

# Output Storage
B2_S3_ENDPOINT=https://***       # Backblaze B2 endpoint
B2_S3_BUCKET=***                 # Output bucket
```

## 13. Extension and Evolution Patterns

### 13.1 Feature Addition Patterns

**New Workflow Support**:

1. Add template JSON to `data/workflows/`
2. System automatically infers field specifications
3. No code changes required for standard ComfyUI nodes

**New Node Type Support**:

```typescript
// Extend node mapping for field inference
const NODE_MODEL_MAP = [
  // Existing mappings...
  { classType: 'NewNodeType', inputKey: 'new_input', modelType: 'new_type' }
]
```

**New Storage Provider**:

```typescript
// Implement S3-compatible interface
export const newProvider = new S3Client({
  region: req('NEW_PROVIDER_REGION'),
  endpoint: req('NEW_PROVIDER_ENDPOINT')
  // ... configuration
})
```

### 13.2 Integration Patterns

**New External Service Integration**:

1. Create client in `src/lib/`
2. Add API route in `src/app/api/`
3. Update environment variable configuration
4. Add Zod schemas for request/response validation

**Plugin Architecture** (Planned):

```typescript
// Extensible field inference
interface FieldInferencePlugin {
  canHandle(node: ExportApiNode): boolean
  inferFields(nodeId: string, node: ExportApiNode): FieldSpec[]
}

// Plugin registry
const plugins: FieldInferencePlugin[] = [new ImageLoaderPlugin(), new TextEncoderPlugin(), new CustomNodePlugin()]
```

## 14. Architecture Governance

### Consistency Enforcement

**Type Safety**:

- Strict TypeScript configuration
- Zod schemas at all API boundaries
- No `any` types in production code

**Code Organization**:

- Clear separation of concerns by directory structure
- Functional programming for domain logic
- Immutable data patterns

**API Design**:

- RESTful naming conventions
- Consistent error response format
- Schema-driven development

### Architectural Review Process

**File Structure Conventions**:

```bash
src/
├─ app/                 # Next.js App Router (pages + API routes)
├─ components/          # Reusable React components
└─ lib/                 # Domain logic and infrastructure
   ├─ templates.*       # Template management
   ├─ workflow.*        # Workflow processing
   ├─ runpod*          # RunPod integration
   └─ *.ts             # Utility modules
```

**Naming Conventions**:

- `*.schema.ts`: Zod schema definitions
- `*.types.ts`: TypeScript type definitions
- `*.fs.ts`: File system operations
- `route.ts`: Next.js API route handlers

## 15. Blueprint for New Development

### Development Workflow

**Adding New API Endpoint**:

1. Define Zod schemas for request/response
2. Create API route in `src/app/api/`
3. Implement domain logic in `src/lib/`
4. Add client-side integration
5. Update type definitions

**Adding New Workflow Template**:

1. Export workflow from ComfyUI (API format)
2. Save as JSON in `data/workflows/`
3. Test field inference with `/api/workflows/[slug]`
4. Verify model requirements with preflight API

**Extending Field Inference**:

```typescript
// Add new node type support
if (classType === 'NewCustomNode') {
  fields.push({
    id: `custom_${nodeId}_input`,
    label: 'Custom Input',
    type: 'string', // or other supported type
    required: true,
    nodeId,
    inputKey: 'custom_input',
    help: 'Help text for users'
  })
}
```

### Implementation Templates

**API Route Template**:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  // Define request schema
})

const ResponseSchema = z.object({
  // Define response schema
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Business logic here
    const result = await someOperation(parsed.data)

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Domain Service Template**:

```typescript
import { z } from 'zod'

// Schema definitions
export const InputSchema = z.object({
  // Define input validation
})

export const OutputSchema = z.object({
  // Define output structure
})

// Type exports
export type Input = z.infer<typeof InputSchema>
export type Output = z.infer<typeof OutputSchema>

// Pure function implementation
export function processInput(input: Input): Output {
  // Validation
  const validated = InputSchema.parse(input)

  // Business logic
  const result = transformData(validated)

  // Return typed result
  return OutputSchema.parse(result)
}
```

### Common Pitfalls

**Architecture Violations to Avoid**:

- Importing infrastructure directly in React components
- Using `any` types instead of proper Zod schemas
- Circular dependencies between layers
- Exposing secrets to client-side code

**Performance Considerations**:

- Large workflow payloads should use async mode
- File uploads should stream directly to S3
- Polling intervals should be reasonable (2-5 seconds)
- Model validation should cache results when possible

**Testing Blind Spots**:

- External service failure scenarios
- Large file upload edge cases
- Malformed ComfyUI workflow handling
- Environment variable validation

---

_This architecture blueprint was generated on September 5, 2025. It should be updated as the system evolves, particularly when adding new external integrations or changing core architectural patterns._
