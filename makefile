# Media Labs – Worker Makefile
# Usage: `make help`

# --- Dotenv loader -----------------------------------------------------------
# Which env file to load by default. You can override: `make ... ENVFILE=.env`
ENVFILE ?= .env.local

# Load the file if it exists (GNU make can parse KEY=VALUE and ignores # comments)
ifneq (,$(wildcard $(ENVFILE)))
include $(ENVFILE)
endif

# Export all variables defined in this Makefile (incl. ones from $(ENVFILE))
# so recipes (docker, aws, curl…) see them as environment variables.
.EXPORT_ALL_VARIABLES:
# ---------------------------------------------------------------------------

SHELL := /bin/bash

# ---------- Config ----------
IMAGE_OWNER ?= your-dockerhub-user
IMAGE_NAME  ?= media-labs-worker
IMAGE_TAG   ?= 0.1.0

# Final serverless image (linux/amd64)
IMAGE := $(IMAGE_OWNER)/$(IMAGE_NAME):$(IMAGE_TAG)

# Local CPU image (for macOS dev)
CPU_IMAGE := $(IMAGE_NAME):cpu
CPU_CONTAINER_NAME ?= media-labs-worker-cpu

# Ports
# ComfyUI (inside container)
COMFY_PORT ?= 8188
# host -> container mapping
LOCAL_COMFY_PORT ?= 8188
# RunPod SDK local dev API
LOCAL_API_PORT ?= 8000

# Paths
WORKER_DIR  := worker
TEST_INPUT  := $(WORKER_DIR)/test_input.json
LOCAL_VOL   ?= $(PWD)/local-volume

# RunPod endpoint (set these in your shell or .envrc)
RUNPOD_ENDPOINT_ID ?=
RUNPOD_API_KEY     ?=

# Runpod S3 (Network Volume) for model paths YAML
RUNPOD_S3_ENDPOINT          ?=
RUNPOD_S3_REGION            ?=
RUNPOD_S3_ACCESS_KEY_ID     ?=
RUNPOD_S3_SECRET_ACCESS_KEY ?=
# = your Network Volume ID (bucket name)
RUNPOD_VOLUME_ID            ?=
EXTRA_YAML_LOCAL            ?= ./extra_model_paths.yaml
EXTRA_YAML_S3_KEY           ?= ComfyUI/extra_model_paths.yaml

# ---------- Helpers ----------
.PHONY: help
help: ## Show available targets
	@awk 'BEGIN {FS":.*##"; printf "\n\033[1mTargets\033[0m\n"} /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Config:"
	@echo "  IMAGE=$(IMAGE)"
	@echo "  CPU_IMAGE=$(CPU_IMAGE)"
	@echo "  LOCAL_API_PORT=$(LOCAL_API_PORT)  LOCAL_COMFY_PORT=$(LOCAL_COMFY_PORT)"
	@echo "  RUNPOD_ENDPOINT_ID=$(RUNPOD_ENDPOINT_ID)"
	@echo ""

.PHONY: echo-ports
echo-ports: ## Print resolved port variables (angle brackets reveal stray spaces)
	@printf 'LOCAL_COMFY_PORT = &lt;%s&gt;\n' "$(LOCAL_COMFY_PORT)"
	@printf 'COMFY_PORT       = &lt;%s&gt;\n' "$(COMFY_PORT)"
	@printf 'LOCAL_API_PORT   = &lt;%s&gt;\n' "$(LOCAL_API_PORT)"

# ---------- Local CPU build/run (macOS) ----------
.PHONY: build-cpu
build-cpu: ## Build CPU-only local image (macOS-friendly)
	docker build -t $(CPU_IMAGE) -f $(WORKER_DIR)/Dockerfile.cpu .

.PHONY: run-cpu-once
run-cpu-once: build-cpu ensure-local-volume ## Run once with test_input.json (container exits after handling)
	@[ -f "$(TEST_INPUT)" ] || (echo "Missing $(TEST_INPUT)"; exit 1)
	docker run --rm \
	  -v "$(LOCAL_VOL):/runpod-volume" \
	  -v "$(PWD)/$(TEST_INPUT):/workspace/app/test_input.json" \
	  -p $(strip $(LOCAL_COMFY_PORT)):$(strip $(COMFY_PORT)) \
	  -e COMFY_ARGS="--cpu --listen 0.0.0.0 --port $(strip $(COMFY_PORT)) --extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml" \
	  -e CUDA_VISIBLE_DEVICES=-1 \
	  -e COMFY_START_TIMEOUT=300 \
	  $(CPU_IMAGE) \
	  python -m src.server --test_input /workspace/app/test_input.json


