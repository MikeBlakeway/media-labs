# Deployment Guide

## Overview

Media Labs is deployed on Vercel with automatic Git integration and manual deploy hooks for flexible deployment strategies.

## Deployment Environments

### Production Environment

- **Branch**: `main`
- **URL**: <https://media-labs-5idte9dqg-media-labs.vercel.app>
- **Trigger**: Automatic on push/merge to `main` branch
- **Environment Variables**: Production-ready (RunPod, B2 storage, etc.)

### Preview Environment (Beta)

- **Branch**: `development`
- **URL**: Generated preview URLs (e.g., `media-labs-git-development-media-labs.vercel.app`)
- **Trigger**: Automatic on push to `development` branch
- **Environment Variables**: Same as production (suitable for testing)

## Automatic Git Integration

The project is connected to GitHub repository `MikeBlakeway/media-labs` with automatic deployments enabled:

### Workflow

1. **Development**: Push changes to `development` branch → Preview deployment
2. **Release**: Merge `development` to `main` → Production deployment
3. **Pull Requests**: Each PR gets unique preview URL for testing

### Branch Strategy

- `development` branch → Preview deployments for testing
- `main` branch → Production deployments for live site
- Feature branches → Additional preview deployments

## Manual Deploy Hooks

For advanced deployment scenarios, manual deploy hooks are configured:

### Beta Deploy Hook (Development Branch)

```bash
# Trigger development branch deployment
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF"
```

- **Purpose**: Deploy `development` branch to preview environment
- **Use Cases**: CI/CD integration, manual testing triggers, external system integration

### Production Deploy Hook (Main Branch)

```bash
# Trigger production deployment
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/KXEBf6r9Jk"
```

- **Purpose**: Deploy `main` branch to production environment
- **Use Cases**: Emergency deployments, scheduled deployments, external triggers

## Environment Variables

All environments are configured with the following variables:

### Required (Core Functionality)

- `RUNPOD_API_KEY`: RunPod API authentication
- `RUNPOD_ENDPOINT_ID`: ComfyUI serverless endpoint
- `USE_LOCAL_WORKER`: Set to `false` for production

### RunPod S3 Volume (Model Storage)

- `RUNPOD_S3_ENDPOINT`: <https://s3api-eu-ro-1.runpod.io>
- `RUNPOD_S3_REGION`: eu-ro-1
- `RUNPOD_VOLUME_ID`: axqw0i289u
- `RUNPOD_S3_ACCESS_KEY_ID`: RunPod S3 access key
- `RUNPOD_S3_SECRET_ACCESS_KEY`: RunPod S3 secret key

### Backblaze B2 (Output Storage)

- `BUCKET_ENDPOINT_URL`: s3.eu-central-003.backblazeb2.com
- `BUCKET_REGION`: eu-central-003
- `BUCKET_NAME`: media-labs
- `BUCKET_ACCESS_KEY_ID`: B2 access key
- `BUCKET_SECRET_ACCESS_KEY`: B2 secret key

### Model Configuration

- `RUNPOD_MODELS_PREFIX`: models

## Deployment Commands

### Via Vercel CLI

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
vercel --prod --target production
```

### Via Git (Automatic)

```bash
# Deploy to preview (development)
git checkout development
git push origin development

# Deploy to production (main)
git checkout main
git push origin main
```

### Via Deploy Hooks

```bash
# Development deployment
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF"

# Production deployment
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/KXEBf6r9Jk"
```

## CI/CD Integration Examples

### GitHub Actions Integration

```yaml
name: Deploy to Vercel
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deployment
        run: |
          if [ "${{ github.event.inputs.environment }}" == "production" ]; then
            curl -X POST "${{ secrets.VERCEL_PRODUCTION_HOOK }}"
          else
            curl -X POST "${{ secrets.VERCEL_BETA_HOOK }}"
          fi
```

### External System Integration

```javascript
// Example: Trigger deployment from external system
const deployToVercel = async (environment = 'development') => {
  const hooks = {
    development: 'https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF',
    production: 'https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/KXEBf6r9Jk'
  }

  const response = await fetch(hooks[environment], { method: 'POST' })
  const result = await response.json()

  console.log(`Deployment triggered: ${result.job.id}`)
  return result.job
}
```

## Monitoring & Verification

### Check Deployment Status

1. **Vercel Dashboard**: <https://vercel.com/media-labs/media-labs/deployments>
2. **CLI**: `vercel list` to see recent deployments
3. **API Response**: Deploy hooks return job ID for tracking

### Live URLs

- **Production**: Check latest production URL in Vercel dashboard
- **Preview**: Monitor preview URLs in GitHub PR comments
- **Branch-specific**: `https://media-labs-git-{branch}-media-labs.vercel.app`

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all required variables are set for target environment
2. **Build Errors**: Check build logs in Vercel dashboard
3. **Branch Mismatch**: Verify correct branch is being deployed

### Deploy Hook Debugging

```bash
# Test deploy hook with verbose output
curl -X POST -v "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF"

# Expected response format:
# {"job":{"id":"deployment_id","state":"PENDING","createdAt":timestamp}}
```

## Security Considerations

- **Deploy Hook URLs**: Treat as sensitive credentials - don't expose in public repositories
- **Environment Variables**: All secrets are encrypted in Vercel
- **Branch Protection**: Consider protecting `main` branch to require PR reviews

## Related Documentation

- [Vercel Git Integration](https://vercel.com/docs/git)
- [Vercel Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [GitHub Integration](https://vercel.com/docs/git/vercel-for-github)
