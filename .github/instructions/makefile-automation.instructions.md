---
applyTo: 'Makefile,scripts/**,package.json'
description: 'Build automation and development workflow guidance'
---

# Makefile Automation Instructions

## Development Workflow Standards

Maintain consistency in build automation and development processes using the established Makefile patterns.

### Essential Makefile Targets

#### Setup and Installation Targets

```makefile
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
```

#### Development Targets

```makefile
.PHONY: dev
dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(RESET)"
	npm run dev

.PHONY: build
build: ## Build the application
	@echo "$(BLUE)Building application...$(RESET)"
	npm run build
	@echo "$(GREEN)✅ Build complete$(RESET)"
```

### Required Environment Management

#### Environment Setup Pattern

```makefile
.PHONY: env-setup
env-setup: ## Initialize environment from template
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from template...$(RESET)"; \
		cp .env.example .env; \
		echo "$(GREEN)✅ Environment file created$(RESET)"; \
		echo "$(YELLOW)⚠️  Please edit .env with your RunPod credentials$(RESET)"; \
	else \
		echo "$(BLUE).env file already exists$(RESET)"; \
	fi
```

#### Environment Validation Pattern

```makefile
REQUIRED_ENV_VARS := RUNPOD_API_KEY RUNPOD_ENDPOINT_ID

.PHONY: env-check
env-check: ## Verify required environment variables
	@echo "$(BLUE)Checking environment variables...$(RESET)"
	@$(foreach var,$(REQUIRED_ENV_VARS), \
		if [ -z "$${$(var)}" ]; then \
			echo "$(RED)❌ Missing required environment variable: $(var)$(RESET)"; \
			echo "$(YELLOW)Please set $(var) in your .env file$(RESET)"; \
			exit 1; \
		fi;)
	@echo "$(GREEN)✅ All required environment variables are set$(RESET)"
```

### Code Quality Targets

#### Linting and Formatting

```makefile
.PHONY: lint
lint: ## Run ESLint
	@echo "$(BLUE)Running ESLint...$(RESET)"
	npm run lint
	@echo "$(GREEN)✅ Linting complete$(RESET)"

.PHONY: format
format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(RESET)"
	npm run format
	@echo "$(GREEN)✅ Code formatted$(RESET)"

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript checks...$(RESET)"
	npx tsc --noEmit
	@echo "$(GREEN)✅ Type checking complete$(RESET)"
```

#### Testing Targets

```makefile
.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(RESET)"
	npm test
	@echo "$(GREEN)✅ Tests complete$(RESET)"

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Starting test watcher...$(RESET)"
	npm run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	npm run test:coverage
	@echo "$(GREEN)✅ Coverage report generated$(RESET)"
```

### Docker Integration Patterns

#### Worker Build Targets

```makefile
.PHONY: build-worker
build-worker: ## Build worker Docker image
	@echo "$(BLUE)Building worker image...$(RESET)"
	docker build --platform linux/amd64 -t runpod/worker-comfyui:latest ./volume-worker
	@echo "$(GREEN)✅ Worker image built$(RESET)"

.PHONY: dev-worker
dev-worker: ## Run worker in development mode
	@echo "$(BLUE)Starting development worker...$(RESET)"
	cd volume-worker && docker run --rm -p 8000:8000 \
		-e MODEL_TYPE=base \
		runpod/worker-comfyui:dev

.PHONY: push-worker
push-worker: build-worker ## Push worker image to registry
	@echo "$(BLUE)Pushing worker image...$(RESET)"
	docker push runpod/worker-comfyui:latest
	@echo "$(GREEN)✅ Worker image pushed$(RESET)"
```

### Validation and Health Check Targets

#### Workflow Validation

```makefile
.PHONY: validate-workflows
validate-workflows: ## Validate workflow templates
	@echo "$(BLUE)Validating workflow templates...$(RESET)"
	npx ts-node scripts/validate-workflows.ts
	@echo "$(GREEN)✅ Workflow validation complete$(RESET)"

.PHONY: health-check
health-check: ## Check system health
	@echo "$(BLUE)Running health checks...$(RESET)"
	@$(MAKE) env-check
	@$(MAKE) type-check
	@$(MAKE) lint
	@echo "$(GREEN)✅ All health checks passed$(RESET)"
```

