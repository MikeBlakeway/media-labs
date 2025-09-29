# Simplified Makefile for Media Labs Web Application
# Load environment variables from .env file if it exists
-include .env
export

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m

# Project configuration
PROJECT_NAME := media-labs

# Required environment variables
REQUIRED_ENV_VARS := RUNPOD_API_KEY RUNPOD_ENDPOINT_ID

##@ Setup and Installation

.PHONY: help
help: ## Display this help message
	@echo "$(BLUE)Media Labs Web Application$(RESET)"
	@echo "$(YELLOW)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Complete project setup
	@echo "$(GREEN)Setting up Media Labs project...$(RESET)"
	@$(MAKE) install
	@$(MAKE) env-setup
	@$(MAKE) env-check
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start development.$(RESET)"

.PHONY: install
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(RESET)"
	npm install
	@echo "$(GREEN)✅ Dependencies installed$(RESET)"

.PHONY: env-setup
env-setup: ## Initialize environment from template
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from template...$(RESET)"; \
		cp .env.example .env; \
		echo "$(GREEN)✅ Environment file created$(RESET)"; \
		echo "$(YELLOW)⚠️  Please edit .env with your RunPod credentials$(RESET)"; \
	else \
		echo "$(GREEN)✅ .env file already exists$(RESET)"; \
	fi

.PHONY: env-check
env-check: ## Verify required environment variables
	@echo "$(BLUE)Checking environment variables...$(RESET)"
	@npm run env:check

.PHONY: clean
clean: ## Clean all build artifacts and dependencies
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/.next
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

##@ Development

.PHONY: dev
dev: env-check ## Start the web application in development mode
	@echo "$(GREEN)Starting development server...$(RESET)"
	npm run dev

##@ Building

.PHONY: build
build: ## Build web application for production
	@echo "$(BLUE)Building web application...$(RESET)"
	npm run build
	@echo "$(GREEN)✅ Web application built$(RESET)"

##@ Testing

.PHONY: test
test: ## Run tests
	@echo "$(BLUE)Running tests...$(RESET)"
	npm run test
	@echo "$(GREEN)✅ Tests complete$(RESET)"

##@ Code Quality

.PHONY: lint
lint: ## Lint code
	@echo "$(BLUE)Linting code...$(RESET)"
	npm run lint
	@echo "$(GREEN)✅ Linting complete$(RESET)"

.PHONY: format
format: ## Format code
	@echo "$(BLUE)Formatting code...$(RESET)"
	npm run format
	@echo "$(GREEN)✅ Code formatted$(RESET)"

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checks...$(RESET)"
	npm run type-check
	@echo "$(GREEN)✅ Type checking complete$(RESET)"

##@ Deployment

.PHONY: deploy
deploy: build ## Deploy web application
	@echo "$(BLUE)Deploying web application...$(RESET)"
	# Add your deployment commands here (Vercel, Netlify, etc.)
	@echo "$(GREEN)✅ Deployment ready$(RESET)"
	@echo "$(YELLOW)Note: Configure your hosting platform to deploy the built application$(RESET)"

##@ Docker Operations

# Multi-Model Worker Configuration
WORKER_IMAGE_NAME := ghcr.io/media-labs/multi-model-worker
WORKER_VERSION ?= $(shell git rev-parse --short HEAD)
WORKER_DOCKER_DIR := workers/multi-model-worker/docker
WORKER_CONTEXT := workers/multi-model-worker

.PHONY: build-worker
build-worker: ## Build multi-model worker Docker image
	@echo "$(BLUE)Building multi-model worker image...$(RESET)"
	@echo "$(YELLOW)Image: $(WORKER_IMAGE_NAME):$(WORKER_VERSION)$(RESET)"
	docker build \
		--platform linux/amd64 \
		--build-arg VERSION=$(WORKER_VERSION) \
		--build-arg BUILD_DATE="$(shell date -u +'%Y-%m-%dT%H:%M:%SZ')" \
		--tag $(WORKER_IMAGE_NAME):$(WORKER_VERSION) \
		--tag $(WORKER_IMAGE_NAME):latest \
		--file $(WORKER_DOCKER_DIR)/Dockerfile \
		$(WORKER_CONTEXT)
	@echo "$(GREEN)✅ Worker image built: $(WORKER_IMAGE_NAME):$(WORKER_VERSION)$(RESET)"

