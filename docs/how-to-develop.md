# How to Develop — Media Labs

This guide provides step-by-step instructions for setting up, running, debugging, and contributing to Media Labs locally. Follow these recipes to solve common development challenges and get productive quickly.

**Target Audience:** Developers new to the Media Labs project
**Goal:** Successfully set up a local development environment and understand the development workflow

## 1. Prerequisites & Environment Setup

### System Requirements

**Essential:**

- Node.js 20+ (22+ recommended for optimal performance)
- Git for version control
- A text editor or IDE (VS Code recommended for best Copilot integration)

**Verify your Node.js version:**

```bash
node --version  # Should show v20.0.0 or higher
npm --version   # Should show 10.0.0 or higher
```

### Required External Accounts

Before you can run Media Labs locally, you need access to these services:

**RunPod Account:**

- Serverless ComfyUI endpoint
- Network Volume (same datacenter as endpoint)
- S3 API key for Network Volume access

**Backblaze B2 Account:**

- S3-compatible bucket for output storage
- Application keys with read/write access

### Architecture Understanding

Media Labs connects three key systems:

1. **Your Local App** (Next.js) - Upload files and manage workflows
2. **RunPod Network Volume** (S3-compatible) - Store model files and inputs
3. **Backblaze B2** (S3-compatible) - Store workflow outputs

The critical insight: **No base64 encoding**. Files are uploaded directly to RunPod's S3, and workers read them by absolute path (`/runpod-volume/inputs/job123/image.png`).

## 2. Initial Project Setup

### Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/MikeBlakeway/media-labs.git
cd media-labs

# Switch to development branch
git checkout development

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected packages:** Next.js 15.5.2, React 19.1.0, AWS SDK v3.879.0, Zod 4.1.5

### Environment Configuration

Create `.env.local` in your project root:

```bash
# Runpod - Job submission
RUNPOD_API_KEY=rp_your_api_key_here
RUNPOD_ENDPOINT_ID=your_endpoint_id_here

# Runpod Network Volume (S3-compatible storage)
RUNPOD_S3_ENDPOINT=https://s3api-eu-ro-1.runpod.io
RUNPOD_S3_REGION=eu-ro-1
RUNPOD_VOLUME_ID=your_volume_id_here
RUNPOD_S3_ACCESS_KEY_ID=user_your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=rps_your_secret_key

# Backblaze B2 (Output storage)
B2_S3_ENDPOINT=https://s3.eu-west-000.backblazeb2.com
B2_S3_REGION=eu-west-000
B2_S3_BUCKET=your-b2-bucket-name
B2_S3_ACCESS_KEY_ID=your_b2_key_id
B2_S3_SECRET_ACCESS_KEY=your_b2_secret_key

# Model directory mappings (optional - these are defaults)
RUNPOD_MODEL_DIR_UNET=unet
RUNPOD_MODEL_DIR_CLIP=clip
RUNPOD_MODEL_DIR_CLIP_VISION=clip_vision
RUNPOD_MODEL_DIR_VAE=vae
RUNPOD_MODEL_DIR_LORA=loras
RUNPOD_MODEL_DIR_CHECKPOINTS=checkpoints
```

**Finding your credentials:**

- RunPod API key: RunPod Console → Settings → API Keys
- Endpoint ID: RunPod Console → Serverless → Your endpoint (in URL)
- Network Volume ID: RunPod Console → Storage → Network Volumes
- S3 credentials: RunPod Console → Storage → Your volume → Credentials tab

### Model Storage Migration (Critical)

**If you're migrating from an existing setup:**

Media Labs requires models to be stored under `models/<type>/...` at your S3 bucket root. If you previously used `ComfyUI/models/`, you must migrate:

```bash
# Example migration using AWS CLI
aws s3 sync s3://your-volume-id/ComfyUI/models/checkpoints/ s3://your-volume-id/models/checkpoints/ --endpoint-url=https://s3api-eu-ro-1.runpod.io
aws s3 sync s3://your-volume-id/ComfyUI/models/unet/ s3://your-volume-id/models/unet/ --endpoint-url=https://s3api-eu-ro-1.runpod.io
# Repeat for clip, vae, loras, etc.
```

**Verify your model structure:**

```bash
# Should show: models/unet/, models/clip/, models/vae/, etc.
aws s3 ls s3://your-volume-id/models/ --endpoint-url=https://s3api-eu-ro-1.runpod.io
```

### Verify Connectivity

Test your connections before starting development:

```bash
# Test basic setup
npm run dev

# In another terminal, test API endpoints
curl http://localhost:3000/api/workflows/list
```

**Expected result:** Empty array `[]` or list of existing workflows.

## 3. Running the Development Server

### Start Development Mode

```bash
# Start with Turbopack for faster builds
npm run dev
```

**What happens:**

- Next.js starts on `http://localhost:3000`
- Turbopack provides fast hot-reloading
- API routes are available at `/api/*`
- File watching is enabled for automatic rebuilds

### Key Development URLs