### Deployment Targets

#### Production Preparation

```makefile
.PHONY: deploy-prep
deploy-prep: ## Prepare for deployment
	@echo "$(BLUE)Preparing for deployment...$(RESET)"
	@$(MAKE) health-check
	@$(MAKE) test
	@$(MAKE) build
	@echo "$(GREEN)✅ Deployment preparation complete$(RESET)"

.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf coverage
	@echo "$(GREEN)✅ Clean complete$(RESET)"
```

### Utility Targets

#### Development Utilities

```makefile
.PHONY: logs
logs: ## View application logs
	@echo "$(BLUE)Viewing logs...$(RESET)"
	docker logs -f media-labs-dev 2>/dev/null || echo "No running containers found"

.PHONY: shell
shell: ## Open shell in development container
	@echo "$(BLUE)Opening shell...$(RESET)"
	docker exec -it media-labs-dev /bin/bash 2>/dev/null || echo "No running containers found"

.PHONY: deps-update
deps-update: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	npm update
	npm audit fix
	@echo "$(GREEN)✅ Dependencies updated$(RESET)"
```

### Color Output Standards

#### Color Definitions

```makefile
# Colors for output
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m
```

#### Usage Patterns

- **GREEN**: Success messages and completion confirmations
- **BLUE**: Process start messages and informational content
- **YELLOW**: Warnings and advisory messages
- **RED**: Error messages and failure notifications

### Help Target Requirements

#### Self-Documenting Makefile

```makefile
.PHONY: help
help: ## Display this help message
	@echo "$(BLUE)Media Labs Web Application$(RESET)"
	@echo "$(YELLOW)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help
```

### Package.json Script Integration

#### Required npm Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --watchAll=false"
  }
}
```

#### Script Naming Conventions

- Use kebab-case for script names
- Group related scripts with colons: `test:watch`, `test:coverage`
- Include both short and descriptive versions where helpful

### Error Handling in Makefiles

#### Robust Target Implementation

```makefile
.PHONY: robust-target
robust-target: ## Example of robust target with error handling
	@echo "$(BLUE)Starting process...$(RESET)"
	@if command -v npm >/dev/null 2>&1; then \
		npm run build; \
	else \
		echo "$(RED)❌ npm not found$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Process complete$(RESET)"
```

### Performance Optimization

#### Parallel Execution Where Safe

```makefile
.PHONY: parallel-checks
parallel-checks: ## Run independent checks in parallel
	@echo "$(BLUE)Running parallel checks...$(RESET)"
	@$(MAKE) -j2 lint type-check
	@echo "$(GREEN)✅ All checks complete$(RESET)"
```

### Development Server Management

#### Next.js Development Configuration

```makefile
.PHONY: dev-turbo
dev-turbo: ## Start development server with Turbopack
	@echo "$(BLUE)Starting Next.js with Turbopack...$(RESET)"
	npm run dev -- --turbopack

.PHONY: dev-debug
dev-debug: ## Start development server in debug mode
	@echo "$(BLUE)Starting development server in debug mode...$(RESET)"
	NODE_OPTIONS='--inspect' npm run dev
```

### Integration with CI/CD

#### CI-Friendly Targets

```makefile
.PHONY: ci
ci: ## Run CI pipeline locally
	@echo "$(BLUE)Running CI pipeline...$(RESET)"
	@$(MAKE) env-check
	@$(MAKE) install
	@$(MAKE) lint
	@$(MAKE) type-check
	@$(MAKE) test-coverage
	@$(MAKE) build
	@echo "$(GREEN)✅ CI pipeline complete$(RESET)"
```

### Documentation Generation

#### Auto-Generated Documentation

```makefile
.PHONY: docs-generate
docs-generate: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	npx typedoc src --out docs/api
	@echo "$(GREEN)✅ Documentation generated$(RESET)"
```

Refer to [Makefile documentation](https://www.gnu.org/software/make/manual/) for advanced patterns and [project README](../../README.md) for complete setup instructions.