.PHONY: push-worker
push-worker: build-worker ## Build and push multi-model worker to registry
	@echo "$(BLUE)Pushing worker image to registry...$(RESET)"
	docker push $(WORKER_IMAGE_NAME):$(WORKER_VERSION)
	docker push $(WORKER_IMAGE_NAME):latest
	@echo "$(GREEN)✅ Worker image pushed$(RESET)"

.PHONY: test-worker
test-worker: build-worker ## Test multi-model worker container
	@echo "$(BLUE)Testing worker container...$(RESET)"
	@echo "$(YELLOW)Running basic container health check...$(RESET)"
	docker run --rm \
		--platform linux/amd64 \
		$(WORKER_IMAGE_NAME):$(WORKER_VERSION) \
		health
	@echo "$(GREEN)✅ Worker container test passed$(RESET)"

.PHONY: run-worker-local
run-worker-local: build-worker ## Run worker container locally for testing
	@echo "$(BLUE)Running worker container locally...$(RESET)"
	@echo "$(YELLOW)Container will run in foreground. Press Ctrl+C to stop.$(RESET)"
	docker run --rm -it \
		--platform linux/amd64 \
		-p 8000:8000 \
		-e LOG_LEVEL=DEBUG \
		-e VALIDATION_MODE=basic \
		--name media-labs-worker-test \
		$(WORKER_IMAGE_NAME):$(WORKER_VERSION)

.PHONY: worker-shell
worker-shell: build-worker ## Open interactive shell in worker container
	@echo "$(BLUE)Opening shell in worker container...$(RESET)"
	docker run --rm -it \
		--platform linux/amd64 \
		--entrypoint /bin/bash \
		-e LOG_LEVEL=DEBUG \
		$(WORKER_IMAGE_NAME):$(WORKER_VERSION)

.PHONY: clean-worker
clean-worker: ## Clean worker Docker images and containers
	@echo "$(YELLOW)Cleaning worker Docker resources...$(RESET)"
	docker rmi $(WORKER_IMAGE_NAME):$(WORKER_VERSION) $(WORKER_IMAGE_NAME):latest 2>/dev/null || true
	docker system prune -f
	@echo "$(GREEN)✅ Worker Docker cleanup complete$(RESET)"

.PHONY: worker-logs
worker-logs: ## Show logs for running worker container
	@if docker ps --format "table {{.Names}}" | grep -q "media-labs-worker"; then \
		echo "$(BLUE)Showing worker container logs...$(RESET)"; \
		docker logs -f media-labs-worker; \
	else \
		echo "$(RED)No running worker container found$(RESET)"; \
	fi

.PHONY: worker-info
worker-info: ## Show worker image information
	@echo "$(BLUE)Multi-Model Worker Information:$(RESET)"
	@echo "Image name: $(WORKER_IMAGE_NAME)"
	@echo "Version: $(WORKER_VERSION)"
	@echo "Docker context: $(WORKER_CONTEXT)"
	@echo "Dockerfile: $(WORKER_DOCKER_DIR)/Dockerfile"
	@if docker images $(WORKER_IMAGE_NAME) --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep -v REPOSITORY; then \
		echo "$(GREEN)Available images:$(RESET)"; \
		docker images $(WORKER_IMAGE_NAME) --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"; \
	else \
		echo "$(YELLOW)No worker images found. Run 'make build-worker' to build.$(RESET)"; \
	fi

##@ Utilities

.PHONY: start
start: ## Start production build locally
	@echo "$(BLUE)Starting production server...$(RESET)"
	npm run start

.PHONY: debug
debug: ## Show debug information
	@echo "$(BLUE)Project Debug Information:$(RESET)"
	@echo "Node.js version: $(shell node --version)"
	@echo "npm version: $(shell npm --version)"
	@echo "Project name: $(PROJECT_NAME)"
	@echo "Required env vars: $(REQUIRED_ENV_VARS)"
	@if [ -f .env ]; then echo "✅ .env file exists"; else echo "❌ .env file missing"; fi
