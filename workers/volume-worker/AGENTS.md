# AGENTS.md - Volume Worker Guide

## Project Overview

The Volume Worker is a specialized RunPod serverless endpoint designed for efficient model file management and volume operations. It provides a secure, API-driven interface for downloading models from HuggingFace Hub, managing files on RunPod Network Volumes, and performing administrative operations needed by the Media Labs platform.

## Architecture Overview

### Purpose and Role

The Volume Worker serves as the **infrastructure layer** for the Media Labs platform, handling:

- **Model Management**: Automated downloading and validation of AI models
- **File Operations**: Secure file system operations with path sandboxing
- **Cache Management**: HuggingFace cache cleanup and optimization
- **Storage Operations**: Directory listing, file stats, and disk usage monitoring
- **Security**: Path traversal protection and controlled delete operations

### Integration Points

#### Media Labs Platform Integration

- **API Routes**: Integrates with `src/app/api/volume/` endpoints
- **Model Preflight**: Supports model availability checks for workflows
- **Template System**: Enables dynamic model provisioning for workflow templates
- **Multi-Modal Worker**: Provides model management services for the multi-modal inference worker

#### RunPod Infrastructure

- **Serverless Deployment**: Runs as cost-effective serverless endpoint
- **Network Volume**: Operates on shared volumes accessible by other workers
- **FlashBoot**: Optimized for fast cold starts in serverless environment
- **Scaling**: Auto-scales based on demand with 0-worker idle state

## Key Components

### Core Handler (`handler.py`)

The main serverless handler implements the operation routing system:

```python
def handler(job):
    """RunPod serverless handler for volume operations"""
    inp = job.get("input", {})
    op = inp.get("op") or inp.get("task")

    if op not in OPS:
        return {"ok": False, "error": f"unknown op '{op}'"}

    args = inp.get("args", inp)
    result = OPS[op](args)

    return result
```

### Supported Operations

#### Model Management Operations

- **`seed`**: Download models from HuggingFace Hub using manifest configuration
- **`verify`**: Check model presence without downloading (preflight checks)
- **`checksum`**: Calculate SHA256 hashes for model integrity validation

#### File System Operations

- **`ls`**: List directory contents with filtering and recursion support
- **`stat`**: Get detailed file/directory statistics and metadata
- **`mkdir`**: Create directories with proper permissions
- **`rm`**: Remove files/directories (requires `ALLOW_DELETE=true`)
- **`mv`**: Move/rename files and directories

#### Administrative Operations

- **`ping`**: Health check and system status
- **`df`**: Calculate disk usage and storage statistics
- **`gc_cache`**: Cleanup HuggingFace cache to reclaim storage

### Security Model

#### Path Sandboxing

```python
def secure_path(path: str) -> str:
    """Prevent path traversal attacks"""
    # Normalize and validate paths within /runpod-volume
    safe_path = os.path.normpath(path)
    if not safe_path.startswith('/runpod-volume'):
        raise SecurityError("Path outside allowed volume")
    return safe_path
```

#### Access Controls

- **Read Operations**: Always allowed for monitoring and verification
- **Write Operations**: Controlled through environment variables
- **Delete Operations**: Require explicit `ALLOW_DELETE=true` configuration
- **Path Validation**: All paths validated against volume boundaries

## Development Workflows

### Local Development Setup

```bash
# Install dependencies and run tests
./dev.sh test

# Start local development server
./dev.sh run

# Test operations against local server
python test_volume_worker.py
```

### Docker Development

```bash
# Build container for testing
./dev.sh build

# Run in local mode for development
docker run -p 8000:8000 -e LOCAL_MODE=true volume-worker

# Test with curl
curl -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -d '{"input": {"op": "ping"}}'
```

### Production Deployment

The worker deploys to RunPod via GitHub Actions workflow:

```yaml
# .github/workflows/build-volume-worker.yml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: ./workers/volume-worker
    platforms: linux/amd64
    push: true
```

## Configuration Management

### Environment Variables

#### Required Configuration

- **`HF_TOKEN`**: HuggingFace API token for accessing gated models
- **`HF_HOME`**: Cache directory (typically `/runpod-volume/hf_cache`)

#### Security Configuration

- **`ALLOW_DELETE`**: Set to `true` to enable destructive operations
- **`MAX_FILE_SIZE`**: Limit for file operations (default: 10GB)
- **`LOG_LEVEL`**: Control logging verbosity (`DEBUG`, `INFO`, `WARNING`)

#### RunPod Integration

- **`RUNPOD_ENDPOINT_ID`**: Endpoint identifier for API calls
- **`RUNPOD_API_KEY`**: Authentication for RunPod API access
- **`RUNPOD_VOLUME_ID`**: Network volume identifier

### Storage Layout

```bash
/runpod-volume/
├── models/                    # Organized model storage
│   ├── diffusion_models/     # Image generation models
│   ├── text_encoders/        # Text encoding models
│   ├── vae/                  # VAE models
│   └── controlnet/           # ControlNet models
├── hf_cache/                 # HuggingFace cache directory
├── temp/                     # Temporary operations
└── logs/                     # Operation audit logs
```

## API Integration Patterns

### Frontend Integration

The volume worker integrates with Media Labs frontend through API routes:

