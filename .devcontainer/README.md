# Media Labs Devcontainer

This directory contains the devcontainer configuration for Media Labs, providing a reproducible development environment with all necessary tools and services.

## What's Included

### Development Container

- **Base Image**: Node.js 20 (slim)
- **Package Manager**: pnpm@10.15.0 (automatically activated via Corepack)
- **Tools**: Git, curl, wget, build-essential, Python 3
- **User**: node (uid: 1000, gid: 1000)

### VS Code Configuration

- **Extensions**: TypeScript, Prettier, ESLint, Prisma, Tailwind CSS, Docker
- **Settings**: Auto-format on save, ESLint auto-fix, pnpm as default package manager
- **Port Forwarding**: 3000 (UI), 4000 (API), 8188 (ComfyUI), 8190 (Fake GPU)

### Optional Services (via docker-compose)

- **Redis** (localhost:6379): Caching and session storage
- **MinIO** (localhost:9000, console: 9001): S3-compatible local storage
- **PostgreSQL** (localhost:5432): Alternative to SQLite for development

## Quick Start

### Option 1: VS Code with Remote-Containers

1. Install VS Code with the "Remote - Containers" extension
2. Open the repository in VS Code
3. Click "Reopen in Container" when prompted
4. Wait for the container to build (first time takes ~5-10 minutes)
5. Run `make setup` in the terminal to complete setup
6. Run `make dev` to start all services

### Option 2: GitHub Codespaces

1. Go to the repository on GitHub
2. Click "Code" → "Codespaces" → "New codespace"
3. Wait for the container to build
4. Run `make setup` in the terminal
5. Run `make dev` to start development

### Option 3: Manual Docker Build

```bash
# Build the devcontainer
cd .devcontainer
docker build -t media-labs-dev .

# Run with services
docker-compose up -d

# Enter the container
docker exec -it media-labs-dev_app_1 bash
```

## Post-Setup Commands

After the devcontainer is running:

```bash
# Complete setup (env files, Prisma generation)
make setup

# Start all development services
make dev

# Or use individual services
make dev-ui      # Next.js UI only
make dev-api     # Express API only
make dev-worker  # Worker process only

# Build for production
make build

# Run tests and linting
make test
make lint
```

## Services and Ports

| Service       | Port | Description          | Access                        |
| ------------- | ---- | -------------------- | ----------------------------- |
| UI (Next.js)  | 3000 | Frontend application | <http://localhost:3000>       |
| API (Express) | 4000 | Backend API          | <http://localhost:4000>       |
| ComfyUI       | 8188 | Video processing     | <http://localhost:8188>       |
| Fake GPU      | 8190 | GPU simulation       | <http://localhost:8190>       |
| Redis         | 6379 | Cache/Sessions       | <redis://localhost:6379>      |
| MinIO         | 9000 | Storage API          | <http://localhost:9000>       |
| MinIO Console | 9001 | Storage UI           | <http://localhost:9001>       |
| PostgreSQL    | 5432 | Database             | <postgresql://localhost:5432> |

## Environment Variables

The devcontainer automatically copies example environment files:

- `.env` (root level configuration)
- `apps/api/.env` (API-specific configuration)

### MinIO Credentials (for local development)

- **Access Key**: minioadmin
- **Secret Key**: minioadmin123

### PostgreSQL Credentials

- **Database**: media_labs_dev
- **Username**: postgres
- **Password**: postgres

## Troubleshooting

### Container Won't Start

- Ensure Docker Desktop is running
- Check available disk space (devcontainer needs ~2GB)
- Try rebuilding: "Remote-Containers: Rebuild Container"

### Port Conflicts

- Check if ports 3000, 4000, 6379, 9000, 9001, 5432 are available
- Stop conflicting services or change ports in docker-compose.yml

### Performance Issues

- **macOS**: Ensure Docker Desktop has adequate resources allocated
- **Windows**: Use WSL2 backend for better performance
- **Linux**: Native Docker should perform well

### Native Dependencies

If you encounter issues with native modules (sharp, prisma engines):

```bash
pnpm approve-builds
pnpm install
```

### Prisma Issues

If Prisma client generation fails:

```bash
# Check DATABASE_URL in apps/api/.env
cat apps/api/.env

# Regenerate client
pnpm --filter ./apps/api run prisma:generate

# Reset database (development only)
pnpm --filter ./apps/api run db:reset
```

## VS Code Extensions

The devcontainer automatically installs these extensions:

- **TypeScript**: Language support for TypeScript
- **Prettier**: Code formatting
- **ESLint**: Linting and code quality
- **Prisma**: Database schema support
- **Tailwind CSS**: CSS framework support
- **Docker**: Container management

## Customization

### Adding Services

Edit `.devcontainer/docker-compose.yml` to add new services:

```yaml
services:
  app:
    # ... existing config

  your-service:
    image: your/image
    ports:
      - '8080:8080'
    environment:
      - YOUR_ENV=value
```

### VS Code Settings

Edit `.devcontainer/devcontainer.json` under `customizations.vscode.settings`:

```json
{
  "customizations": {
    "vscode": {
      "settings": {
        "your.setting": "value"
      }
    }
  }
}
```

### Additional Tools

Add to `.devcontainer/Dockerfile`:

```dockerfile
RUN apt-get update && apt-get install -y your-tool
```

## Performance Tips

1. **Use volume mounts**: node_modules is mounted as a volume for better performance
2. **Limit running services**: Only start services you need for development
3. **Resource allocation**: Ensure Docker has adequate CPU and memory
4. **Cache builds**: Devcontainer images are cached for faster subsequent builds

## Security Notes

- The devcontainer runs as the 'node' user (non-root)
- Development credentials are for local use only
- Don't commit real secrets to environment files
- Use .env.local for sensitive local overrides
