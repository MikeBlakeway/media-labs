# Project Restructuring: From Disjointed to Developer's Dream

## 🚨 Current Problems

### Structural Issues

- **Duplicate `.github/` folders** - Root and `worker/` both have CI/CD configs
- **Scattered package.json files** - Root (Next.js) vs Worker (Python) dependencies
- **Mixed concerns** - Worker files mixed with Next.js app at root level
- **Inconsistent tooling** - Different linting, formatting, and CI/CD approaches
- **Documentation chaos** - `docs/` at root + `docs/` in worker subdirectory
- **Multiple `.gitignore` files** - Root and worker each maintaining their own

### Developer Experience Problems

- **Complex setup** - Multiple install commands, unclear startup process
- **Unclear separation** - Hard to know what belongs to web vs worker
- **Tooling conflicts** - Different ESLint configs, different formatting rules
- **Deployment confusion** - Multiple CI/CD systems, unclear build processes

## 🎯 Proposed Monorepo Structure

```bash
media-labs/
├── README.md                           # Main project overview & quick start
├── AGENTS.md                           # AI agent guidance & repo structure
├── Makefile                            # Comprehensive automation commands
├── package.json                        # Workspace root with shared scripts
├── .env.example                        # Environment template for all packages
├── .github/                            # Centralized CI/CD workflows
│   ├── workflows/
│   │   ├── web-ci.yml                 # Next.js app CI/CD
│   │   ├── worker-ci.yml              # Worker image CI/CD
│   │   └── release.yml                # Coordinated releases
├── .vscode/                            # Shared IDE settings
│   ├── settings.json                  # Consistent formatting, linting
│   ├── extensions.json                # Recommended extensions
│   └── launch.json                    # Debug configs for all packages
├── docs/                               # Centralized documentation
│   ├── README.md                      # Documentation index
│   ├── getting-started.md             # New developer onboarding
│   ├── architecture/                  # Architecture docs
│   ├── web/                          # Web app specific docs
│   └── worker/                       # Worker specific docs
├── scripts/                            # Shared development scripts
│   ├── setup.sh                      # One-command project setup
│   ├── dev.sh                        # Start all development services
│   ├── build.sh                      # Build all packages
│   └── deploy.sh                     # Deployment automation
├── packages/                           # Workspace packages
│   ├── web/                           # Next.js application
│   │   ├── package.json              # Web-specific dependencies
│   │   ├── next.config.ts
│   │   ├── tailwind.config.js
│   │   ├── src/
│   │   ├── public/
│   │   └── .env.example
│   └── worker/                        # ComfyUI worker
│       ├── package.json              # Worker tooling (if needed)
│       ├── Dockerfile
│       ├── requirements.txt          # Python dependencies
│       ├── docker-compose.yml        # Local development
│       ├── src/
│       ├── scripts/
│       └── tests/
├── tools/                             # Shared tooling configurations
│   ├── eslint.config.js              # Shared ESLint config
│   ├── prettier.config.js            # Shared Prettier config
│   ├── tsconfig.base.json            # Base TypeScript config
│   └── tailwind.base.js              # Shared Tailwind config
├── data/                              # Shared data & configurations
│   ├── workflows/                    # ComfyUI workflow templates
│   └── models/                       # Model configurations
```

## 🚀 Developer Experience Improvements

### Comprehensive Makefile Automation

A professional-grade Makefile provides single-command operations for all common tasks:

**Setup and Development Commands:**

```bash
make setup                 # Complete project setup
make dev                   # Start all development services
make dev-web              # Web application only
make dev-worker           # Worker service only
```

**Build and Deployment Commands:**

```bash
make build                # Build all packages
make build-web            # Build web application
make build-worker         # Build worker image
make push                 # Build and push worker to registry
make deploy               # Full deployment pipeline
```

**Code Quality Commands:**

```bash
make lint                 # Lint all code
make lint-web             # Lint web package only
make lint-worker          # Lint worker package only
make format               # Format all code
make test                 # Run all tests
make test-web             # Test web package only
make test-worker          # Test worker package only
```

**Environment and Maintenance:**

```bash
make env-check            # Verify environment variables
make env-setup            # Initialize from template
make clean                # Clean build artifacts
make update               # Update dependencies
make health-check         # Check service health
```

The Makefile includes intelligent environment variable loading, colored output for better UX, comprehensive help system, and error handling for robust automation.

#### AGENTS.md - AI Agent Documentation

A comprehensive guide specifically designed for AI agents and automated tools working with the codebase:

**Project Architecture Documentation:**

- Complete repository structure overview
- Technology stack with exact versions
- Development workflow patterns
- Environment variable specifications

**AI-Friendly Development Patterns:**

- Code templates and common patterns
- Error handling conventions
- API route structure guidelines
- Testing strategy documentation

**Essential Commands and Workflows:**

- Makefile command reference
- Development setup procedures
- Deployment processes
- Troubleshooting guides

**Contribution Guidelines:**

- Code style and formatting rules
- Commit message conventions
- Pull request processes
- Security considerations

This documentation ensures AI agents can effectively understand the project structure, follow established patterns, and contribute meaningfully to the codebase without requiring human guidance for basic operations.

### AI Agent Guidance (AGENTS.md)

