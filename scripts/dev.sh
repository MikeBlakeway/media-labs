#!/bin/bash
#
# Media Labs Development Scripts
# 
# This script provides convenient shortcuts for common development tasks.
# It ensures Corepack and pnpm@10.15.0 are activated before running commands.
#
# Usage:
#   ./scripts/dev.sh install    - Install dependencies
#   ./scripts/dev.sh dev        - Start all development servers
#   ./scripts/dev.sh build      - Build all packages
#   ./scripts/dev.sh test       - Run tests
#   ./scripts/dev.sh lint       - Run linting
#   ./scripts/dev.sh setup      - Complete setup including env files
#   ./scripts/dev.sh clean      - Clean build artifacts
#   ./scripts/dev.sh smoke      - Run smoke tests (when implemented)
#   ./scripts/dev.sh help       - Show help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to setup Corepack and pnpm
setup_pnpm() {
    log_info "Setting up Corepack and pnpm@10.15.0..."
    
    if ! command -v corepack &> /dev/null; then
        log_error "Corepack not found. Please install Node.js 20+ which includes Corepack."
        exit 1
    fi
    
    corepack enable
    corepack prepare pnpm@10.15.0 --activate
    
    local pnpm_version=$(pnpm -v)
    log_success "pnpm version: $pnpm_version"
}

# Function to check if we're on macOS and show platform-specific notes
check_platform() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "Detected macOS - checking for platform-specific requirements..."
        
        if ! command -v node &> /dev/null; then
            log_warning "Node.js not found. Install with: brew install node"
        fi
        
        if ! command -v docker &> /dev/null; then
            log_warning "Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop"
        fi
        
        log_info "macOS Notes:"
        echo "  - For M1/M2 Macs, ensure Docker Desktop has Apple Silicon support enabled"
        echo "  - If you encounter native build issues, run: pnpm approve-builds"
    fi
}

# Function to install dependencies
install_deps() {
    setup_pnpm
    log_info "Installing dependencies..."
    pnpm install
    log_success "Dependencies installed"
}

# Function to setup environment
setup_env() {
    install_deps
    
    log_info "Setting up environment files..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        log_success "Created .env from .env.example"
    else
        log_info ".env already exists"
    fi
    
    if [ ! -f apps/api/.env ]; then
        cp apps/api/.env.example apps/api/.env
        log_success "Created apps/api/.env from example"
    else
        log_info "apps/api/.env already exists"
    fi
    
    log_info "Generating Prisma client..."
    if pnpm --filter ./apps/api run prisma:generate; then
        log_success "Prisma client generated"
    else
        log_warning "Prisma generate failed - check DATABASE_URL in apps/api/.env"
    fi
    
    log_success "Setup complete! Run './scripts/dev.sh dev' to start development servers"
}

# Function to start development servers
start_dev() {
    setup_pnpm
    log_info "Starting all development servers..."
    pnpm run dev
}

# Function to build all packages
build_all() {
    setup_pnpm
    log_info "Building all packages..."
    pnpm run build
}

# Function to run tests
run_tests() {
    setup_pnpm
    log_info "Running tests..."
    pnpm run test
}

# Function to run linting
run_lint() {
    setup_pnpm
    log_info "Running linting..."
    pnpm run lint
}

# Function to run smoke tests (placeholder)
run_smoke() {
    setup_pnpm
    log_info "Running smoke tests..."
    log_warning "Smoke tests not yet implemented"
    echo "📝 Future: Will test end-to-end submission → worker → artifact retrieval"
}

# Function to clean build artifacts
clean_all() {
    log_info "Cleaning build artifacts and node_modules..."
    rm -rf .turbo
    pnpm -w -r run clean || true
    find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
    find . -name "dist" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
    log_success "Cleanup complete"
}

# Function to show help
show_help() {
    echo "Media Labs Development Scripts"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  install    - Install dependencies with proper pnpm setup"
    echo "  dev        - Start all development servers"
    echo "  build      - Build all packages"
    echo "  test       - Run tests across workspace"
    echo "  lint       - Run linting across workspace"
    echo "  smoke      - Run smoke tests (when implemented)"
    echo "  setup      - Complete setup including env files and Prisma"
    echo "  clean      - Clean build artifacts and node_modules"
    echo "  help       - Show this help message"
    echo ""
    echo "Note: All commands automatically activate pnpm@10.15.0 via Corepack"
    echo ""
    echo "Examples:"
    echo "  $0 setup      # Complete initial setup"
    echo "  $0 dev        # Start development servers"
    echo "  $0 build      # Build for production"
}

# Main script logic
main() {
    case "${1:-help}" in
        install)
            check_platform
            install_deps
            ;;
        dev)
            check_platform
            start_dev
            ;;
        build)
            build_all
            ;;
        test)
            run_tests
            ;;
        lint)
            run_lint
            ;;
        smoke)
            run_smoke
            ;;
        setup)
            check_platform
            setup_env
            ;;
        clean)
            clean_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"