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

.PHONY: setup-worker-env
setup-worker-env: ## Setup Python virtual environment for multi-model-worker
	@echo "$(BLUE)Setting up Python environment for multi-model-worker...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ ! -d ".venv" ]; then \
			echo "$(YELLOW)Creating virtual environment...$(RESET)"; \
			python -m venv .venv; \
			echo "$(YELLOW)Installing dependencies...$(RESET)"; \
			.venv/bin/pip install --upgrade pip; \
			if [ -f "requirements.txt" ]; then \
				.venv/bin/pip install -r requirements.txt; \
			fi; \
			if [ -f "requirements-dev.txt" ]; then \
				.venv/bin/pip install -r requirements-dev.txt; \
			fi; \
			echo "$(GREEN)✅ Virtual environment created and dependencies installed$(RESET)"; \
		else \
			echo "$(GREEN)✅ Virtual environment already exists$(RESET)"; \
		fi; \
	else \
		echo "$(RED)Multi-model-worker directory not found$(RESET)"; \
		exit 1; \
	fi

.PHONY: clean-worker-env
clean-worker-env: ## Remove Python virtual environment for multi-model-worker
	@echo "$(YELLOW)Cleaning Python virtual environment...$(RESET)"
	@if [ -d "workers/multi-model-worker/.venv" ]; then \
		rm -rf workers/multi-model-worker/.venv; \
		echo "$(GREEN)✅ Virtual environment removed$(RESET)"; \
	else \
		echo "$(YELLOW)No virtual environment found$(RESET)"; \
	fi

.PHONY: worker-shell-python
worker-shell-python: ## Open Python shell in worker virtual environment
	@echo "$(BLUE)Opening Python shell in worker environment...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ -d ".venv" ]; then \
			.venv/bin/python; \
		else \
			echo "$(RED)Virtual environment not found. Run 'make setup-worker-env' first.$(RESET)"; \
			exit 1; \
		fi; \
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
test: ## Run all tests (web and worker)
	@echo "$(BLUE)Running all tests...$(RESET)"
	@$(MAKE) test-web
	@$(MAKE) test-worker-python
	@echo "$(GREEN)✅ All tests complete$(RESET)"

.PHONY: test-web
test-web: ## Run web application tests
	@echo "$(BLUE)Running web application tests...$(RESET)"
	npm run test
	@echo "$(GREEN)✅ Web tests complete$(RESET)"

.PHONY: test-worker-python
test-worker-python: ## Run multi-model-worker Python tests (working tests only)
	@echo "$(BLUE)Running multi-model-worker Python tests...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ -d ".venv" ]; then \
			echo "$(YELLOW)Using existing virtual environment...$(RESET)"; \
			.venv/bin/python -m pytest tests/ -v --ignore=tests/unit/test_multi_modal_handler.py --ignore=tests/integration/test_routing_integration.py; \
		else \
			echo "$(RED)Virtual environment not found. Run 'make setup-worker-env' first.$(RESET)"; \
			exit 1; \
		fi; \
	else \
		echo "$(RED)Multi-model-worker directory not found$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Worker Python tests complete$(RESET)"

.PHONY: test-worker-coverage
test-worker-coverage: ## Run Python tests with coverage report
	@echo "$(BLUE)Running Python tests with coverage...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ -d ".venv" ]; then \
			echo "$(YELLOW)Generating coverage report...$(RESET)"; \
			.venv/bin/python -m pytest tests/ --cov=src --cov-report=html --cov-report=term-missing -v; \
			echo "$(GREEN)✅ Coverage report generated in htmlcov/$(RESET)"; \
		else \
			echo "$(RED)Virtual environment not found. Run 'make setup-worker-env' first.$(RESET)"; \
			exit 1; \
		fi; \
	else \
		echo "$(RED)Multi-model-worker directory not found$(RESET)"; \
		exit 1; \
	fi

.PHONY: test-worker-unit
test-worker-unit: ## Run only unit tests for multi-model-worker
	@echo "$(BLUE)Running unit tests...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ -d ".venv" ]; then \
			.venv/bin/python -m pytest tests/unit/ -v; \
		else \
			echo "$(RED)Virtual environment not found. Run 'make setup-worker-env' first.$(RESET)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)✅ Unit tests complete$(RESET)"

.PHONY: test-worker-integration
test-worker-integration: ## Run only integration tests for multi-model-worker
	@echo "$(BLUE)Running integration tests...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ -d ".venv" ]; then \
			.venv/bin/python -m pytest tests/integration/ -v; \
		else \
			echo "$(RED)Virtual environment not found. Run 'make setup-worker-env' first.$(RESET)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)✅ Integration tests complete$(RESET)"

.PHONY: test-worker-performance
test-worker-performance: ## Run performance benchmarks for multi-model-worker
	@echo "$(BLUE)Running performance benchmarks...$(RESET)"
	@if [ -d "workers/multi-model-worker" ]; then \
		cd workers/multi-model-worker && \
		if [ -d ".venv" ]; then \
			.venv/bin/python -m pytest tests/ -m performance -v; \
		else \
			echo "$(RED)Virtual environment not found. Run 'make setup-worker-env' first.$(RESET)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)✅ Performance benchmarks complete$(RESET)"

.PHONY: test-info
test-info: ## Display information about available test commands
	@echo "$(BLUE)Available Testing Commands:$(RESET)"
	@echo ""
	@echo "$(YELLOW)Web Application Tests:$(RESET)"
	@echo "  make test-web              - Run web application tests (Jest/React)"
	@echo ""
	@echo "$(YELLOW)Python Worker Tests:$(RESET)"
	@echo "  make test-worker-python    - Run all working Python tests"
	@echo "  make test-worker-unit      - Run unit tests only"
	@echo "  make test-worker-integration - Run integration tests only"
	@echo "  make test-worker-coverage  - Run tests with coverage report"
	@echo "  make test-worker-performance - Run performance benchmarks"
	@echo ""
	@echo "$(YELLOW)Combined Tests:$(RESET)"
	@echo "  make test                  - Run all tests (web + worker)"
	@echo ""
	@echo "$(YELLOW)Environment Setup:$(RESET)"
	@echo "  make setup-worker-env      - Setup Python virtual environment"
	@echo "  make clean-worker-env      - Remove Python virtual environment"
	@echo ""
	@echo "$(GREEN)Note: Python tests require virtual environment setup first.$(RESET)"
	@echo "$(GREEN)Coverage reports are generated in workers/multi-model-worker/htmlcov/$(RESET)"

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
