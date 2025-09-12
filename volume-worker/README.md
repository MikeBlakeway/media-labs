# RunPod Volume Worker

A serverless endpoint for managing model files and volume operations on RunPod.

## Features

- **Model Seeding**: Download models from HuggingFace Hub with manifest-based configuration
- **File Operations**: ls, stat, mkdir, rm, mv with path sandboxing
- **Checksums**: SHA256 calculation for integrity verification
- **Cache Management**: HuggingFace cache garbage collection
- **Audit Logging**: Operation tracking with timestamps
- **Security**: Path traversal protection and optional delete guards

## Quick Start

### 1. Local Testing

```bash
# Install dependencies and run tests
./dev.sh test

# Start local server
./dev.sh run

# Test against local server in another terminal
python test_volume_worker.py
```

### 2. Docker Testing

```bash
# Build Docker image
./dev.sh build

# Run container in local mode
docker run -p 8000:8000 -e LOCAL_MODE=true volume-worker

# Test with curl
curl -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -d '{"input": {"op": "ping"}}'
```

### 3. Deploy to RunPod

1. Push Docker image to registry:

```bash
docker tag volume-worker your-registry/volume-worker
docker push your-registry/volume-worker
```

2. Create RunPod serverless endpoint:
   - Image: `your-registry/volume-worker`
   - Container Disk: 20GB+
   - Network Volume: Attach your model storage volume
   - Environment Variables:
     - `HF_TOKEN`: Your HuggingFace token (optional)
     - `ALLOW_DELETE`: `true` to enable rm operations

### 4. Next.js Integration

Add to your `.env.local`:

```
RUNPOD_VOLUME_ENDPOINT_ID=your-endpoint-id
RUNPOD_API_KEY=your-api-key
```

Use the API route:

```javascript
// Seed models
const response = await fetch('/api/volume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    op: 'seed',
    args: { manifest: [...] }
  })
})

// Health check
const health = await fetch('/api/volume')
```

## API Operations

### Core Operations

- `ping` - Health check
- `seed` - Download models from HuggingFace
- `verify` - Check model presence without downloading
- `ls` - List directory contents
- `stat` - Get file/directory statistics
- `mkdir` - Create directories
- `rm` - Remove files/directories (requires ALLOW_DELETE=true)
- `mv` - Move/rename files
- `checksum` - Calculate SHA256 hashes
- `df` - Calculate disk usage
- `gc_cache` - Clean HuggingFace cache
- `status` - Get recent operation status
- `logs` - Get operation audit logs

### Example Requests

```json
{
  "op": "seed",
  "args": {
    "manifest": [
      {
        "repo": "runwayml/stable-diffusion-v1-5",
        "remote": "v1-5-pruned.safetensors",
        "destDir": "/runpod-volume/models/checkpoints",
        "filename": "sd-v1-5.safetensors"
      }
    ]
  }
}
```

```json
{
  "op": "ls",
  "args": {
    "path": "/runpod-volume/models",
    "recursive": true,
    "pattern": "*.safetensors"
  }
}
```

## Security

- All paths are validated against `/runpod-volume` root
- Delete operations require explicit `ALLOW_DELETE=true`
- Dry run mode available for destructive operations
- Audit logging for all operations
- No credential exposure to clients

## Environment Variables

- `HF_HOME`: HuggingFace cache directory (default: `/runpod-volume/hf_cache`)
- `HF_TOKEN`: HuggingFace API token for private repos
- `ALLOW_DELETE`: Enable rm operations (`true`/`false`, default: `false`)
- `LOCAL_MODE`: Enable local Flask server mode (`true`/`false`, default: `false`)

## File Structure

```
volume-worker/
├── handler.py              # Main RunPod handler
├── Dockerfile              # Container definition
├── requirements.txt        # Python dependencies
├── test_volume_worker.py   # Test suite
├── dev.sh                  # Development script
└── README.md              # This file
```
