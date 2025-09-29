#!/usr/bin/env bash
set -euo pipefail

# Configuration
IMAGE_NAME="ml-volume-worker"
REGISTRY="ghcr.io"
REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-$(echo "${GITHUB_REPOSITORY}" | cut -d'/' -f1)}"
REPO_NAME="${GITHUB_REPOSITORY##*/}"

# Generate tag based on context
BASE_VERSION="1.0.1"
if [[ "${GITHUB_REF:-}" == "refs/heads/main" ]]; then
    # Main branch gets alpha tag
    TAG="v${BASE_VERSION}-alpha"
elif [[ "${GITHUB_REF:-}" == "refs/heads/development" ]]; then
    # Development branch gets beta tag
    TAG="v${BASE_VERSION}-beta"
else
    # Manual trigger or other branches get development tag
    TAG="v${BASE_VERSION}-dev"
fi

# Full image references
LOCAL_IMAGE="${IMAGE_NAME}:${TAG}"
REMOTE_IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}/${IMAGE_NAME}:${TAG}"
LATEST_IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "🏗️  Building Docker image: ${LOCAL_IMAGE}"
echo "📦 Will publish to: ${REMOTE_IMAGE}"

# Build the Docker image for volume-worker
docker build -t "${LOCAL_IMAGE}" ./workers/volume-worker

# Tag for GitHub Container Registry
docker tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}"
docker tag "${LOCAL_IMAGE}" "${LATEST_IMAGE}"

# Log in to GitHub Container Registry
echo "🔐 Authenticating to GitHub Container Registry..."
echo "${GITHUB_TOKEN}" | docker login "${REGISTRY}" -u "${GITHUB_ACTOR}" --password-stdin

# Push the images
echo "🚀 Publishing ${REMOTE_IMAGE}..."
docker push "${REMOTE_IMAGE}"

echo "🚀 Publishing ${LATEST_IMAGE}..."
docker push "${LATEST_IMAGE}"

echo "✅ Successfully published:"
echo "   - ${REMOTE_IMAGE}"
echo "   - ${LATEST_IMAGE}"
