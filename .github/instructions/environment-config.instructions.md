---
applyTo: '.env.example,src/lib/*config*,src/lib/runpodVolume.ts'
description: 'Environment variable management and configuration'
---

# Environment Configuration Instructions

## Environment Variable Management Standards

Maintain secure and consistent environment configuration patterns across all environments.

### Required Environment Variables

#### Core Application Configuration

```bash
# Next.js Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# RunPod Core Configuration (Required)
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_ENDPOINT_ID=your_runpod_endpoint_id_here
```

#### RunPod S3 Volume Configuration (Optional)

```bash
# S3-Compatible Storage for RunPod Volume
RUNPOD_S3_ACCESS_KEY_ID=your_s3_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_s3_secret_key
RUNPOD_S3_ENDPOINT=https://volume_id.vol.runpod.net
RUNPOD_S3_REGION=us-east-1
RUNPOD_VOLUME_ID=your_volume_id_here
```

#### Model Directory Mapping

```bash
# Model storage paths within S3 volume
RUNPOD_MODEL_DIR_UNET=models/diffusion_models
RUNPOD_MODEL_DIR_CLIP=models/clip
RUNPOD_MODEL_DIR_CLIP_VISION=models/clip_vision
RUNPOD_MODEL_DIR_VAE=models/vae
RUNPOD_MODEL_DIR_LORA=models/loras
RUNPOD_MODEL_DIR_CHECKPOINTS=models/checkpoints
```

#### Output Storage Configuration (Optional)

```bash
# Backblaze B2 or S3-Compatible Storage for Results
BUCKET_ACCESS_KEY_ID=your_b2_access_key
BUCKET_SECRET_ACCESS_KEY=your_b2_secret_key
BUCKET_ENDPOINT_URL=https://s3.us-west-002.backblazeb2.com
BUCKET_REGION=us-west-002
BUCKET_NAME=your_bucket_name
```

### Configuration Validation Patterns

#### Required Environment Variable Checker

```typescript
// src/lib/config.ts
function req(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v
  }
  throw new Error(`[config] Missing one of: ${names.join(', ')}`)
}

// Usage example
export const runpodConfig = {
  apiKey: req('RUNPOD_API_KEY'),
  endpointId: req('RUNPOD_ENDPOINT_ID'),
  volumeId: process.env.RUNPOD_VOLUME_ID // Optional
}
```

#### Optional Environment Variable Handler

```typescript
function opt(name: string, defaultValue: string = ''): string {
  return process.env[name]?.trim() || defaultValue
}

// Usage example
export const appConfig = {
  nodeEnv: opt('NODE_ENV', 'development'),
  debugMode: opt('DEBUG_MODE', 'false') === 'true',
  maxUploadSize: parseInt(opt('MAX_UPLOAD_SIZE', '209715200'), 10) // 200MB default
}
```

### Server-Side Only Configuration

#### Secure Credential Handling

```typescript
// Never expose these to client-side
const serverOnlyConfig = {
  runpod: {
    apiKey: req('RUNPOD_API_KEY'),
    endpointId: req('RUNPOD_ENDPOINT_ID')
  },
  s3: {
    accessKeyId: process.env.RUNPOD_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.RUNPOD_S3_SECRET_ACCESS_KEY,
    endpoint: process.env.RUNPOD_S3_ENDPOINT,
    region: opt('RUNPOD_S3_REGION', 'us-east-1')
  },
  bucket: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
    endpoint: process.env.BUCKET_ENDPOINT_URL,
    name: process.env.BUCKET_NAME
  }
}

// Export only what's needed
export { serverOnlyConfig }
```

#### Client-Safe Configuration

```typescript
// Only public-safe values for client components
export const clientConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  environment: process.env.NODE_ENV || 'development',
  maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '104857600', 10) // 100MB
}
```

### Environment File Management

#### .env.example Template Structure

```bash
# =================================================================
# Media Labs Environment Configuration
# Copy this file to .env and fill in your actual values
# =================================================================

# Required: RunPod Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_ENDPOINT_ID=your_runpod_endpoint_id_here

# Optional: RunPod S3 Volume (for custom model storage)
# RUNPOD_S3_ACCESS_KEY_ID=your_s3_access_key
# RUNPOD_S3_SECRET_ACCESS_KEY=your_s3_secret_key
# RUNPOD_S3_ENDPOINT=https://volume_id.vol.runpod.net
# RUNPOD_S3_REGION=us-east-1
# RUNPOD_VOLUME_ID=your_volume_id

# Optional: Output Storage (Backblaze B2 or S3-compatible)
# BUCKET_ACCESS_KEY_ID=your_b2_access_key
# BUCKET_SECRET_ACCESS_KEY=your_b2_secret_key
# BUCKET_ENDPOINT_URL=https://s3.us-west-002.backblazeb2.com
# BUCKET_REGION=us-west-002
# BUCKET_NAME=your_bucket_name

# Development Options
# USE_LOCAL_WORKER=false
# LOCAL_WORKER_URL=http://localhost:8000
# DEBUG_MODE=false
# MAX_UPLOAD_BYTES=209715200
```

#### Environment File Security

```gitignore
# .gitignore - Never commit actual environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Keep templates
!.env.example
```