.PHONY: serve-cpu
serve-cpu: build-cpu ensure-local-volume ## Serve local dev API (POST to http://localhost:8000/runsync)
	docker run --rm -it \
	  --name $(CPU_CONTAINER_NAME) \
	  -v "$(LOCAL_VOL):/runpod-volume" \
	  -p $(strip $(LOCAL_COMFY_PORT)):$(strip $(COMFY_PORT)) \
	  -p $(strip $(LOCAL_API_PORT)):$(strip $(LOCAL_API_PORT)) \
	  -e COMFY_ARGS="--cpu --listen 0.0.0.0 --port $(strip $(COMFY_PORT)) --extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml" \
	  -e CUDA_VISIBLE_DEVICES=-1 \
	  -e COMFY_START_TIMEOUT=300 \
	  $(CPU_IMAGE) \
	  bash -lc 'python -m src.server --rp_serve_api --rp_api_host 0.0.0.0 --rp_api_port $(strip $(LOCAL_API_PORT)) || python -m src.server --rp_server_api --rp_api_host 0.0.0.0 --rp_api_port $(strip $(LOCAL_API_PORT))'


.PHONY: shell-cpu
shell-cpu: ## Exec into the running CPU container
	docker exec -it $(CPU_CONTAINER_NAME) bash

.PHONY: logs-cpu
logs-cpu: ## Tail container logs for the running CPU container
	docker logs -f $(CPU_CONTAINER_NAME)

.PHONY: curl-local
curl-local: ## Send test_input.json to local dev API (/runsync)
	@[ -f "$(TEST_INPUT)" ] || (echo "Missing $(TEST_INPUT)"; exit 1)
	curl -sS -X POST "http://127.0.0.1:$(LOCAL_API_PORT)/runsync" \
	  -H "content-type: application/json" \
	  --data-binary @$(TEST_INPUT) | jq .

.PHONY: ensure-local-volume
ensure-local-volume:
	@mkdir -p "$(LOCAL_VOL)/ComfyUI"
	@if [ ! -f "$(LOCAL_VOL)/ComfyUI/extra_model_paths.yaml" ] && [ -f "$(EXTRA_YAML_LOCAL)" ]; then \
	  cp "$(EXTRA_YAML_LOCAL)" "$(LOCAL_VOL)/ComfyUI/extra_model_paths.yaml"; \
	  echo "Copied $(EXTRA_YAML_LOCAL) -> $(LOCAL_VOL)/ComfyUI/extra_model_paths.yaml"; \
	fi

# ---------- Cross-build for linux/amd64 (RunPod) ----------
.PHONY: buildx-init
buildx-init: ## Create/enable a buildx builder (once)
	-docker buildx create --use --name mlabs-builder
	docker buildx inspect --bootstrap

.PHONY: build-amd64
build-amd64: ## Cross-build linux/amd64 image (no push; loads if supported)
	docker buildx build --platform linux/amd64 \
	  -t $(IMAGE) \
	  -f $(WORKER_DIR)/Dockerfile \
	  --load .

.PHONY: push-amd64
push-amd64: ## Cross-build and PUSH linux/amd64 image (recommended for Apple Silicon)
	docker buildx build --platform linux/amd64 \
	  -t $(IMAGE) \
	  -f $(WORKER_DIR)/Dockerfile \
	  --push .

# ---------- RunPod Endpoint helpers ----------
define _need_endpoint_env
	@if [ -z "$$RUNPOD_ENDPOINT_ID" ] || [ -z "$$RUNPOD_API_KEY" ]; then \
	  echo "Set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY in your shell."; \
	  exit 1; \
	fi
endef

