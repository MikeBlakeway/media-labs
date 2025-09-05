# AI Makefile Mastery Guide for Media Labs

**Target Audience:** AI coding agents (GitHub Copilot, Claude, ChatGPT, etc.)
**Goal:** Develop intimate understanding of the Media Labs Makefile to provide expert assistance, maintain documentation, and proactively optimize developer workflows

## Overview

This tutorial transforms you into an expert Media Labs Makefile assistant. You will learn to execute tasks efficiently, maintain the Makefile system, and proactively suggest improvements to accelerate development workflows.

## 1. Understanding the Makefile Architecture

### Purpose and Design Philosophy

The Media Labs Makefile serves as the central command center for:

- **Local Development**: CPU-based Docker containers for macOS development
- **Production Deployment**: Linux/AMD64 images for RunPod Serverless
- **S3 Management**: RunPod Network Volume operations and model management
- **Workflow Integration**: Seamless connection between local development and production

### Environment Variable System

**Dotenv Loading Pattern:**

```makefile
ENVFILE ?= .env.local
ifneq (,$(wildcard $(ENVFILE)))
include $(ENVFILE)
endif
.EXPORT_ALL_VARIABLES:
```

**Key Insight:** The Makefile automatically loads `.env.local` and exports all variables to child processes. This means Docker containers, AWS CLI, and curl commands inherit the environment seamlessly.

**Critical Variables by Category:**

**Docker Configuration:**

- `IMAGE_OWNER`: Docker registry username (default: `your-dockerhub-user`)
- `IMAGE_NAME`: Base image name (default: `media-labs-worker`)
- `IMAGE_TAG`: Version tag (default: `0.1.0`)
- `CPU_IMAGE`: Local development image name

**Port Management:**

- `COMFY_PORT`: ComfyUI port inside container (default: `8188`)
- `LOCAL_COMFY_PORT`: Host port mapping for ComfyUI (default: `8188`)
- `LOCAL_API_PORT`: RunPod SDK API port (default: `8000`)

**RunPod Integration:**

- `RUNPOD_ENDPOINT_ID`: Your serverless endpoint identifier
- `RUNPOD_API_KEY`: Authentication for RunPod API calls

**S3/Network Volume:**

- `RUNPOD_S3_ENDPOINT`: S3-compatible endpoint URL
- `RUNPOD_S3_REGION`: AWS region (e.g., `eu-ro-1`)
- `RUNPOD_VOLUME_ID`: Network volume identifier (bucket name)
- `RUNPOD_S3_ACCESS_KEY_ID` / `RUNPOD_S3_SECRET_ACCESS_KEY`: S3 credentials

### Image Naming Strategy

**Local Development (CPU):**

- Image: `media-labs-worker:cpu`
- Container: `media-labs-worker-cpu`
- Platform: Multi-arch (macOS compatible)

**Production (GPU):**

- Image: `your-dockerhub-user/media-labs-worker:0.1.0`
- Platform: `linux/amd64` only
- Registry: Docker Hub or GitHub Container Registry

### Directory Structure Integration

```text
Media Labs Project
├── makefile                    # This Makefile
├── worker/                     # Docker context root
│   ├── Dockerfile.cpu         # CPU development build
│   ├── Dockerfile.gpu         # Production GPU build
│   └── test_input.json        # Test workflow payload
├── local-volume/              # Local development volume mount
└── extra_model_paths.yaml    # ComfyUI model path configuration
```

## 2. Target Categories and Workflows

### Development Workflow

**Primary Development Cycle:**

```bash
make build-cpu              # Build CPU image for local development
make serve-cpu-with-io      # Start detached container with volume mounts
make restart-cpu            # Quick restart and log monitoring
make stop-cpu               # Clean shutdown
```

**Testing Workflow:**

```bash
make run-cpu-once           # Single test execution with test_input.json
make wait-cpu-healthy       # Pause for container startup
make watch-paths            # Monitor model path discovery
```

### Production Workflow

**Deployment Pipeline:**

```bash
make build-prod             # Build production GPU image
make push                   # Push to container registry
make deploy                 # Deploy to RunPod endpoint
make test-deployment        # Verify deployment success
```

