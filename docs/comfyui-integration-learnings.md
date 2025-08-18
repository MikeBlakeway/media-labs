# ComfyUI Integration Learnings

This document captures key learnings, gotchas, and best practices discovered during the development of the ComfyUI integration for the Media Lab project.

## Table of Contents

1. [ComfyUI Core Concepts](#comfyui-core-concepts)
2. [Docker & Environment Setup](#docker--environment-setup)
3. [API Integration Patterns](#api-integration-patterns)
4. [Testing Strategies](#testing-strategies)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Development Workflow](#development-workflow)
7. [Performance & Optimization](#performance--optimization)

## ComfyUI Core Concepts

### API Endpoints Structure

ComfyUI exposes several key endpoints:

- **`/api/prompt`** - Primary endpoint for executing workflows
  - Expects: `{"prompt": {node_id: {class_type, inputs}, ...}}`
  - Returns: `{"prompt_id": "uuid", "number": int, "node_errors": {}}`
  - Use this for most workflows

- **`/api/pipeline`** - Alternative endpoint (less common)
  - May have different payload structure
  - Fallback option if `/api/prompt` fails

- **`/api/object_info`** - Critical for development
  - Returns metadata for all available nodes
  - Shows input/output types, required fields
  - Essential for building valid prompt graphs

- **`/` (root)** - Web UI
  - Useful for manual testing and workflow development

### Prompt Graph Structure

ComfyUI workflows are directed graphs where:

```json
{
  "prompt": {
    "node_id_1": {
      "class_type": "LoadImage",
      "inputs": {
        "path": "/path/to/image.png"
      }
    },
    "node_id_2": {
      "class_type": "PreviewImage", 
      "inputs": {
        "image": {"node_id": "node_id_1", "output_name": "image"}
      }
    }
  }
}
```

**Key Rules:**
- Node IDs are arbitrary strings (commonly "1", "2", "3")
- Each node must have `class_type` and `inputs`
- Use `inputs` key, NOT `args` (common mistake)
- Node connections use `{"node_id": "source_id", "output_name": "output_slot"}`
- Validation is strict - ComfyUI will return detailed error messages

### Node Categories & Dependencies

**Model-Free Nodes (good for testing):**
- `LoadImage` - loads images from filesystem
- `PreviewImage` - displays images (minimal pipeline endpoint)
- Basic image processing nodes

**Model-Dependent Nodes (require downloaded models):**
- `KSampler` - requires model, VAE
- `CLIPTextEncode` - requires CLIP model
- `VAEDecode` - requires VAE model

**Tip:** Start with LoadImage → PreviewImage for smoke tests, then add model nodes.

## Docker & Environment Setup

### ComfyUI Container Configuration

**Critical Environment Settings:**
```dockerfile
# Force CPU mode (essential for development without GPU)
ENV FORCE_CMAKE=1
ENV CMAKE_ARGS="-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS"
ENV CUDA_VISIBLE_DEVICES=""
ENV PYTORCH_CUDA_ALLOC_CONF=""

# Entry point
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--cpu"]
```

**Package Requirements:**
- Install `ca-certificates` for HTTPS git clones
- Use CPU-only PyTorch wheels when no GPU available
- Clone from `master` branch (not `main`)

### Container Networking

**Port Mapping:**
- ComfyUI: `8188:8188`
- Backend: `8000:8000`
- Internal communication: `http://comfyui:8188` (service name)

**Volume Mounts:**
- Models: `./services/comfyui/models:/opt/comfyui/models`
- Input: Built-in example at `/opt/comfyui/input/example.png`

## API Integration Patterns

### Backend Proxy Design

**Dual Endpoint Strategy:**
```python
# Try prompt endpoint first, fallback to pipeline
try:
    resp = await client.run_prompt(payload)
    if resp.status_code in (404, 405):
        resp = await client.run_pipeline(payload)
except Exception:
    resp = await client.run_pipeline(payload)
```

**Content Type Handling:**
- JSON responses: Parse and return as JSON
- Binary responses: Stream back to client
- Always check `content-type` header

### Error Handling Patterns

**ComfyUI Error Responses:**
- `400` with validation details when prompt schema wrong
- `405` when endpoint not supported
- `JSONDecodeError` when request body malformed
- `TypeError` when prompt structure incorrect
- `KeyError: 'inputs'` when using `args` instead of `inputs`

**Backend Error Handling:**
```python
try:
    # ComfyUI request
except Exception as e:
    logging.exception("ComfyUI request failed")
    raise HTTPException(status_code=502, detail=str(e))
```

### Environment Configuration

**Backend Environment Variables:**
```env
COMFYUI_URL=http://comfyui:8188
COMFYUI_API_PATH=/api/pipeline  # Fallback path
```

## Testing Strategies

### Test Categories

**Unit Tests (`@pytest.mark.unit`):**
- FastAPI endpoint testing with TestClient
- No external dependencies
- Fast execution (< 1s)

**Smoke Tests (`@pytest.mark.smoke`):**
- End-to-end integration testing
- Requires running services
- Health check + skip pattern for robustness

### Minimal Test Payload

```python
{
    "prompt": {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"path": "/opt/comfyui/input/example.png"}
        },
        "2": {
            "class_type": "PreviewImage", 
            "inputs": {"image": {"node_id": "1", "output_name": "image"}}
        }
    }
}
```

**Why This Works:**
- No model dependencies
- Uses built-in example image
- Exercises core graph execution
- Returns predictable response format

### Pytest Configuration

**Essential pytest.ini settings:**
```ini
[tool:pytest]
pythonpath = .  # Critical for import resolution
markers =
    smoke: smoke tests that require running services
    unit: unit tests that don't require external services
```

## Common Issues & Solutions

### Import Errors

**Problem:** `ModuleNotFoundError: No module named 'app'`
**Solution:** Run pytest with `python -m pytest` from correct directory

**Problem:** `uvicorn app.main:app` import path mismatch
**Solution:** Use module path that matches mounted code structure

### ComfyUI API Errors

**Problem:** `405 Method Not Allowed`
**Cause:** Posting to wrong endpoint or service not ready
**Solution:** Check health endpoints first, use correct URL

**Problem:** `KeyError: 'inputs'`
**Cause:** Using `args` instead of `inputs` in node definition
**Solution:** Always use `inputs` key for node parameters

**Problem:** `AssertionError: Torch not compiled with CUDA enabled`
**Cause:** PyTorch trying to initialize CUDA in CPU-only environment
**Solution:** Set `CUDA_VISIBLE_DEVICES=""` and use `--cpu` flag

### Docker Issues

**Problem:** Container builds but ComfyUI won't start
**Cause:** Missing CA certificates for git clone
**Solution:** Install `ca-certificates` in Dockerfile

**Problem:** Port conflicts
**Cause:** Previous containers still running
**Solution:** `docker compose down -v` before rebuilding

## Development Workflow

### Recommended Development Process

1. **Start Simple:** LoadImage → PreviewImage smoke test
2. **Add Complexity:** Gradually introduce model-dependent nodes
3. **Test Each Step:** Validate payload structure with `/api/object_info`
4. **Debug with Logs:** Use `docker logs comfyui` for ComfyUI errors
5. **Container Inspection:** Use `docker exec` for direct API testing

### Debugging Techniques

**Container Shell Access:**
```bash
docker exec -it media-lab-comfyui-1 bash
docker exec -it media-lab-backend-1 bash
```

**API Exploration:**
```bash
# Check object info
curl http://comfyui:8188/api/object_info | jq .LoadImage

# Test minimal prompt
curl -X POST http://comfyui:8188/api/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": {...}}'
```

**Log Monitoring:**
```bash
docker compose logs -f comfyui
docker compose logs -f backend
```

### Iteration Patterns

**When Adding New Nodes:**
1. Check `/api/object_info` for node requirements
2. Build minimal graph in isolation
3. Test directly against ComfyUI API
4. Add to backend proxy
5. Add test coverage

**When Debugging Issues:**
1. Check service health endpoints
2. Examine container logs
3. Test API calls directly
4. Verify payload structure
5. Check network connectivity

## Performance & Optimization

### Startup Times

**ComfyUI:** ~30-60 seconds (model loading)
**Backend:** ~5-10 seconds (FastAPI startup)

**CI Considerations:**
- Use appropriate timeouts (120s+ for ComfyUI)
- Implement health check polling
- Cache Docker layers when possible

### Resource Usage

**CPU Mode:** Suitable for development and testing
**Memory:** ComfyUI can use 2-4GB+ depending on models
**Storage:** Models can be large (GB range)

### Scaling Considerations

**Current Setup:** Single ComfyUI instance
**Future Options:**

- Multiple ComfyUI workers
- Load balancing
- GPU acceleration
- Model caching strategies

## Future Improvements

### Immediate Opportunities

1. **Model Management:** Automated model downloading
2. **Workflow Templates:** Pre-built common workflows
3. **Error Recovery:** Retry logic for transient failures
4. **Monitoring:** Health checks and metrics
5. **Security:** Input validation and rate limiting

### Architectural Evolution

1. **Queue Management:** Async job processing
2. **State Management:** Workflow state persistence
3. **Multi-tenancy:** User workspace isolation
4. **Performance:** GPU utilization and optimization

## Key Takeaways

1. **Start Simple:** Use model-free workflows for initial testing
2. **API-First:** Always consult `/api/object_info` before building workflows
3. **Error-Driven:** ComfyUI provides excellent error messages - use them
4. **Container-Aware:** Understand networking and volume mounting
5. **Test-Driven:** Smoke tests catch integration issues early
6. **Documentation:** This complexity requires good documentation

## Quick Reference Commands

```bash
# Development
make services-up           # Start all services
make test-unit            # Fast unit tests
make test-smoke           # Full integration test

# Debugging
docker compose logs comfyui
docker exec -it media-lab-comfyui-1 bash
curl http://localhost:8188/api/object_info

# Testing
cd backend && python -m pytest tests/ -v
BACKEND_URL=http://localhost:8000 python -m pytest tests/ -v -m smoke
```

This document should be updated as we discover new patterns and solutions.