### Configuration Loading Patterns

#### Next.js Environment Loading

```typescript
// next.config.ts
const nextConfig = {
  env: {
    // Only expose public variables
    CUSTOM_KEY: process.env.CUSTOM_KEY
  }
  // Server-side variables are automatically available
}

export default nextConfig
```

#### Runtime Configuration Validation

```typescript
// src/lib/validateConfig.ts
export function validateConfig() {
  const errors: string[] = []

  // Check required variables
  if (!process.env.RUNPOD_API_KEY) {
    errors.push('RUNPOD_API_KEY is required')
  }

  if (!process.env.RUNPOD_ENDPOINT_ID) {
    errors.push('RUNPOD_ENDPOINT_ID is required')
  }

  // Validate S3 configuration if any S3 variable is set
  const s3Vars = ['RUNPOD_S3_ACCESS_KEY_ID', 'RUNPOD_S3_SECRET_ACCESS_KEY', 'RUNPOD_S3_ENDPOINT']
  const hasAnyS3Var = s3Vars.some(v => process.env[v])
  const hasAllS3Vars = s3Vars.every(v => process.env[v])

  if (hasAnySS3Var && !hasAllS3Vars) {
    errors.push('If using S3 volume, all S3 variables must be set: ' + s3Vars.join(', '))
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`)
  }

  return true
}
```

### Environment-Specific Configurations

#### Development Configuration

```typescript
// src/lib/config.dev.ts
export const devConfig = {
  useLocalWorker: opt('USE_LOCAL_WORKER', 'false') === 'true',
  localWorkerUrl: opt('LOCAL_WORKER_URL', 'http://localhost:8000'),
  debugMode: opt('DEBUG_MODE', 'true') === 'true',
  logLevel: opt('LOG_LEVEL', 'debug')
}
```

#### Production Configuration

```typescript
// src/lib/config.prod.ts
export const prodConfig = {
  useLocalWorker: false,
  debugMode: false,
  logLevel: opt('LOG_LEVEL', 'info'),
  enableAnalytics: opt('ENABLE_ANALYTICS', 'true') === 'true'
}
```

### Configuration Documentation

#### Inline Documentation Pattern

```typescript
export const config = {
  // RunPod API configuration
  runpod: {
    /** RunPod API key for authentication */
    apiKey: req('RUNPOD_API_KEY'),
    /** RunPod serverless endpoint ID */
    endpointId: req('RUNPOD_ENDPOINT_ID'),
    /** Optional: RunPod volume ID for custom models */
    volumeId: process.env.RUNPOD_VOLUME_ID
  },

  // Upload limits and constraints
  upload: {
    /** Maximum file size in bytes (default: 200MB) */
    maxBytes: parseInt(opt('MAX_UPLOAD_BYTES', '209715200'), 10),
    /** Allowed MIME types for uploads */
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
}
```

### Error Handling for Configuration

#### Graceful Configuration Errors

```typescript
try {
  validateConfig()
  console.log('✅ Configuration validated successfully')
} catch (error) {
  console.error('❌ Configuration validation failed:')
  console.error(error.message)
  console.error('\nPlease check your .env file and ensure all required variables are set.')
  process.exit(1)
}
```

#### Environment-Specific Error Messages

```typescript
function getConfigError(variable: string): string {
  const env = process.env.NODE_ENV || 'development'

  if (env === 'development') {
    return `Missing ${variable}. Copy .env.example to .env and set this value.`
  }

  return `Missing required environment variable: ${variable}`
}
```

### Testing Configuration

#### Mock Environment for Tests

```typescript
// src/__tests__/setup.ts
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    RUNPOD_API_KEY: 'test-api-key',
    RUNPOD_ENDPOINT_ID: 'test-endpoint-id',
    NODE_ENV: 'test'
  }
})

afterEach(() => {
  process.env = originalEnv
})
```

### Configuration Utilities

#### Environment Type Checking

```typescript
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}
```

#### Feature Flag Management

```typescript
export const featureFlags = {
  enableNewUI: opt('FEATURE_NEW_UI', 'false') === 'true',
  enableBetaFeatures: opt('FEATURE_BETA', 'false') === 'true',
  enableAnalytics: opt('FEATURE_ANALYTICS', isProduction().toString()) === 'true'
}
```

### Deployment Configuration

#### Vercel Environment Variables

```bash
# Set via Vercel dashboard or CLI
vercel env add RUNPOD_API_KEY
vercel env add RUNPOD_ENDPOINT_ID

# For different environments
vercel env add RUNPOD_API_KEY production
vercel env add RUNPOD_API_KEY preview
```

#### Docker Environment Handling

```dockerfile
# Dockerfile
ENV NODE_ENV=production
ENV RUNPOD_API_KEY=
ENV RUNPOD_ENDPOINT_ID=

# Pass environment variables at runtime
# docker run -e RUNPOD_API_KEY=value -e RUNPOD_ENDPOINT_ID=value app
```

Refer to [Next.js environment variables documentation](https://nextjs.org/docs/basic-features/environment-variables) and [Vercel environment configuration](https://vercel.com/docs/concepts/projects/environment-variables) for platform-specific guidance.