```typescript
// /src/app/api/volume/route.ts
export async function POST(req: NextRequest) {
  const { op, args } = await req.json()

  const result = await runpod.runSync({
    endpoint: process.env.RUNPOD_VOLUME_ENDPOINT_ID,
    input: { op, args }
  })

  return NextResponse.json(result)
}
```

### Model Preflight Checks

```typescript
// Check model availability before workflow execution
const preflightResult = await fetch('/api/volume', {
  method: 'POST',
  body: JSON.stringify({
    op: 'verify',
    args: { manifest: requiredModels }
  })
})
```

### Batch Model Seeding

```typescript
// Seed multiple models from manifest
const seedResult = await fetch('/api/volume', {
  method: 'POST',
  body: JSON.stringify({
    op: 'seed',
    args: {
      manifest: [
        {
          repo: 'runwayml/stable-diffusion-v1-5',
          filename: 'v1-5-pruned.safetensors',
          destDir: '/runpod-volume/models/diffusion_models'
        }
      ]
    }
  })
})
```

## Performance Characteristics

### Optimization Features

- **Incremental Downloads**: Resume interrupted model downloads
- **Manifest Validation**: Verify models before downloading to prevent waste
- **Cache Management**: Intelligent HuggingFace cache cleanup
- **Concurrent Operations**: Handle multiple file operations efficiently
- **Memory Efficiency**: Stream large files without excessive RAM usage

### Scaling Behavior

- **Cold Start Time**: <10 seconds with FlashBoot optimization
- **Concurrent Requests**: Handles 5-10 simultaneous operations effectively
- **Storage I/O**: Optimized for Network Volume performance characteristics
- **Memory Footprint**: <2GB RAM for typical operations

## Error Handling and Monitoring

### Error Categories

#### User Errors

- **Invalid Operations**: Unknown operation types
- **Path Errors**: Invalid or restricted file paths
- **Permission Errors**: Insufficient access for requested operations

#### System Errors

- **Network Issues**: HuggingFace download failures
- **Storage Issues**: Insufficient disk space or I/O errors
- **Configuration Issues**: Missing environment variables or invalid settings

### Monitoring Integration

```python
def log_event(event_data: dict):
    """Structured logging for operations monitoring"""
    timestamp = datetime.utcnow().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'operation': event_data.get('op'),
        'success': event_data.get('ok', False),
        'duration': event_data.get('duration'),
        'error': event_data.get('error')
    }
    logger.info(json.dumps(log_entry))
```

## Testing Strategy

### Unit Testing

```python
class TestVolumeOperations(unittest.TestCase):
    def test_secure_path_validation(self):
        # Test path traversal protection
        with self.assertRaises(SecurityError):
            secure_path("../../../etc/passwd")

    def test_model_verification(self):
        # Test model presence checking
        manifest = [{"path": "/test/model.safetensors"}]
        result = op_verify({"manifest": manifest})
        self.assertIn('missing', result)
```

### Integration Testing

```bash
# Test complete model seeding workflow
python test_volume_worker.py --test-seed

# Test file operations under various conditions
python test_volume_worker.py --test-operations

# Test security and error handling
python test_volume_worker.py --test-security
```

## Troubleshooting Guide

### Common Issues

#### "Model download failed"

- Check `HF_TOKEN` configuration for gated models
- Verify network connectivity and HuggingFace Hub status
- Check available disk space on network volume

#### "Permission denied" errors

- Verify `ALLOW_DELETE` setting for destructive operations
- Check RunPod volume mount permissions
- Validate path restrictions and sandboxing

#### "Path outside volume" security errors

- Ensure all paths start with `/runpod-volume/`
- Check for path traversal attempts in input
- Verify path normalization is working correctly

### Debugging Commands

```bash
# Check worker health and configuration
curl -X POST https://api.runpod.ai/v2/{endpoint}/runsync \
  -d '{"input": {"op": "ping"}}'

# List volume contents for debugging
curl -X POST https://api.runpod.ai/v2/{endpoint}/runsync \
  -d '{"input": {"op": "ls", "args": {"path": "/runpod-volume"}}}'

# Check disk usage and storage
curl -X POST https://api.runpod.ai/v2/{endpoint}/runsync \
  -d '{"input": {"op": "df"}}'
```

## Story Management Requirements

### Documentation Standards for AI Agents

When working on volume worker development or maintenance:

1. **Story Progress Tracking**: Always update story document checklists as tasks are completed
2. **Comprehensive Documentation**: Add detailed work summaries to story documents
3. **Agentic Document Updates**: Keep this AGENTS.md file current with new patterns and requirements
4. **Integration Notes**: Document how volume worker changes affect multi-modal worker and frontend

### Work Summary Requirements

For any story work, provide comprehensive summaries including:

- Implementation details and architectural changes
- Test results and validation outcomes
- Integration points with other system components
- Performance implications and optimization notes

## Future Enhancements

### Planned Features

- **Model Versioning**: Track and manage multiple model versions
- **Atomic Operations**: Ensure file operations complete fully or rollback
- **Compression**: Support compressed model downloads and storage
- **Backup Integration**: Automated backup of critical models

### Integration Roadmap

- **Multi-Modal Worker**: Enhanced integration with multi-modal inference worker
- **Workflow Templates**: Dynamic model provisioning for template execution
- **Performance Monitoring**: Detailed metrics collection and analysis
- **Cost Optimization**: Intelligent model placement and storage tiering

This Volume Worker serves as the foundational infrastructure component enabling efficient, secure, and scalable model management for the entire Media Labs platform.
