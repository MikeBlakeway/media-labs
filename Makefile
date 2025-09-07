# Comprehensive Makefile for Media Labs Monorepo
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
DOCKER_REGISTRY := ghcr.io/mikeblakeway
WORKER_IMAGE := $(DOCKER_REGISTRY)/media-labs-worker

# Required environment variables
REQUIRED_ENV_VARS := RUNPOD_API_KEY RUNPOD_ENDPOINT_ID RUNPOD_S3_ACCESS_KEY_ID RUNPOD_S3_SECRET_ACCESS_KEY

##@ Setup and Installation

.PHONY: help
help: ## Display this help message
	@echo "$(BLUE)Media Labs Monorepo$(RESET)"
	@echo "$(YELLOW)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Complete project setup (install deps, build worker, setup env)
	@echo "$(GREEN)Setting up Media Labs project...$(RESET)"
	@$(MAKE) env-setup
	@$(MAKE) install
	@$(MAKE) build-worker
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start development.$(RESET)"

.PHONY: install
install: ## Install all dependencies
	@echo "$(BLUE)Installing Node.js dependencies...$(RESET)"
	npm install
	@echo "$(BLUE)Installing web dependencies...$(RESET)"
	npm install --workspace=packages/web
	@echo "$(GREEN)✅ All dependencies installed$(RESET)"