.PHONY: endpoint-runsync
endpoint-runsync: ## POST test_input.json to RunPod /runsync (requires RUNPOD_* env)
	$(call _need_endpoint_env)
	@[ -f "$(TEST_INPUT)" ] || (echo "Missing $(TEST_INPUT)"; exit 1)
	curl -sS -X POST "https://api.runpod.ai/v2/$(RUNPOD_ENDPOINT_ID)/runsync" \
	  -H "Authorization: Bearer $(RUNPOD_API_KEY)" \
	  -H "content-type: application/json" \
	  --data-binary @$(TEST_INPUT) | jq .

.PHONY: endpoint-run
endpoint-run: ## POST test_input.json to RunPod /run (async). Echo job id.
	$(call _need_endpoint_env)
	@[ -f "$(TEST_INPUT)" ] || (echo "Missing $(TEST_INPUT)"; exit 1)
	curl -sS -X POST "https://api.runpod.ai/v2/$(RUNPOD_ENDPOINT_ID)/run" \
	  -H "Authorization: Bearer $(RUNPOD_API_KEY)" \
	  -H "content-type: application/json" \
	  --data-binary @$(TEST_INPUT) | tee /dev/stderr | jq -r '.id // .requestId'

.PHONY: endpoint-status
endpoint-status: ## GET /status for a job. Usage: make endpoint-status JOB_ID=<id>
	$(call _need_endpoint_env)
	@if [ -z "$(JOB_ID)" ]; then echo "Usage: make endpoint-status JOB_ID=<id>"; exit 1; fi
	curl -sS -X GET "https://api.runpod.ai/v2/$(RUNPOD_ENDPOINT_ID)/status/$(JOB_ID)" \
	  -H "Authorization: Bearer $(RUNPOD_API_KEY)" | jq .

# ---------- Upload extra_model_paths.yaml to Network Volume (S3) ----------
define _need_s3_env
	@if [ -z "$$RUNPOD_S3_ENDPOINT" ] || [ -z "$$RUNPOD_S3_REGION" ] || [ -z "$$RUNPOD_S3_ACCESS_KEY_ID" ] || [ -z "$$RUNPOD_S3_SECRET_ACCESS_KEY" ] || [ -z "$$RUNPOD_VOLUME_ID" ]; then \
	  echo "Set RUNPOD_S3_ENDPOINT, RUNPOD_S3_REGION, RUNPOD_S3_ACCESS_KEY_ID, RUNPOD_S3_SECRET_ACCESS_KEY, RUNPOD_VOLUME_ID."; \
	  exit 1; \
	fi
endef

.PHONY: volume-upload-yaml
volume-upload-yaml: ## Upload extra_model_paths.yaml to s3://$RUNPOD_VOLUME_ID/$(EXTRA_YAML_S3_KEY)
	$(call _need_s3_env)
	@[ -f "$(EXTRA_YAML_LOCAL)" ] || (echo "Missing $(EXTRA_YAML_LOCAL)"; exit 1)
	AWS_ACCESS_KEY_ID="$(RUNPOD_S3_ACCESS_KEY_ID)" \
	AWS_SECRET_ACCESS_KEY="$(RUNPOD_S3_SECRET_ACCESS_KEY)" \
	aws s3 cp "$(EXTRA_YAML_LOCAL)" "s3://$(RUNPOD_VOLUME_ID)/$(EXTRA_YAML_S3_KEY)" \
	  --endpoint-url "$(RUNPOD_S3_ENDPOINT)" \
	  --region "$(RUNPOD_S3_REGION)"

.PHONY: volume-ls-yaml
volume-ls-yaml: ## List YAML on Network Volume
	$(call _need_s3_env)
	AWS_ACCESS_KEY_ID="$(RUNPOD_S3_ACCESS_KEY_ID)" \
	AWS_SECRET_ACCESS_KEY="$(RUNPOD_S3_SECRET_ACCESS_KEY)" \
	aws s3 ls "s3://$(RUNPOD_VOLUME_ID)/$(EXTRA_YAML_S3_KEY)" \
	  --endpoint-url "$(RUNPOD_S3_ENDPOINT)" \
	  --region "$(RUNPOD_S3_REGION)"

# ---------- Clean ----------
.PHONY: clean-local
clean-local: ## Remove local volume bind dir (keeps your real Network Volume intact)
	rm -rf "$(LOCAL_VOL)"
	@echo "Removed $(LOCAL_VOL)"