- **Main App:** `http://localhost:3000`
- **Workflow List:** `http://localhost:3000/api/workflows/list`
- **Health Check:** `http://localhost:3000/api/volume/upload` (should return 405 Method Not Allowed)

### Development Workflow

**Typical development session:**

1. Start dev server: `npm run dev`
2. Make code changes
3. Browser auto-refreshes with changes
4. Check browser console and terminal for errors
5. Test API endpoints manually or via UI

**File watching includes:**

- `src/` directory changes
- `data/workflows/*.json` changes
- Configuration file changes

## 4. Development Workflow

### Code Organization

Media Labs follows a strict architectural pattern:

```text
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Server-side API endpoints
│   │   ├── workflows/     # Workflow management
│   │   ├── volume/        # File uploads to RunPod
│   │   └── runpod/        # Job status and management
│   └── w/[slug]/          # Dynamic workflow pages
├── components/            # Reusable React components
├── lib/                   # Business logic and utilities
│   ├── *.schema.ts        # Zod validation schemas
│   ├── *.types.ts         # TypeScript type definitions
│   └── runpodVolume.ts    # S3 client configuration
└── db/                    # Database schemas (future)
```

### Working with API Routes

All API routes follow this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs' // Always declare runtime

const RequestSchema = z.object({
  // Define your schema
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Your logic here
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### S3 Storage Patterns

**Reading from RunPod S3:**

```typescript
import { runpodS3, RUNPOD_BUCKET } from '@/lib/runpodVolume'
import { HeadObjectCommand } from '@aws-sdk/client-s3'

// Check if file exists (preferred method)
async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await runpodS3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (err) {
    // Defensive error handling for S3-compatible endpoints
    if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>
      const rawResp = obj['$response']
      if (rawResp && typeof rawResp === 'object') {
        const statusVal = (rawResp as Record<string, unknown>)['statusCode']
        if (typeof statusVal === 'number' && statusVal === 404) return false
      }
    }
    return false
  }
}
```

### Working with Workflow Templates

Templates are stored in `data/workflows/*.json` and managed via:

```typescript
import { getTemplate, saveTemplate } from '@/lib/templates.fs'

// Load a workflow
const workflow = getTemplate('my-workflow')
if (!workflow) {
  // Handle not found
}

// Save a workflow
const newWorkflow = {
  slug: 'my-new-workflow',
  name: 'My New Workflow',
  workflow: {
    /* ComfyUI export JSON */
  },
  fields: [
    /* field definitions */
  ]
}
saveTemplate(newWorkflow)
```

## 5. Debugging Common Issues

### S3 Connectivity Problems

**Symptom:** "Error: getaddrinfo ENOTFOUND" or timeout errors

**Solution:**

```bash
# Test AWS CLI connectivity
aws s3 ls s3://your-volume-id/ --endpoint-url=your-endpoint --region=your-region

# Check environment variables
echo $RUNPOD_S3_ENDPOINT
echo $RUNPOD_VOLUME_ID
```

**Common causes:**

- Wrong endpoint URL format
- Incorrect region
- Network firewall blocking requests

### Model Path Resolution Issues

**Symptom:** "Value not in list" errors in ComfyUI workflows

**Solution:**

1. Verify model storage structure:

```bash
aws s3 ls s3://your-volume-id/models/ --recursive --endpoint-url=your-endpoint
```

1. Check model path computation:

```typescript
// In your code, verify modelPaths() output
import { modelPaths } from '@/lib/workflow.preflight'
const { s3Key, workerPath } = modelPaths('models', {
  type: 'unet',
  name: 'your-model.safetensors'
})
console.log({ s3Key, workerPath })
```

### RunPod Endpoint Troubleshooting

**Symptom:** 400/500 errors when submitting jobs

**Debug steps:**

1. Check endpoint status in RunPod Console
2. Verify Network Volume is attached
3. Test with minimal workflow:

```bash
curl -X POST https://api.runpod.ai/v2/your-endpoint-id/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": {"workflow": {}}}'
```

### Environment Variable Validation

**Quick validation script:**

```typescript
// Create src/scripts/validate-env.ts
function validateEnv() {
  const required = ['RUNPOD_API_KEY', 'RUNPOD_ENDPOINT_ID', 'RUNPOD_S3_ENDPOINT', 'RUNPOD_VOLUME_ID']

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing: ${key}`)
    } else {
      console.log(`✓ ${key}: ${process.env[key]?.substring(0, 10)}...`)
    }
  }
}
```

### Log Analysis

**Development logs to monitor:**

```bash
# Terminal 1: Development server
npm run dev

# Terminal 2: Monitor specific operations
tail -f .next/trace  # Build traces (if available)
```

**Browser DevTools:**

- Network tab: Check API request/response details
- Console: Look for client-side errors
- Application tab: Verify localStorage/sessionStorage

## 6. Testing and Quality Assurance

### Running Linting and Type Checking

```bash
# Type checking
npm run build  # TypeScript compilation happens during build

# Linting
npm run lint

