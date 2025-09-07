# Media Labs - AI-Powered Media Generation

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![ComfyUI](https://img.shields.io/badge/ComfyUI-Worker-green)](https://github.com/comfyanonymous/ComfyUI)

A modern monorepo combining a Next.js web application with a ComfyUI worker for AI-powered image generation workflows.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- Docker & Docker Compose
- RunPod account with S3 volume configured

### One-Command Setup

```bash
make setup
```

This will:

- Install all dependencies for both web and worker packages
- Set up environment variables from template
- Verify required configurations

### Development

```bash
# Start all services
make dev

# Or start individually
make dev-web     # Next.js app only
make dev-worker  # ComfyUI worker only
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# RunPod Configuration
RUNPOD_API_KEY=your_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key
RUNPOD_S3_ENDPOINT=https://volume_id.vol.runpod.net
RUNPOD_S3_REGION=us-east-1

# Development
USE_LOCAL_WORKER=true
LOCAL_WORKER_URL=http://localhost:8000
```

## 📁 Project Structure

```bash
media-labs/
├── packages/
│   ├── web/          # Next.js application
│   └── worker/       # ComfyUI worker
├── tools/            # Shared configurations
├── docs/             # Documentation
├── data/             # Workflow templates
├── scripts/          # Automation scripts
├── Makefile          # Development automation
└── AGENTS.md         # AI agent guidance
```

## 🏗️ Architecture

### Web Application (`packages/web/`)

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5.x with strict mode
- **UI**: React 19.1.0 + Tailwind CSS 4.x
- **API**: Next.js API routes acting as middleware to RunPod worker

### Worker (`packages/worker/`)

- **Base**: ComfyUI serverless worker on RunPod platform
- **Runtime**: Python 3.12 with RunPod serverless framework
- **Storage**: S3-compatible volume for models, Backblaze B2 for outputs
- **Deployment**: Docker images built locally and pushed to GHCR

## 🛠️ Development Commands

```bash
# Setup and Environment
make setup           # Complete project setup
make env-check       # Verify environment variables
make env-setup       # Initialize from template

# Development
make dev             # Start all services
make dev-web         # Web application only
make dev-worker      # Worker service only

# Building
make build           # Build all packages
make build-web       # Build web application
make build-worker    # Build worker image

# Code Quality
make lint            # Lint all code
make format          # Format all code
make test            # Run all tests

# Deployment
make push            # Build and push worker to registry
make deploy          # Full deployment pipeline
```

## 📚 Documentation

- [**AGENTS.md**](./AGENTS.md) - AI agent development guide
- [**docs/**](./docs/) - Comprehensive project documentation
- [**Getting Started**](./docs/getting-started.md) - New developer onboarding
- [**Architecture**](./docs/architecture/) - Technical architecture details

## 🔧 Workflow System

Media Labs uses a template-based workflow system:

1. **Templates**: JSON workflow definitions in `data/workflows/`
2. **Parameter Patching**: Runtime modification of workflow parameters
3. **Validation**: Zod schemas for type-safe operations
4. **Execution**: Seamless integration between web UI and ComfyUI worker

## 🚢 Deployment

### Local Development

```bash
make dev  # Starts web app and worker locally
```

### Production Deployment

```bash
make build  # Build all packages
make push   # Push worker image to registry
make deploy # Deploy web app to hosting platform
```

## 🤝 Contributing

1. Clone the repository
2. Run `make setup` for complete project setup
3. Make changes following our established patterns
4. Run `make lint && make test` before committing
5. Submit pull request with clear description

See [AGENTS.md](./AGENTS.md) for detailed development patterns and AI agent guidance.

## 📄 License

This project is private and proprietary.

## 🆘 Support

- Check [troubleshooting docs](./docs/troubleshooting.md)
- Review [integration test results](./docs/integration-test-results.md)
- Use `make health-check` for service diagnostics
