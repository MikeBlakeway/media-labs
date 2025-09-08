# Media Labs - AI-Powered Media Generation

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![RunPod](https://img.shields.io/badge/RunPod-ComfyUI-green)](https://runpod.io/)

A modern Next.js web application for AI-powered image generation using RunPod's ComfyUI serverless endpoints.

## ✨ Features

- **🎨 AI Image Generation**: Generate high-quality images using Flux and other AI models
- **📊 Real-time Progress Tracking**: Live progress indicators during workflow execution
- **📚 Result History**: View and manage previous workflow results with thumbnails
- **⚡ Async/Sync Support**: Handles both synchronous and asynchronous RunPod endpoints
- **🔄 Auto Model Management**: Preflight checks ensure required models are available
- **💾 S3 Integration**: Seamless file upload to RunPod volumes
- **🎯 TypeScript**: Full type safety with Zod schema validation
- **📱 Responsive UI**: Modern, clean interface built with TailwindCSS

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
# RunPod Configuration
RUNPOD_API_KEY=your_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id

# Optional: For using local development worker (if needed)
USE_LOCAL_WORKER=false
LOCAL_WORKER_URL=http://localhost:8000
```

## 📁 Project Structure

```bash
media-labs/
├── src/              # Next.js application source
│   ├── app/          # App Router (pages and API routes)
│   ├── components/   # React components
│   └── lib/          # Utilities and libraries
├── public/           # Static assets
├── data/             # Workflow templates
├── docs/             # Documentation
├── Makefile          # Development automation
├── package.json      # Dependencies and scripts
├── next.config.ts    # Next.js configuration
├── tsconfig.json     # TypeScript configuration
└── AGENTS.md         # AI agent guidance
```

## 🏗️ Architecture

### Next.js Web Application

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5.x with strict mode
- **UI**: React 19.1.0 + Tailwind CSS 4.x
- **Backend**: RunPod ComfyUI serverless endpoints
- **API**: Next.js API routes acting as middleware to RunPod endpoints

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

```bash
make build           # Build web application
# Deploy to your preferred hosting platform (Vercel, Netlify, etc.)
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
- Use `make env-check` for environment diagnostics
- Review workflow templates in `data/workflows/` for examples