# Fix auto-fixable lint issues
npm run lint -- --fix
```

**Expected results:**

- No TypeScript compilation errors
- No ESLint errors (warnings are acceptable during development)

### Testing S3 Operations

**Manual S3 tests:**

```bash
# Test file upload
curl -X POST http://localhost:3000/api/volume/upload \
  -F "file=@/path/to/test-image.png"

# Expected response:
# {
#   "key": "inputs/job123/test-image.png",
#   "workerPath": "/runpod-volume/inputs/job123/test-image.png",
#   "jobId": "job123",
#   "filename": "test-image.png",
#   "size": 12345,
#   "contentType": "image/png"
# }
```

### Validating Workflow Execution

**Test workflow registration:**

```bash
# Upload a workflow JSON file via the UI or:
curl -X POST http://localhost:3000/api/workflows/register \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-workflow",
    "name": "Test Workflow",
    "workflow": { /* your ComfyUI export JSON */ }
  }'
```

### Performance Monitoring

**Watch for these metrics:**

- API response times (should be < 2s for most operations)
- File upload speeds (depends on file size and connection)
- Build times with Turbopack (should be fast)

**Performance debugging:**

```bash
# Monitor memory usage
ps aux | grep node

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/workflows/list
```

## 7. Contributing Guidelines

### Code Style and Formatting

Media Labs enforces strict coding standards:

**TypeScript Rules:**

- Never use `any` type
- Use `z.infer<>` for type definitions from Zod schemas
- Prefer explicit typing for public APIs

**Naming Conventions:**

- Functions: `camelCase` (`sanitizeFilename`, `objectExists`)
- Types: `PascalCase` with descriptive suffixes (`ModelRequirement`, `TemplateMeta`)
- Constants: `UPPER_SNAKE_CASE` (`RUNPOD_BUCKET`, `MAX_UPLOAD_BYTES`)

**Zod Validation Pattern:**

```typescript
const parsed = Schema.safeParse(payload)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

### Git Workflow

**Branch Strategy:**

```bash
# Start from development branch
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit frequently
git add .
git commit -m "feat: add new workflow validation"

# Push and create PR
git push origin feature/your-feature-name
```

**Commit Message Format:**

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for test additions

### Pull Request Guidelines

**Before submitting:**

1. Run `npm run lint` and fix all errors
2. Run `npm run build` to verify TypeScript compilation
3. Test your changes locally
4. Update documentation if needed

**PR Description Template:**

```markdown
## What

Brief description of changes

## Why

Reason for the change

## How

Technical approach used

## Testing

How you verified the changes work

## Breaking Changes

Any breaking changes (if applicable)
```

### Documentation Standards

**When to update docs:**

- Adding new API endpoints
- Changing environment variables
- Modifying setup procedures
- Adding new troubleshooting solutions

**Documentation locations:**

- `README.md` - Quick start and overview
- `docs/how-to-develop.md` - This guide
- `docs/requirements.md` - Technical requirements
- `.github/copilot-instructions.md` - AI coding guidelines

## 8. Troubleshooting Reference

### Common Error Messages and Solutions

#### "Missing env var: RUNPOD_API_KEY"

- **Cause:** Environment variable not set
- **Solution:** Check `.env.local` file exists and contains the variable

#### "getaddrinfo ENOTFOUND s3api-xx-xx-x.runpod.io"

- **Cause:** DNS resolution failure
- **Solution:** Verify endpoint URL format and internet connectivity

#### "Value not in list" (ComfyUI error)

- **Cause:** Model file not found at expected path
- **Solution:** Verify model storage structure and migration

#### "Cannot read properties of undefined (reading 'slug')"

- **Cause:** Missing workflow template
- **Solution:** Check `data/workflows/` directory for the expected JSON file

### Environment-Specific Issues

**macOS:**

- May need to install Xcode Command Line Tools: `xcode-select --install`
- Node.js permission issues: Use `nvm` instead of system Node.js

**Windows:**

- Use WSL2 for best compatibility
- PowerShell may require execution policy changes

**Linux:**

- Ensure proper Node.js installation via package manager
- Check firewall settings for port 3000

### Performance Optimization Tips

**Development Speed:**

- Use `npm run dev` (includes Turbopack)
- Keep only necessary browser tabs open
- Monitor memory usage if uploads are slow

**Build Optimization:**

- Run `npm run build` periodically to catch TypeScript errors early
- Clear `.next` directory if builds become slow: `rm -rf .next`

### Useful Command Reference

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Environment testing
curl http://localhost:3000/api/workflows/list
aws s3 ls s3://your-bucket --endpoint-url=your-endpoint

# Debugging
npm list --depth=0      # Check installed dependencies
node --version          # Verify Node.js version
git status              # Check current branch and changes

# File operations
find . -name "*.ts" -o -name "*.tsx" | head -10  # Find TypeScript files
grep -r "RUNPOD_API_KEY" src/                    # Search for environment usage

# Process management
lsof -i :3000          # Check what's using port 3000
pkill -f "next dev"    # Kill development server if stuck
```

---

**Need help?** Check the existing issues in the GitHub repository or create a new issue with:

- Your operating system
- Node.js version
- Complete error message
- Steps you've already tried
