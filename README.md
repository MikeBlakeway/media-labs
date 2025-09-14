# Media Labs - AI-Powered Media Generation

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![RunPod](https://img.shields.io/badge/RunPod-ComfyUI-green)](https://runpod.io/)

A modern Next.js web application for AI-powered image generation using RunPod's ComfyUI serverless endpoints.

## ✨ Features

- **🎨 AI Image Generation**: Generate high-quality images using Flux and other AI models
- **🏗️ Hooks-Based Architecture**: Clean, modular code with comprehensive custom hooks
- **📊 Real-time Progress Tracking**: Live progress indicators during workflow execution
- **📚 Result History**: View and manage previous workflow results with thumbnails
- **⚡ Async/Sync Support**: Handles both synchronous and asynchronous RunPod endpoints
- **🔄 Auto Model Management**: Preflight checks ensure required models are available
- **💾 S3 Integration**: Seamless file upload to RunPod volumes
- **🎯 TypeScript**: Full type safety with Zod schema validation
- **📱 Responsive UI**: Modern, clean interface built with TailwindCSS
- **🔧 Component Composition**: Modular UI components with clear separation of concerns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- RunPod account with API access
- RunPod ComfyUI serverless endpoint

### One-Command Setup

```bash
make setup
```

This will:

- Install all dependencies for the web application
- Set up environment variables from template
- Verify required configurations

### Development

```bash
# Start the web application
make dev

# Or use npm directly
npm run dev
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required: RunPod Configuration
RUNPOD_API_KEY=your_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id

# Optional: Local development worker
USE_LOCAL_WORKER=false
LOCAL_WORKER_URL=http://localhost:8000

# Optional: RunPod S3 Volume (for custom models)
RUNPOD_S3_ENDPOINT=your_volume_endpoint
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key
# ... additional S3 and B2 variables in .env.example
```

For production deployment, see **[Deployment Guide](./docs/deployment.md)** for complete environment variable setup.

## 📁 Project Structure

```bash
media-labs/
├── src/                         # Next.js application source
│   ├── app/                     # App Router (pages and API routes)
│   │   ├── api/                 # API routes for RunPod integration
│   │   ├── w/[slug]/            # Dynamic workflow pages
│   │   ├── manage/              # Workflow management pages
│   │   └── register/            # Workflow registration
│   ├── components/              # UI components (23 components)
│   │   ├── FormFields.tsx       # Form input components
│   │   ├── WorkflowRunner.tsx   # Main workflow execution
│   │   ├── ProgressIndicator.tsx # Progress tracking UI
│   │   └── ...                  # Other specialized components
│   ├── hooks/                   # Custom hooks (22 hooks)
│   │   ├── useWorkflowTemplate.ts  # Template loading
│   │   ├── useJobManagement.ts     # Job execution & polling
│   │   ├── useFileUpload.ts        # File upload handling
│   │   └── ...                     # Other business logic hooks
│   └── lib/                     # Utilities and libraries
│       ├── workflow.*.ts        # Workflow processing
│       ├── runpod*.ts          # RunPod integration
│       └── templates.*.ts      # Template management
├── public/                      # Static assets
├── data/                        # Workflow templates
├── docs/                        # RunPod documentation
├── .github/                     # GitHub configuration & prompts
├── Makefile                     # Development automation
├── package.json                 # Dependencies and scripts
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── AGENTS.md                   # AI agent guidance
```

## 🏗️ Architecture

### Hooks-Based Architecture

The application follows a comprehensive **hooks-based architecture** where:

- **21 Custom Hooks**: All business logic extracted into focused, reusable hooks
- **22 UI Components**: Pure presentation components that consume hooks
- **Complete Separation**: Clear boundaries between logic (hooks) and presentation (components)

#### Key Hook Categories

- **Workflow Management**: `useWorkflowTemplate`, `useWorkflowsList`, `useWorkflowRegistration`
- **Job Execution**: `useJobManagement`, `useEnhancedPolling`, `useWorkflowRunnerJob`
- **Form & UI**: `useWorkflowForm`, `useFileUpload`, `useFieldLabeling`
- **Specialized**: `useManualPreflight`, `useResultHistory`, `useProgressCalculation`

### Next.js Web Application

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5.x with strict mode
- **UI**: React 19.1.0 + Tailwind CSS 4.x
- **Backend**: RunPod ComfyUI serverless endpoints
- **API**: Next.js API routes acting as middleware to RunPod endpoints
- **Validation**: Zod schema validation throughout

## 🛠️ Development Commands

```bash
# Setup and Environment
make setup           # Complete project setup
make env-check       # Verify environment variables

# Development
make dev             # Start web application

# Building
make build           # Build web application

# Code Quality
make lint            # Lint code
make format          # Format code
make test            # Run tests

# Testing (Node.js)
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## 📚 Documentation

- [**AGENTS.md**](./AGENTS.md) - AI agent development guide
- [**docs/**](./docs/) - Project documentation

## 🔧 Workflow System

Media Labs uses a template-based workflow system:

1. **Templates**: JSON workflow definitions in `data/workflows/`
2. **Parameter Patching**: Runtime modification of workflow parameters
3. **Validation**: Zod schemas for type-safe operations
4. **Execution**: Direct integration with RunPod ComfyUI serverless endpoints

## 🚢 Deployment

### Local Development

```bash
make dev  # Starts web application locally
```

### Production Deployment

This project is deployed on **Vercel** with automatic Git integration and manual deploy hooks for advanced workflows.

**Quick Start:**

- Production: <https://media-labs-5idte9dqg-media-labs.vercel.app>
- Auto-deploys from `main` branch (production) and `development` branch (preview)

**Complete Documentation:**

- 📖 **[Deployment Guide](./docs/deployment.md)** - Comprehensive Vercel setup and configuration
- 🔗 **[Deploy Hooks Reference](./docs/vercel-deploy-hooks.md)** - Manual deployment triggers and examples

**Manual Build & Deploy:**

```bash
make build           # Build web application
npx vercel --prod    # Deploy to production
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

- Check documentation in `docs/` folder
- Review **[Deployment Guide](./docs/deployment.md)** for Vercel setup and troubleshooting
- Use `make env-check` for environment diagnostics
- Review workflow templates in `data/workflows/` for examples
