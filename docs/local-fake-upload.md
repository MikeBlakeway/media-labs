# Local Fake Upload Handler Documentation

## Overview

The local fake upload handler is a solution for avoiding Next.js Server Actions body-size limits (default 1MB) when working with large image uploads in the `local_fake` video workflow.

## Problem Statement

When the UI runs in `local_fake` mode, job creation can hit Next.js Server Actions body-size limits when uploading large images (>1MB total payload). This causes 413 "Payload Too Large" errors and prevents successful job creation.

## Solution

The upload handler provides a two-step process:
1. **Upload images** via `POST /api/uploads` and get URL references
2. **Create job** with small payload containing only URLs, not binary data

This keeps job payloads well under the 1MB limit while maintaining full functionality.

## API Endpoint

### `POST /api/uploads`

Accepts image uploads and returns stable URL references for use in job creation.

#### Request
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Fields**: 
  - `files` (file array): 1-2 image files (PNG, JPEG, JPG)
  - Max file size: 10MB per file
  - Max files: 2 files total

#### Response (201 Created)
```json
{
  "success": true,
  "uploads": [
    {
      "id": "uuid-string",
      "url": "/uploads/filename.ext",
      "originalName": "original-filename.ext",
      "size": 1234567,
      "contentType": "image/png"
    }
  ]
}
```

#### Error Responses
- **400**: Validation errors (no files, too many files, etc.)
- **404**: Endpoint not available (not in local_fake mode)
- **413**: File too large (>10MB)
- **500**: Server error

## Environment Configuration

### Required Environment Variables

```bash
# Enable local fake mode (uploads automatically enabled)
VIDEO_RUN_MODE=local_fake

# OR explicitly enable uploads in any mode
LOCAL_FAKE_UPLOADS_ENABLED=true

# Optional: Custom uploads directory (default: ./storage/uploads)
UPLOADS_DIR=/path/to/custom/uploads
```

### Storage Directory

- **Default**: `./storage/uploads/` (relative to API root)
- **Configurable**: Set `UPLOADS_DIR` environment variable
- **Auto-creation**: Directory created automatically if it doesn't exist
- **File naming**: UUIDs to avoid conflicts (`{uuid}.{extension}`)

## Usage Example

### Frontend Implementation
```typescript
// Step 1: Upload images
const uploadFormData = new FormData()
uploadFormData.append('files', startImageFile)
uploadFormData.append('files', endImageFile)

const uploadResponse = await fetch('/api/uploads', {
  method: 'POST',
  body: uploadFormData
})

const uploadResult = await uploadResponse.json()

// Step 2: Create job with small payload
const jobFormData = new FormData()
jobFormData.append('startImage', smallReferenceFile) // Small placeholder
jobFormData.append('endImage', smallReferenceFile)   // Small placeholder
jobFormData.append('frames', '16')
jobFormData.append('startImageUrl', uploadResult.uploads[0].url) // Reference uploaded files
jobFormData.append('endImageUrl', uploadResult.uploads[1].url)

const jobResponse = await fetch('/api/jobs', {
  method: 'POST',
  body: jobFormData
})
```

### cURL Example
```bash
# Upload images
curl -X POST http://localhost:4000/api/uploads \
  -F "files=@start-image.png" \
  -F "files=@end-image.png"

# Response:
# {
#   "success": true,
#   "uploads": [
#     {"id": "abc-123", "url": "/uploads/abc-123.png", ...},
#     {"id": "def-456", "url": "/uploads/def-456.png", ...}
#   ]
# }
```

## Development Testing

### Local Setup
```bash
cd apps/api

# Ensure local fake mode
echo "VIDEO_RUN_MODE=local_fake" >> .env

# Start API server
pnpm run dev

# Test upload endpoint
curl -X POST http://localhost:4000/api/uploads \
  -F "files=@test-image.png"
```

### Test Suite
```bash
# Run upload endpoint tests
pnpm --filter ./apps/api test test/uploads.test.ts

# Run integration tests
pnpm --filter ./apps/api test test/local-fake-upload-integration.test.ts

# Run all API tests
pnpm --filter ./apps/api test
```

## Benefits

1. **Avoids 413 Errors**: Keeps job payloads under 1MB limit
2. **Maintains Functionality**: Full image processing capabilities preserved
3. **Development Only**: Safe for local development, disabled in production by default
4. **Configurable**: Flexible storage options and environment controls
5. **Testable**: Comprehensive test coverage for reliability

## Production Considerations

- **Local Development Only**: This feature is designed for local development
- **Storage**: Files stored locally, not suitable for distributed deployments
- **Security**: No authentication required (development environment assumed)
- **Cleanup**: No automatic cleanup of uploaded files (manual maintenance)

## Future Enhancements

- Support for signed temporary URLs
- Integration with cloud storage (S3, MinIO)
- Automatic file cleanup after job completion
- Authentication and rate limiting
- Direct job creation with URL references (skip placeholder files)

## Troubleshooting

### Common Issues

1. **404 Not Found**: Ensure `VIDEO_RUN_MODE=local_fake` or `LOCAL_FAKE_UPLOADS_ENABLED=true`
2. **413 File Too Large**: Reduce image file size to under 10MB
3. **500 Server Error**: Check server logs, ensure uploads directory is writable
4. **Upload Directory**: Verify `UPLOADS_DIR` path exists and has write permissions

### Debug Logging

The endpoint logs detailed information:
```
📁 Processing 2 file upload(s) in local_fake mode
✅ Successfully stored 2 file(s)
```

Check server console output for detailed upload progress and error information.

## Related Documentation

- [Video API Implementation](./video-api-implementation.md) - Core video processing
- [Video Local Fake Mode](./video-local-fake-mode.md) - Local development setup  
- [FLF2V Integration](./flf2v.md) - Complete FLF2V workflow guide