### S3/Volume Management

**Model Management:**

```bash
make upload-extra-yaml      # Upload model path configuration
make volume-ls-models       # List model directories
make volume-ls-models-all   # Recursive model listing
```

**File Operations:**

```bash
make mv-file SRC=old.yaml DEST=new.yaml           # Move/rename files
make mv-file SRC=old.yaml DEST=new.yaml DELETE_OLD=true  # Move and delete source
```

**Exploration:**

```bash
make volume-ls-prefix PREFIX=models/clip_vision/   # List specific directory
make volume-ls-prefix PREFIX=models/ RECURSIVE=true  # Recursive listing
```

### Testing and Debugging

**Container Inspection:**

```bash
make echo-ports             # Verify port configuration
make wait-cpu-healthy       # Ensure container readiness
make watch-paths            # Monitor ComfyUI path discovery
```

**Log Monitoring:**

```bash
docker logs -f media-labs-worker-cpu              # Follow container logs
make restart-cpu            # Restart with automatic log tailing
```

### Maintenance

**Cleanup Operations:**

```bash
make stop-cpu               # Stop running containers
make clean-local            # Remove local volume directory
make prune-images           # Remove unused Docker images (add if needed)
```

## 3. Environment Prerequisites and Safety Checks

### Required Variables by Target

**Build Operations:**

- `build-cpu`: No external dependencies
- `build-prod`: `DOCKER_BUILDKIT=1` recommended

**Local Development:**

- `serve-cpu*`: `LOCAL_COMFY_PORT`, `LOCAL_API_PORT`
- `run-cpu-once`: `TEST_INPUT` file must exist

**S3 Operations:**

- All `volume-*` and `upload-*` targets require:
  - `RUNPOD_S3_ENDPOINT`
  - `RUNPOD_S3_REGION`
  - `RUNPOD_S3_ACCESS_KEY_ID`
  - `RUNPOD_S3_SECRET_ACCESS_KEY`
  - `RUNPOD_VOLUME_ID`

**Production Operations:**

- `deploy`: `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY`
- `push`: Docker registry authentication

### Safety Considerations

**Destructive Operations:**

