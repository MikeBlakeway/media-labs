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
