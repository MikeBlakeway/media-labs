# Use Node 20 as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    build-essential \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Enable Corepack and prepare pnpm
RUN corepack enable
RUN corepack prepare pnpm@10.15.0 --activate

# Verify installations
RUN node --version && pnpm --version

# Create user and set permissions (node user already exists in base image)
# Just ensure proper ownership
RUN mkdir -p /home/node/.local/share/pnpm && chown -R node:node /home/node/.local

# Switch to node user
USER node

# Set up the environment
ENV PATH="/home/node/.local/bin:$PATH"

# Add pnpm to PATH and set environment for node user
ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Expose common development ports
EXPOSE 3000 4000 8188 8190

# Default command
CMD ["/bin/bash"]