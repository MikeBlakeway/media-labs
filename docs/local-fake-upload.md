# Local Fake Upload Handler - Developer Guide

## Overview

The Local Fake Upload Handler is a development-focused API endpoint that solves Next.js Server Actions body-size limitations (default 1MB) when working with image uploads in `local_fake` mode. Instead of sending large binary image data directly in Server Action payloads, developers can upload images separately and send only small URL references in job creation requests.

## Why This Exists

- **Server Actions Limitation**: Next.js Server Actions have a 1MB request body limit by default
- **Large Image Uploads**: Video job creation requires uploading start and end images, which can exceed the 1MB limit
- **Development Workflow**: In `local_fake` mode, we want to simulate the full workflow without cloud dependencies
- **Error Prevention**: Avoid 413 (Payload Too Large) errors during local development

## API Specification

### Upload Endpoint

```
POST /api/uploads
Content-Type: multipart/form-data
```

**Request:**
- File field name: `file`
- Supported formats: PNG, JPEG, JPG
- Maximum file size: 10MB
- Single file per request

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.png"
}
```

**Error Responses:**
- `400 Bad Request`: Missing file, unsupported format, or file too large
- `403 Forbidden`: Uploads not enabled
- `500 Internal Server Error`: Server-side upload failure

## Environment Configuration

### Required Environment Variables

```bash
# Enable uploads (either flag works)
LOCAL_FAKE_UPLOADS_ENABLED=true
# OR
VIDEO_RUN_MODE=local_fake

# Optional: Custom upload directory (defaults to ./storage/uploads)
UPLOADS_DIR=./custom/upload/path
```

### Storage Configuration

- **Default Directory**: `./storage/uploads/`
- **File Naming**: `{uuid}{extension}` (e.g., `550e8400-e29b-41d4-a716-446655440000.png`)
- **Automatic Creation**: Upload directory is created automatically if it doesn't exist

## Development Workflow

### Basic Usage

1. **Start API in local_fake mode:**
```bash
cd apps/api
export VIDEO_RUN_MODE=local_fake
npm run dev
```

2. **Upload images separately:**
```bash
# Upload start image
curl -X POST http://localhost:4000/api/uploads \
  -F "file=@start-image.png"

# Upload end image  
curl -X POST http://localhost:4000/api/uploads \
  -F "file=@end-image.png"
```

3. **Use returned URLs in job creation:**
```bash
# Create job with image references (small payload)
curl -X POST http://localhost:4000/api/jobs \
  -F "startImageUrl=/uploads/start-id.png" \
  -F "endImageUrl=/uploads/end-id.png" \
  -F "frames=16"
```

### Frontend Integration

```typescript
// Upload images first
const uploadStartImage = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    throw new Error('Upload failed')
  }
  
  return await response.json() // { id, url }
}

// Then create job with references
const createJobWithReferences = async (startUrl: string, endUrl: string) => {
  const jobData = {
    startImageUrl: startUrl,
    endImageUrl: endUrl,
    frames: 16,
    fps: 8
  }
  
  // This payload is small (< 1KB) and won't trigger 413 errors
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData)
  })
  
  return await response.json()
}
```

## Testing

### Manual Testing

```bash
# 1. Start API server
cd apps/api
export VIDEO_RUN_MODE=local_fake
npm run dev

# 2. Test upload endpoint
curl -X POST http://localhost:4000/api/uploads \
  -F "file=@test-image.png" \
  -v

# 3. Verify response
# Expected: 201 status with JSON containing id and url

# 4. Check file was saved
ls -la ./storage/uploads/
```

### Automated Tests

```bash
# Run upload unit tests
npm test -- uploads.test.ts

# Run integration tests
npm test -- local-fake-upload-integration.test.ts

# Run all API tests
npm test
```

## File Organization

```
apps/api/
├── src/routes/uploads.ts          # Upload endpoint implementation
├── test/uploads.test.ts           # Unit tests
├── test/local-fake-upload-integration.test.ts  # Integration tests
└── storage/uploads/               # Default upload directory (ignored by git)
```

## Security Considerations

- **Development Only**: This endpoint is designed for local development
- **File Type Validation**: Only allows image types (PNG, JPEG, JPG)
- **Size Limits**: 10MB maximum file size
- **Environment Gated**: Only enabled when `LOCAL_FAKE_UPLOADS_ENABLED=true` or `VIDEO_RUN_MODE=local_fake`

## Troubleshooting

### Common Issues

**403 Forbidden Error:**
```bash
# Check environment variables
echo $VIDEO_RUN_MODE
echo $LOCAL_FAKE_UPLOADS_ENABLED

# Enable uploads
export LOCAL_FAKE_UPLOADS_ENABLED=true
```

**400 Bad Request (File too large):**
```bash
# Check file size
ls -lh your-image.png

# Maximum allowed: 10MB
# Consider resizing or compressing the image
```

**Upload directory permission errors:**
```bash
# Ensure API has write permissions
chmod 755 ./storage/uploads/
```

**File not found after upload:**
```bash
# Check upload directory configuration
echo $UPLOADS_DIR

# Check actual directory
ls -la ./storage/uploads/
```

### Debug Mode

Enable additional logging:
```bash
DEBUG=media-labs:* VIDEO_RUN_MODE=local_fake npm run dev
```

## Integration with Existing Workflows

This upload handler complements the existing video job creation workflow:

- **Existing Flow**: Direct multipart upload to `/api/jobs` (still works)
- **New Flow**: Upload to `/api/uploads` first, then send references to job creation
- **Choice**: Use the upload flow when dealing with large images or when integrating with Server Actions

Both flows work in `local_fake` mode and provide the same end result.

## Related Documentation

- [Video Local Fake Mode](./video-local-fake-mode.md) - Overall local fake mode documentation
- [Video API Implementation](./video-api-implementation.md) - Video job API architecture
- [How to Develop](./how-to-develop.md) - General development setup