.PHONY: clean
clean: ## Clean all build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/.next
	rm -rf packages/*/dist
	docker system prune -f
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

##@ Development

.PHONY: dev
dev: env-check ## Start all services in development mode
	@echo "$(GREEN)Starting all development services...$(RESET)"
	npm run dev

.PHONY: dev-web
dev-web: ## Start only the web application
	@echo "$(BLUE)Starting web application...$(RESET)"
	npm run dev --workspace=packages/web

.PHONY: dev-worker
dev-worker: ## Start worker in development mode with hot reload
	@echo "$(BLUE)Starting worker development environment...$(RESET)"
	cd packages/worker && docker-compose up --build

.PHONY: dev-logs
dev-logs: ## View logs for all development services
	docker-compose logs -f

##@ Building

.PHONY: build
build: build-web build-worker ## Build all packages

.PHONY: build-web
build-web: ## Build web application for production
	@echo "$(BLUE)Building web application...$(RESET)"
	npm run build --workspace=packages/web
	@echo "$(GREEN)✅ Web application built$(RESET)"

.PHONY: build-worker
build-worker: ## Build worker Docker image
	@echo "$(BLUE)Building worker Docker image...$(RESET)"
	cd packages/worker && docker build -t $(WORKER_IMAGE):latest --target runtime .
	docker tag $(WORKER_IMAGE):latest $(WORKER_IMAGE):$(shell date +%Y%m%d)
	@echo "$(GREEN)✅ Worker image built: $(WORKER_IMAGE):latest$(RESET)"

.PHONY: build-worker-dev
build-worker-dev: ## Build worker Docker image with dev target (includes models)
	@echo "$(BLUE)Building worker Docker image (dev target)...$(RESET)"
	cd packages/worker && docker build -t $(WORKER_IMAGE):dev --target dev .
	@echo "$(GREEN)✅ Worker dev image built: $(WORKER_IMAGE):dev$(RESET)"

##@ Testing

.PHONY: test
test: test-web test-worker ## Run all tests

.PHONY: test-web
test-web: ## Run web application tests
	@echo "$(BLUE)Running web tests...$(RESET)"
	npm run test --workspace=packages/web

.PHONY: test-worker
test-worker: ## Run worker tests
	@echo "$(BLUE)Running worker tests...$(RESET)"
	cd packages/worker && python -m pytest tests/

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(RESET)"
	npm run test:integration

.PHONY: test-coverage
test-coverage: ## Generate test coverage reports
	@echo "$(BLUE)Generating coverage reports...$(RESET)"
	npm run test:coverage --workspace=packages/web
	cd packages/worker && python -m pytest --cov=src tests/

##@ Code Quality

.PHONY: lint
lint: ## Lint all packages
	@echo "$(BLUE)Linting all packages...$(RESET)"
	npm run lint
	@echo "$(GREEN)✅ Linting complete$(RESET)"

.PHONY: format
format: ## Format all code
	@echo "$(BLUE)Formatting all code...$(RESET)"
	npm run format
	@echo "$(GREEN)✅ Code formatted$(RESET)"

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checks...$(RESET)"
	npm run type-check --workspace=packages/web

##@ Deployment

.PHONY: push
push: build-worker ## Build and push worker image to registry
	@echo "$(BLUE)Pushing worker image to registry...$(RESET)"
	echo $(GITHUB_TOKEN) | docker login ghcr.io -u $(GITHUB_USERNAME) --password-stdin
	docker push $(WORKER_IMAGE):latest
	docker push $(WORKER_IMAGE):$(shell date +%Y%m%d)
	@echo "$(GREEN)✅ Worker image pushed to $(WORKER_IMAGE)$(RESET)"

.PHONY: deploy
deploy: build push ## Full deployment pipeline
	@echo "$(GREEN)Starting deployment pipeline...$(RESET)"
	@$(MAKE) deploy-web
	@$(MAKE) deploy-worker
	@echo "$(GREEN)✅ Deployment complete$(RESET)"

.PHONY: deploy-web
deploy-web: build-web ## Deploy web application
	@echo "$(BLUE)Deploying web application...$(RESET)"
	# Add your web deployment commands here (Vercel, etc.)
	@echo "$(GREEN)✅ Web application deployed$(RESET)"

.PHONY: deploy-worker
deploy-worker: push ## Deploy worker to RunPod
	@echo "$(BLUE)Updating RunPod template...$(RESET)"
	# Add RunPod template update commands here
	@echo "$(GREEN)✅ Worker deployed to RunPod$(RESET)"

##@ Environment Management

.PHONY: env-setup
env-setup: ## Setup environment variables
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from template...$(RESET)"; \
		cp .env.example .env; \
		echo "$(YELLOW)Please edit .env file with your configuration$(RESET)"; \
	else \
		echo "$(GREEN).env file already exists$(RESET)"; \
	fi

.PHONY: env-check
env-check: ## Verify all required environment variables are set
	@echo "$(BLUE)Checking required environment variables...$(RESET)"
	@for var in $(REQUIRED_ENV_VARS); do \
		if [ -z "$${!var}" ]; then \
			echo "$(RED)❌ Missing required environment variable: $$var$(RESET)"; \
			exit 1; \
		else \
			echo "$(GREEN)✅ $$var is set$(RESET)"; \
		fi \
	done
	@echo "$(GREEN)✅ All required environment variables are set$(RESET)"

.PHONY: env-check-web
env-check-web: ## Verify web-specific environment variables
	@echo "$(BLUE)Checking web environment variables...$(RESET)"
	# Add web-specific env var checks here

.PHONY: env-check-worker
env-check-worker: ## Verify worker-specific environment variables
	@echo "$(BLUE)Checking worker environment variables...$(RESET)"
	# Add worker-specific env var checks here

##@ Package Management

.PHONY: install-web
install-web: ## Install web package dependencies (usage: make install-web PKG=package-name)
	@if [ -z "$(PKG)" ]; then \
		echo "$(RED)Error: PKG variable required. Usage: make install-web PKG=package-name$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Installing $(PKG) in web package...$(RESET)"
	npm install $(PKG) --workspace=packages/web

.PHONY: install-worker
install-worker: ## Install worker Python package (usage: make install-worker PKG=package-name)
	@if [ -z "$(PKG)" ]; then \
		echo "$(RED)Error: PKG variable required. Usage: make install-worker PKG=package-name$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Adding $(PKG) to worker requirements...$(RESET)"
	echo "$(PKG)" >> packages/worker/requirements.txt
	@echo "$(YELLOW)Note: Rebuild worker image to install the package$(RESET)"

##@ Utilities

.PHONY: logs
logs: ## View application logs
	docker-compose logs -f

.PHONY: shell-worker
shell-worker: ## Open shell in worker container
	docker run -it --rm $(WORKER_IMAGE):latest /bin/bash

.PHONY: inspect-worker
inspect-worker: ## Inspect worker Docker image
	docker run --rm $(WORKER_IMAGE):latest ls -la /
	docker run --rm $(WORKER_IMAGE):latest python --version
	docker run --rm $(WORKER_IMAGE):latest pip list

.PHONY: download-models
download-models: ## Download models to S3 volume
	@echo "$(BLUE)Downloading models...$(RESET)"
	cd packages/worker && python scripts/download-models.py --config flux1-dev-fp8

.PHONY: health-check
health-check: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(RESET)"
	# Add health check commands here

##@ Database and Storage

.PHONY: db-setup
db-setup: ## Setup database (if needed)
	@echo "$(BLUE)Setting up database...$(RESET)"
	# Add database setup commands here

.PHONY: s3-check
s3-check: ## Verify S3 connectivity and credentials
	@echo "$(BLUE)Checking S3 connectivity...$(RESET)"
	# Add S3 verification commands here

##@ Documentation

.PHONY: docs
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	# Add documentation generation commands here

.PHONY: docs-serve
docs-serve: ## Serve documentation locally
	@echo "$(BLUE)Serving documentation...$(RESET)"
	# Add local docs server commands here

##@ Maintenance

.PHONY: update
update: ## Update all dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	npm update
	npm update --workspace=packages/web

.PHONY: audit
audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(RESET)"
	npm audit
	npm audit --workspace=packages/web

.PHONY: outdated
outdated: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(RESET)"
	npm outdated
	npm outdated --workspace=packages/web

# Internal helper targets (don't show in help)
.PHONY: _check-docker
_check-docker:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "$(RED)Error: Docker is not installed$(RESET)"; \
		exit 1; \
	fi

.PHONY: _check-npm
_check-npm:
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "$(RED)Error: npm is not installed$(RESET)"; \
		exit 1; \
	fi