- `clean-local`: Removes entire local volume (safe - doesn't affect production)
- `mv-file` with `DELETE_OLD=true`: Permanently deletes source files
- `deploy`: Overwrites production endpoint configuration

**Port Conflicts:**

- Check `make echo-ports` before starting containers
- Ensure `LOCAL_COMFY_PORT` and `LOCAL_API_PORT` are available

**Container Management:**

- Always use `make stop-cpu` before system shutdown
- Only one `media-labs-worker-cpu` container can run at a time

### Prerequisite Validation Patterns

**Before S3 operations, check:**

```bash
# Verify S3 credentials and connectivity
aws s3 ls s3://$RUNPOD_VOLUME_ID/ --endpoint-url="$RUNPOD_S3_ENDPOINT" --region="$RUNPOD_S3_REGION"
```

**Before container operations, check:**

```bash
# Verify Docker is running
docker version >/dev/null 2>&1 || echo "Docker not available"

# Check for port conflicts
lsof -i :$LOCAL_COMFY_PORT >/dev/null 2>&1 && echo "Port $LOCAL_COMFY_PORT in use"
```

## 4. Comprehensive Target Reference

### Help and Information

#### `make help`

**Purpose:** Display all available targets with descriptions
**Prerequisites:** None
**Usage:** Always start here for target discovery
**Output:** Formatted list of targets plus current configuration

```bash
make help
# Shows:
# - All targets with descriptions
# - Current IMAGE and CPU_IMAGE values
# - Port configurations
# - RUNPOD_ENDPOINT_ID status
```

#### `make echo-ports`

**Purpose:** Debug port variable resolution
**Prerequisites:** None
**Usage:** Troubleshoot port conflicts or variable parsing
**Output:** Port values with angle brackets to reveal whitespace issues

### Local Development

#### `make build-cpu`

**Purpose:** Build CPU-only Docker image for local development
**Prerequisites:** Docker daemon running
**Usage:** First step in local development workflow
**Success Indicator:** `Successfully tagged media-labs-worker:cpu`

```bash
make build-cpu
# Builds from worker/Dockerfile.cpu
# Installs CPU-only PyTorch
# Configures ComfyUI for CPU mode
```

#### `make run-cpu-once`

**Purpose:** Single test execution with test_input.json
**Prerequisites:** `test_input.json` exists, built CPU image
**Usage:** Quick workflow validation
**Success Indicator:** Container exits with status 0, output in logs

```bash
make run-cpu-once
# Mounts LOCAL_VOL to /runpod-volume
# Mounts test_input.json to /workspace/app/test_input.json
# Runs single workflow execution
# Container exits after completion
```

#### `make serve-cpu`

**Purpose:** Start persistent local development server
**Prerequisites:** Built CPU image, available ports
**Usage:** Interactive development and testing
**Success Indicator:** API available on `http://localhost:8000`

```bash
make serve-cpu
# Starts detached container
# ComfyUI UI: http://localhost:8188
# RunPod API: http://localhost:8000
# Container runs until stopped
```

#### `make serve-cpu-with-io`

**Purpose:** Start development server with input/output directory mounts
**Prerequisites:** `ensure-local-volume` target, available ports
**Usage:** Testing with real input files
**Success Indicator:** Both ComfyUI and Worker APIs accessible

```bash
make serve-cpu-with-io
# Creates local-volume/ if needed
# Mounts inputs and output directories
# Provides both ComfyUI and RunPod SDK APIs
# Auto-stops existing container
```

#### `make restart-cpu`

**Purpose:** Complete restart cycle with log monitoring
**Prerequisites:** None (handles cleanup automatically)
**Usage:** Quick development iteration
**Process:** `stop-cpu` → `serve-cpu-with-io` → `wait-cpu-healthy` → `watch-paths`

### Production Operations

#### `make build-prod`

**Purpose:** Build production GPU image for RunPod deployment
**Prerequisites:** Docker with buildx, `worker/Dockerfile.gpu`
**Platform:** `linux/amd64` only
**Usage:** Prepare for deployment

```bash
make build-prod
# Uses worker/Dockerfile.gpu
# Installs CUDA-enabled PyTorch
# Configures for GPU inference
# Tags with full registry path
```

#### `make push`

**Purpose:** Push production image to container registry
**Prerequisites:** Built production image, registry authentication
**Usage:** Make image available to RunPod
**Success Indicator:** Push completion with digest

#### `make deploy`

**Purpose:** Update RunPod endpoint with new image
**Prerequisites:** `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY`, pushed image
**Usage:** Production deployment
**Caution:** Overwrites live endpoint configuration

### S3 and Volume Management

#### `make upload-extra-yaml`

**Purpose:** Upload model path configuration to RunPod volume
**Prerequisites:** S3 credentials, `extra_model_paths.yaml` file
**Usage:** Configure ComfyUI model discovery
**Target Location:** `s3://RUNPOD_VOLUME_ID/ComfyUI/extra_model_paths.yaml`

```bash
make upload-extra-yaml
# Uploads local extra_model_paths.yaml
# Enables ComfyUI to find models in /runpod-volume/models/
# Required after model storage migration
```

#### `make volume-ls-models`

**Purpose:** List top-level model directories
**Prerequisites:** S3 credentials
**Usage:** Verify model organization
**Output:** Directory listing under `models/`

```bash
make volume-ls-models
# Equivalent to: aws s3 ls s3://VOLUME/models/
# Shows: unet/, clip/, vae/, checkpoints/, etc.
```

#### `make volume-ls-models-all`

**Purpose:** Recursive listing of all model files
**Prerequisites:** S3 credentials
**Usage:** Complete model inventory
**Output:** All files under `models/` with sizes

#### `make volume-ls-prefix PREFIX=<path>`

**Purpose:** List objects under specific prefix
**Prerequisites:** S3 credentials
**Usage:** Explore any directory structure
**Variables:** `PREFIX` (required), `RECURSIVE` (optional)

```bash
make volume-ls-prefix PREFIX=models/clip_vision/
make volume-ls-prefix PREFIX=inputs/ RECURSIVE=true
```

#### `make mv-file SRC=<source> DEST=<destination>`

**Purpose:** Move/rename files within the volume
**Prerequisites:** S3 credentials, source file exists
**Usage:** Reorganize volume contents
**Variables:** `SRC`, `DEST`, `DELETE_OLD` (optional)

```bash
# Rename file
make mv-file SRC=old-config.yaml DEST=config.yaml

# Move with source deletion
make mv-file SRC=temp/file.bin DEST=models/unet/file.bin DELETE_OLD=true
```

### Container Management

#### `make stop-cpu`

**Purpose:** Stop and remove CPU development container
**Prerequisites:** None
**Usage:** Clean shutdown before restart or system maintenance
**Safety:** Non-destructive, preserves volumes

#### `make wait-cpu-healthy`

**Purpose:** Pause for container startup completion
**Prerequisites:** Container starting or recently started
**Usage:** Ensure readiness before API calls
**Duration:** 2-second pause with status message

#### `make watch-paths`

**Purpose:** Monitor ComfyUI model path discovery in logs
**Prerequisites:** Running container
**Usage:** Debug model loading issues
**Output:** Filtered log lines showing path discovery

```bash
make watch-paths
# Filters for: "Adding extra search path"
# Shows model directory discovery
# Press Ctrl-C to exit
```

### Maintenance and Cleanup

#### `make clean-local`

**Purpose:** Remove local volume bind directory
**Prerequisites:** None
**Usage:** Clean slate for development
**Safety:** Only affects local development, preserves production volume

#### `make ensure-local-volume`

**Purpose:** Create local volume directory if it doesn't exist
**Prerequisites:** Write permissions in project directory
**Usage:** Automatic prerequisite for volume-mounting targets
**Location:** `./local-volume/`

## 5. AI Assistant Decision Framework

### Target Selection by User Intent

**User says: "I want to test my workflow locally"**
→ Decision path:

1. Check if CPU image exists: `docker images | grep media-labs-worker:cpu`
2. If not: `make build-cpu`
3. If test_input.json exists: `make run-cpu-once`
4. If persistent testing needed: `make serve-cpu-with-io`

**User says: "Deploy to production"**
→ Decision path:

1. Verify clean working directory: `git status`
2. Build production image: `make build-prod`
3. Push to registry: `make push`
4. Deploy to endpoint: `make deploy`
5. Verify deployment: `make test-deployment` (if available)

**User says: "Check what models are available"**
→ Decision path:

1. Quick overview: `make volume-ls-models`
2. Specific type: `make volume-ls-prefix PREFIX=models/unet/`
3. Complete inventory: `make volume-ls-models-all`

**User says: "Something's not working with the local container"**
→ Troubleshooting path:

1. Check ports: `make echo-ports`
2. Restart container: `make restart-cpu`
3. Monitor startup: logs will show automatically
4. If port conflicts: suggest alternative ports

### Combining Multiple Targets

**Efficient Workflows:**

```bash
# Complete development setup
make build-cpu && make serve-cpu-with-io

# Production deployment pipeline
make build-prod && make push && make deploy

# Model management workflow
make volume-ls-models && make upload-extra-yaml
```

**Safe Parallel Operations:**

- Build operations can run simultaneously
- S3 operations can be parallelized
- Container operations must be sequential

### Safety Prompts for Destructive Operations

**Before `make mv-file ... DELETE_OLD=true`:**
"⚠️ This will permanently delete the source file. Confirm the operation:

- Source: `{SRC}`
- Destination: `{DEST}`
- This action cannot be undone. Proceed? (y/N)"

**Before `make deploy`:**
"⚠️ This will update the production endpoint `{RUNPOD_ENDPOINT_ID}` with image `{IMAGE}`.

- Current endpoint will be unavailable during update
- Ensure the new image is tested and ready
- Proceed with deployment? (y/N)"

**Before `make clean-local`:**
"ℹ️ This will remove `{LOCAL_VOL}` directory. Local development data will be lost.

- Production volume remains unaffected
- Any local inputs/outputs will be deleted
- Proceed? (y/N)"

### Integration with Other Tools

**NPM Integration:**

- Before Docker operations: `npm run build` (if web app changes)
- After deployment: `npm run test:integration` (if available)

**AWS CLI Integration:**

- Test S3 connectivity before Makefile S3 operations
- Use AWS CLI for complex S3 operations not covered by Makefile

**Docker Integration:**

- Check `docker system df` before builds (disk space)
- Use `docker logs` for detailed debugging beyond `make watch-paths`

## 6. Maintenance and Extension Patterns

### Adding New Targets

**Follow These Conventions:**

1. **Documentation Pattern:**

```makefile
.PHONY: new-target
new-target: ## Brief description of what this target does
    # Implementation
```

2. **Variable Dependencies:**

```makefile
# Use $(call _need_env_var,VAR_NAME) pattern if needed
new-target:
    $(call _need_s3_env)  # For S3 operations
    @set -euo pipefail; \  # Bash strict mode
    # Your commands here
```

3. **Error Handling:**

```makefile
new-target:
    @set -euo pipefail; \
    command || { echo "Error: operation failed"; exit 1; }
```

**Common Target Types to Add:**

**Testing Targets:**

```makefile
.PHONY: test-api
test-api: ## Test local API endpoints
    @curl -f http://localhost:$(LOCAL_API_PORT)/health || echo "API not responding"
    @curl -f http://localhost:$(LOCAL_COMFY_PORT) || echo "ComfyUI not responding"
```

**Deployment Helpers:**

```makefile
.PHONY: deploy-status
deploy-status: ## Check RunPod endpoint status
    $(call _need_runpod_env)
    @curl -H "Authorization: Bearer $(RUNPOD_API_KEY)" \
        "https://api.runpod.ai/v2/$(RUNPOD_ENDPOINT_ID)/status"
```

**Development Conveniences:**

```makefile
.PHONY: logs
logs: ## Follow container logs with filtering
    @docker logs -f $(CPU_CONTAINER_NAME) 2>&1 | grep -E --line-buffered '(ERROR|INFO|Adding extra search path)'
```

### Environment Variable Management

**Adding New Variables:**

1. **Add to Config Section:**

```makefile
# ---------- Config ----------
NEW_VARIABLE ?= default_value
```

2. **Document in Help:**

```makefile
help:
    @echo "  NEW_VARIABLE=$(NEW_VARIABLE)"
```

3. **Add Validation if Critical:**

```makefile
define _need_new_env
    @: $${NEW_VARIABLE?Error: NEW_VARIABLE not set}
endef
```

**Variable Naming Conventions:**

- `RUNPOD_*`: RunPod service configuration
- `LOCAL_*`: Local development settings
- `IMAGE_*`: Docker image configuration
- `*_PORT`: Port mappings
- `*_DIR`: Directory paths

### Documentation Update Responsibilities

**When Adding Targets:**

1. Add to appropriate category in this guide
2. Include prerequisites, usage patterns, and examples
3. Update the target selection decision framework
4. Add to safety considerations if destructive

**When Modifying Existing Targets:**

1. Update the target reference section
2. Revise decision trees if behavior changes
3. Update any affected workflow patterns

### Makefile Best Practices for This Project

**Shell Configuration:**

```makefile
SHELL := /bin/bash
.PHONY: target-name  # Always declare phony targets
```

**Error Handling:**

```makefile
target:
    @set -euo pipefail; \  # Strict bash mode
    command1 && \          # Chain with && for error propagation
    command2 || { \        # Error handling
        echo "Recovery action"; \
        exit 1; \
    }
```

**Variable Usage:**

```makefile
# Use $(strip ) for variables that might have whitespace
-p $(strip $(LOCAL_COMFY_PORT)):$(strip $(COMFY_PORT))

# Use $${VAR} for shell variables vs $(VAR) for Make variables
@set -euo pipefail; \
VAR="value"; \
echo "$$VAR"
```

## 7. Proactive Assistance Strategies

### Recognizing Repeated Command Patterns

**Monitor for These Patterns:**

**Frequent Container Restarts:**
If user repeatedly runs:

```bash
docker stop media-labs-worker-cpu
docker rm media-labs-worker-cpu
make serve-cpu-with-io
```

**Suggest:** "I notice you're restarting the container frequently. Would you like me to add a `make quick-restart` target that combines these steps?"

**Repeated S3 Explorations:**
If user frequently runs:

```bash
make volume-ls-prefix PREFIX=models/unet/
make volume-ls-prefix PREFIX=models/clip/
make volume-ls-prefix PREFIX=models/vae/
```

**Suggest:** "I can add a `make volume-ls-all-models` target that shows all model types in a single command."

**Complex Deployment Checks:**
If user repeatedly runs:

```bash
make deploy
curl -X POST ... # manual endpoint testing
docker logs ... # checking remote logs
```

**Suggest:** "Would you like a `make deploy-and-verify` target that deploys and runs automatic health checks?"

### Suggesting Makefile Additions

**Development Efficiency Targets:**

```makefile
.PHONY: dev-setup
dev-setup: build-cpu serve-cpu-with-io wait-cpu-healthy ## Complete development environment setup
    @echo "Development environment ready!"
    @echo "ComfyUI: http://localhost:$(LOCAL_COMFY_PORT)"
    @echo "API: http://localhost:$(LOCAL_API_PORT)"

.PHONY: quick-test
quick-test: ## Quick workflow test with automatic cleanup
    $(MAKE) run-cpu-once || { $(MAKE) stop-cpu; exit 1; }
    @echo "Test completed successfully"
```

**Production Operations:**

```makefile
.PHONY: deploy-pipeline
deploy-pipeline: build-prod push deploy test-deployment ## Complete deployment pipeline
    @echo "Deployment pipeline completed successfully"

.PHONY: rollback
rollback: ## Rollback to previous image version
    @set -euo pipefail; \
    PREV_TAG=$$(docker images $(IMAGE_OWNER)/$(IMAGE_NAME) --format "table {{.Tag}}" | sed -n '2p'); \
    echo "Rolling back to $(IMAGE_OWNER)/$(IMAGE_NAME):$$PREV_TAG"; \
    # Implementation for rollback
```

**Monitoring and Diagnostics:**

```makefile
.PHONY: health-check
health-check: ## Comprehensive system health check
    @echo "=== Environment Check ==="
    @command -v docker >/dev/null && echo "✓ Docker available" || echo "✗ Docker missing"
    @command -v aws >/dev/null && echo "✓ AWS CLI available" || echo "✗ AWS CLI missing"
    @echo "=== Container Status ==="
    @docker ps | grep $(CPU_CONTAINER_NAME) && echo "✓ Container running" || echo "ℹ Container not running"
    @echo "=== Port Status ==="
    @lsof -i :$(LOCAL_COMFY_PORT) >/dev/null && echo "✓ ComfyUI port in use" || echo "ℹ ComfyUI port available"
    @lsof -i :$(LOCAL_API_PORT) >/dev/null && echo "✓ API port in use" || echo "ℹ API port available"
```

### Optimizing Developer Workflows

**Identify Optimization Opportunities:**

1. **Slow Operations:** If builds take too long, suggest Docker layer caching
2. **Repeated Setups:** If user frequently recreates environments, suggest persistent volume strategies
3. **Manual Steps:** If user performs manual verification, suggest automated checks
4. **Context Switching:** If user switches between different model types, suggest quick-switch targets

**Proactive Suggestions:**

"I notice you're working with different model types frequently. Would you like me to add targets like:

- `make switch-to-unet MODEL=your-model.safetensors`
- `make switch-to-checkpoint MODEL=your-checkpoint.ckpt`

These could automatically update the extra_model_paths.yaml and restart the container."

### Integration Opportunities

**Git Integration:**

```makefile
.PHONY: pre-deploy-check
pre-deploy-check: ## Verify clean state before deployment
    @git diff --quiet || { echo "Error: Uncommitted changes detected"; exit 1; }
    @git diff --quiet --cached || { echo "Error: Staged changes detected"; exit 1; }
    @echo "✓ Git working directory is clean"
```

**NPM Integration:**

```makefile
.PHONY: full-build
full-build: ## Build both web app and worker
    npm run build
    $(MAKE) build-prod
    @echo "✓ Complete build finished"
```

**AWS Integration:**

```makefile
.PHONY: sync-models
sync-models: ## Sync local models to volume (if local models exist)
    @if [ -d "./models" ]; then \
        aws s3 sync ./models/ s3://$(RUNPOD_VOLUME_ID)/models/ \
            --endpoint-url "$(RUNPOD_S3_ENDPOINT)" --region "$(RUNPOD_S3_REGION)"; \
    else \
        echo "No local models directory found"; \
    fi
```

## 8. Troubleshooting and Error Recovery

### Common Error Patterns and Solutions

#### Container and Port Issues

**Error:** `bind: address already in use`
**Cause:** Port conflict on `LOCAL_COMFY_PORT` or `LOCAL_API_PORT`
**Solution:**

```bash
# Identify what's using the port
lsof -i :8188
# Kill the process or use alternative ports
make serve-cpu-with-io LOCAL_COMFY_PORT=8189 LOCAL_API_PORT=8001
```

**Error:** `Cannot connect to the Docker daemon`
**Cause:** Docker not running or permission issues
**Solution:**

```bash
# Start Docker Desktop (macOS)
open -a Docker
# Or check Docker service (Linux)
sudo systemctl status docker
```

**Error:** `Error response from daemon: No such container`
**Cause:** Container was manually removed or never created
**Solution:**

```bash
# Clean start
make stop-cpu  # Safe cleanup
make serve-cpu-with-io  # Fresh start
```

#### S3 and Environment Issues

**Error:** `NoSuchBucket: The specified bucket does not exist`
**Cause:** Incorrect `RUNPOD_VOLUME_ID` or endpoint
**Solution:**

```bash
# Verify S3 configuration
aws s3 ls --endpoint-url="$RUNPOD_S3_ENDPOINT" --region="$RUNPOD_S3_REGION"
# Check environment variables
make help  # Shows current config
```

**Error:** `InvalidAccessKeyId: The AWS Access Key Id you provided does not exist`
**Cause:** Incorrect S3 credentials
**Solution:**

```bash
# Verify credentials in .env.local
grep RUNPOD_S3 .env.local
# Test with AWS CLI
aws s3 ls s3://$RUNPOD_VOLUME_ID/ --endpoint-url="$RUNPOD_S3_ENDPOINT"
```

**Error:** `An error occurred (SignatureDoesNotMatch)`
**Cause:** Incorrect secret key or clock skew
**Solution:**

```bash
# Check system time
date
# Verify secret key (don't echo it)
[ -z "$RUNPOD_S3_SECRET_ACCESS_KEY" ] && echo "Secret key not set"
```

#### Build and Image Issues

**Error:** `No such file or directory: worker/Dockerfile.cpu`
**Cause:** Running from wrong directory
**Solution:**

```bash
# Ensure you're in project root
pwd  # Should show .../media-labs
ls worker/Dockerfile.cpu  # Should exist
```

**Error:** `failed to solve: failed to read dockerfile`
**Cause:** Docker build context or Dockerfile syntax
**Solution:**

```bash
# Verify Docker context
ls worker/  # Should contain Dockerfiles
# Test Docker build directly
docker build -f worker/Dockerfile.cpu .
```

**Error:** `Error parsing reference: "your-dockerhub-user/media-labs-worker:0.1.0" is not a valid repository/tag`
**Cause:** Invalid characters in `IMAGE_OWNER` or `IMAGE_NAME`
**Solution:**

```bash
# Check image variables
make help | grep IMAGE
# Fix in .env.local (use lowercase, hyphens only)
```

#### RunPod API Issues

**Error:** `Unauthorized: Invalid API key`
**Cause:** Incorrect or missing `RUNPOD_API_KEY`
**Solution:**

```bash
# Verify API key format (should start with 'rp_')
echo $RUNPOD_API_KEY | cut -c1-3  # Should show 'rp_'
# Test API access
curl -H "Authorization: Bearer $RUNPOD_API_KEY" https://api.runpod.ai/v2/user
```

**Error:** `Not Found: Endpoint not found`
**Cause:** Incorrect `RUNPOD_ENDPOINT_ID`
**Solution:**

```bash
# Verify endpoint ID
curl -H "Authorization: Bearer $RUNPOD_API_KEY" https://api.runpod.ai/v2/endpoints
# Check endpoint status in RunPod console
```

### Recovery Procedures

#### Complete Environment Reset

**When everything seems broken:**

```bash
# 1. Stop all containers
make stop-cpu
docker system prune -f  # Remove unused containers/networks

# 2. Clean local state
make clean-local
rm -rf .next/  # If Next.js cache is corrupted

# 3. Rebuild from scratch
make build-cpu
make ensure-local-volume
make serve-cpu-with-io
```

#### S3 Connection Recovery

**When S3 operations fail:**

```bash
# 1. Test basic connectivity
ping s3api-eu-ro-1.runpod.io  # Replace with your region

# 2. Verify DNS resolution
nslookup $RUNPOD_S3_ENDPOINT

# 3. Test with minimal AWS command
AWS_ACCESS_KEY_ID="$RUNPOD_S3_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$RUNPOD_S3_SECRET_ACCESS_KEY" \
aws s3 ls --endpoint-url="$RUNPOD_S3_ENDPOINT" --region="$RUNPOD_S3_REGION"
```

#### Model Path Recovery

**When ComfyUI can't find models:**

```bash
# 1. Verify model storage structure
make volume-ls-models

# 2. Check extra_model_paths.yaml
cat extra_model_paths.yaml

# 3. Re-upload configuration
make upload-extra-yaml

# 4. Restart container to reload paths
make restart-cpu
```

#### Production Deployment Recovery

**When deployment fails:**

```bash
# 1. Check endpoint status
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
    "https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/status"

# 2. Verify image exists in registry
docker manifest inspect $IMAGE

# 3. Check RunPod endpoint logs in console

# 4. Rollback if necessary (manual process)
# - Update endpoint to previous working image
# - Or rebuild and redeploy
```

### Diagnostic Commands

**Quick Health Check:**

```bash
# Environment
make help | grep -E "(IMAGE|ENDPOINT|VOLUME)"

# Docker
docker version && docker images | grep media-labs

# Ports
make echo-ports && netstat -an | grep -E "(8188|8000)"

# S3 connectivity
aws s3 ls s3://$RUNPOD_VOLUME_ID/ --endpoint-url="$RUNPOD_S3_ENDPOINT" | head -5
```

**Container Debugging:**

```bash
# Container status
docker ps -a | grep media-labs

# Resource usage
docker stats $(docker ps -q --filter "name=media-labs")

# Container inspection
docker inspect media-labs-worker-cpu | jq '.[] | {State, NetworkSettings}'
```

**Log Analysis:**

```bash
# Recent container logs
docker logs --tail 50 media-labs-worker-cpu

# Filter for errors
docker logs media-labs-worker-cpu 2>&1 | grep -i error

# Watch for specific patterns
docker logs -f media-labs-worker-cpu 2>&1 | grep -E "(ERROR|WARN|Adding extra search path)"
```

---

## AI Assistant Responsibilities

As an AI assistant using this guide, you are expected to:

1. **Always check prerequisites** before suggesting Makefile operations
2. **Provide safety warnings** for destructive operations
3. **Suggest optimizations** when you notice repeated patterns
4. **Maintain this documentation** by proposing updates when gaps are discovered
5. **Proactively offer** to add new targets for common workflows
6. **Troubleshoot systematically** using the patterns in this guide
7. **Integrate knowledge** from other project documentation (README, how-to-develop.md, etc.)

Remember: You are not just executing commands, but actively improving the developer experience by maintaining and extending the Makefile ecosystem.
