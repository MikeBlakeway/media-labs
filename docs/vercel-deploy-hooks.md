# Vercel Deploy Hooks - Quick Reference

## Media Labs Deploy Hooks

### Development Environment (Beta)

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF"
```

- **Branch**: `development`
- **Environment**: Preview
- **URL Pattern**: `media-labs-git-development-*.vercel.app`

### Production Environment

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/KXEBf6r9Jk"
```

- **Branch**: `main`
- **Environment**: Production
- **URL**: `media-labs.vercel.app`

## Usage Examples

### Manual Testing

```bash
# Deploy development for testing
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF"

# Deploy production (use with caution)
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/KXEBf6r9Jk"
```

### In Scripts

```bash
#!/bin/bash
# deploy-dev.sh
echo "Deploying development branch..."
response=$(curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF")
job_id=$(echo $response | jq -r '.job.id')
echo "Deployment started: $job_id"
```

### JavaScript/Node.js

```javascript
const deployDev = async () => {
  const response = await fetch('https://api.vercel.com/v1/integrations/deploy/prj_cVVM0NdlMfqsKoNSRuWgrZPwKZEd/u0wCKFj5fF', {
    method: 'POST'
  })
  const result = await response.json()
  console.log('Development deployment:', result.job.id)
}
```

## Response Format

```json
{
  "job": {
    "id": "Y95FDnuGEznJfPWJ9fOD",
    "state": "PENDING",
    "createdAt": 1757780932116
  }
}
```

## Security Notes

- These URLs are **sensitive credentials**
- Do not commit to public repositories
- Use environment variables or secrets management
- Consider IP restrictions for production hooks

## Monitoring

- Check deployment status: <https://vercel.com/media-labs/media-labs/deployments>
- Monitor via job ID returned from webhook calls
- Set up notifications for deployment status changes