Comprehensive documentation for AI tools to understand and contribute to the project:

- **Project structure and conventions**
- **Development workflows and commands**
- **Architecture patterns and design decisions**
- **Testing strategies and requirements**
- **Deployment and infrastructure setup**
- **Common tasks and troubleshooting guides**

### One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/mikeblakeway/media-labs.git
cd media-labs
make setup  # Installs all deps, sets up env, builds worker
```

### Unified Development Workflow

```bash
# Start everything in development mode
make dev
# ✅ Next.js app on http://localhost:3000
# ✅ Worker development environment with hot reload
# ✅ All services connected and configured
# ✅ Environment variables automatically loaded

# Build everything for production
make build
# ✅ Optimized Next.js build
# ✅ Worker Docker image built and tagged
# ✅ All packages validated and tested
# ✅ Automatic registry tagging

# Run tests across all packages
make test
# ✅ Web app unit tests
# ✅ Worker integration tests
# ✅ End-to-end tests
# ✅ Coverage reports generated

# Deploy to production
make deploy
# ✅ Build and push worker image
# ✅ Deploy web app
# ✅ Update RunPod templates
# ✅ Verify deployment health
```

## ✅ End-to-end tests

### Consistent Tooling

- **Single ESLint config** - Shared rules across web and worker JS/TS
- **Unified Prettier** - Consistent formatting for all code
- **Shared TypeScript config** - Base config extended by packages
- **Coordinated CI/CD** - One pipeline managing both web and worker

### Clear Package Boundaries

```bash
# Work on web app only
make dev-web

# Work on worker only
make dev-worker

# Install dependencies
make install-web PKG=react-query
make install-worker PKG=boto3

# Build specific package
make build-web
make build-worker

# Test specific package
make test-web
make test-worker

# Environment-specific operations
make env-check-web      # Verify web env variables
make env-check-worker   # Verify worker env variables
```

## 📋 Migration Plan

### Phase 1: Structure Setup (Day 1)

```bash
# 1. Create new branch for restructure
git checkout -b restructure/monorepo

# 2. Create new directory structure
mkdir -p packages/{web,worker}
mkdir -p tools docs/architecture scripts

# 3. Setup workspace package.json
```

### Phase 2: Move Web App (Day 1)

```bash
# Move Next.js app to packages/web/
mv src packages/web/
mv public packages/web/
mv next.config.ts packages/web/
mv tailwind.config.js packages/web/
# Update package.json for workspace
```

### Phase 3: Move Worker (Day 1)

```bash
# Move worker to packages/worker/
mv worker/* packages/worker/
# Remove old worker directory
# Update Docker build contexts
```

### Phase 4: Centralize Tooling (Day 1)

```bash
# Move shared configs to tools/
mv eslint.config.mjs tools/eslint.config.js
mv .prettierrc tools/prettier.config.js
# Create shared tsconfig.base.json
```

### Phase 5: Update References (Day 2)

- Update import paths in web app
- Update Docker build contexts
- Update CI/CD workflow paths
- Update documentation links

### Phase 6: Consolidate Documentation (Day 2)

```bash
# Merge documentation
mv docs docs-old
mkdir docs
# Combine and reorganize all docs
```

### Phase 7: Create Development Scripts (Day 2)

- `scripts/setup.sh` - One-command project setup
- `scripts/dev.sh` - Start all development services
- Update npm scripts in root package.json

## 🛠 New Root package.json

```json
{
  "name": "media-labs",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "setup": "./scripts/setup.sh",
    "dev": "./scripts/dev.sh",
    "build": "./scripts/build.sh",
    "test": "npm run test --workspaces",
    "lint": "eslint packages/*/src",
    "format": "prettier --write packages/*/src",
    "web:dev": "npm run dev -w packages/web",
    "web:build": "npm run build -w packages/web",
    "worker:dev": "npm run dev -w packages/worker",
    "worker:build": "./scripts/worker-build.sh",
    "deploy": "./scripts/deploy.sh"
  },
  "devDependencies": {
    "eslint": "^9",
    "prettier": "^3",
    "typescript": "^5",
    "concurrently": "^8"
  }
}
```

## 🎁 Benefits After Restructure

### For New Developers

- **Single command setup** - `npm run setup` and you're ready
- **Clear documentation** - Everything in `docs/` with obvious structure
- **Obvious entry points** - `packages/web/` vs `packages/worker/`
- **Consistent tooling** - Same ESLint/Prettier everywhere

### For Existing Developers

- **Faster development** - No more switching between different tool configs
- **Cleaner builds** - One command builds everything
- **Better testing** - Integrated test runner across packages
- **Easier deployment** - Coordinated CI/CD pipeline

### For Future Growth

- **Easy to add packages** - CLI tools, mobile app, documentation site
- **Scalable architecture** - Clear separation of concerns
- **Reusable configs** - Shared tooling across all packages
- **Professional structure** - Industry-standard monorepo practices

## 🚀 Ready to Restructure?

This migration will transform your project from a disjointed collection of files into a professional, developer-friendly monorepo.

**Estimated time**: 2 days
**Risk level**: Low (we'll do it in a branch)
**Reward**: Massive improvement in developer experience

Would you like me to start implementing this restructure? We can do it step-by-step in a new branch so nothing breaks.
