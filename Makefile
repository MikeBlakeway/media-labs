# Media Labs Development Makefile
# 
# This Makefile provides convenient shortcuts for common development tasks.
# It ensures Corepack and pnpm@10.15.0 are activated before running commands.
#
# Usage:
#   make install     - Install dependencies with proper pnpm setup
#   make dev         - Start all development servers
#   make dev-ui      - Start only UI development server
#   make dev-api     - Start only API development server
#   make dev-worker  - Start only worker development server
#   make build       - Build all packages
#   make test        - Run tests across workspace
#   make lint        - Run linting across workspace
#   make smoke       - Run smoke tests (when implemented)
#   make clean       - Clean build artifacts and node_modules
#   make setup       - Complete setup including env files and Prisma
#   make docker      - Start development services with Docker Compose
#   make help        - Show this help message

.PHONY: help install dev dev-ui dev-api dev-worker build test lint smoke clean setup docker corepack-setup

# Default target
help:
	@echo "Media Labs Development Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  install     - Install dependencies with proper pnpm setup"
	@echo "  dev         - Start all development servers"
	@echo "  dev-ui      - Start only UI development server"
	@echo "  dev-api     - Start only API development server"
	@echo "  dev-worker  - Start only worker development server"
	@echo "  build       - Build all packages"
	@echo "  test        - Run tests across workspace"
	@echo "  lint        - Run linting across workspace"
	@echo "  smoke       - Run smoke tests (when implemented)"
	@echo "  clean       - Clean build artifacts and node_modules"
	@echo "  setup       - Complete setup including env files and Prisma"
	@echo "  docker      - Start development services with Docker Compose"
	@echo "  help        - Show this help message"
	@echo ""
	@echo "Note: All commands automatically activate pnpm@10.15.0 via Corepack"
	@echo ""
	@echo "macOS Notes:"
	@echo "  - Ensure Node.js 20+ is installed (brew install node)"
	@echo "  - If you encounter native build issues, run: pnpm approve-builds"
	@echo "  - For M1/M2 Macs, ensure Docker Desktop has Apple Silicon support enabled"

# Setup Corepack and pnpm
corepack-setup:
	@echo "🔧 Setting up Corepack and pnpm@10.15.0..."
	corepack enable
	corepack prepare pnpm@10.15.0 --activate
	@echo "✅ pnpm version: $(shell pnpm -v)"

# Install dependencies
install: corepack-setup
	@echo "📦 Installing dependencies..."
	pnpm install
	@echo "✅ Dependencies installed"

# Complete setup including env files and Prisma generation
setup: install
	@echo "⚙️  Setting up environment files..."
	@if [ ! -f .env ]; then \
		cp .env.example .env && echo "📄 Created .env from .env.example"; \
	else \
		echo "📄 .env already exists"; \
	fi
	@if [ ! -f apps/api/.env ]; then \
		cp apps/api/.env.example apps/api/.env && echo "📄 Created apps/api/.env from example"; \
	else \
		echo "📄 apps/api/.env already exists"; \
	fi
	@echo "🔄 Generating Prisma client..."
	pnpm --filter ./apps/api run prisma:generate || echo "⚠️  Prisma generate failed - check DATABASE_URL in apps/api/.env"
	@echo "✅ Setup complete! Run 'make dev' to start development servers"

# Development commands
dev: corepack-setup
	@echo "🚀 Starting all development servers..."
	pnpm run dev

dev-ui: corepack-setup
	@echo "🚀 Starting UI development server..."
	pnpm --filter ./apps/ui run dev

dev-api: corepack-setup
	@echo "🚀 Starting API development server..."
	pnpm --filter ./apps/api run dev

dev-worker: corepack-setup
	@echo "🚀 Starting worker development server..."
	pnpm --filter ./apps/worker run dev

# Build commands
build: corepack-setup
	@echo "🔨 Building all packages..."
	pnpm run build

# Testing and quality commands
test: corepack-setup
	@echo "🧪 Running tests..."
	pnpm run test

lint: corepack-setup
	@echo "🔍 Running linting..."
	pnpm run lint

# Smoke test (placeholder for future implementation)
smoke: corepack-setup
	@echo "💨 Running smoke tests..."
	@echo "⚠️  Smoke tests not yet implemented"
	@echo "📝 Future: Will test end-to-end submission → worker → artifact retrieval"

# Cleanup commands
clean:
	@echo "🧹 Cleaning build artifacts and node_modules..."
	rm -rf .turbo
	pnpm -w -r run clean || true
	find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
	find . -name "dist" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Docker commands
docker:
	@echo "🐳 Starting development services with Docker Compose..."
	docker-compose up --build

# macOS specific help
macos-help:
	@echo "🍎 macOS Development Notes:"
	@echo ""
	@echo "Prerequisites:"
	@echo "  brew install node          # Install Node.js 20+"
	@echo "  brew install docker        # Install Docker Desktop"
	@echo ""
	@echo "Common Issues:"
	@echo "  - Native build errors: run 'pnpm approve-builds'"
	@echo "  - Port conflicts: check Activity Monitor for processes using ports 3000, 4000"
	@echo "  - Docker issues: ensure Docker Desktop is running and has Apple Silicon support"
	@echo "  - Permission errors: ensure your user has proper permissions for development"
	@echo ""
	@echo "Recommended VS Code Extensions:"
	@echo "  - Remote - Containers (for devcontainer support)"
	@echo "  - TypeScript"
	@echo "  - Prettier"
	@echo "  - ESLint"
	@echo "  - Prisma"