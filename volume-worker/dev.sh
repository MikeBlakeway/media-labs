#!/bin/bash
# dev.sh - Local development script for volume worker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 RunPod Volume Worker - Development Mode${NC}"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Set development environment variables
export HF_HOME="${PWD}/tmp/hf_cache"
export ALLOW_DELETE="true"
export PYTHONUNBUFFERED="1"
export LOCAL_MODE="true"
export ROOT="/tmp/runpod-volume"

# Create tmp directory
mkdir -p tmp/hf_cache
mkdir -p /tmp/runpod-volume

echo -e "${GREEN}✅ Environment ready!${NC}"
echo -e "${YELLOW}Environment variables:${NC}"
echo "  HF_HOME=$HF_HOME"
echo "  ALLOW_DELETE=$ALLOW_DELETE"
echo ""

# Check command line arguments
case "${1:-help}" in
    "run"|"start")
        echo -e "${GREEN}🏃 Starting handler in development mode...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        python handler.py --local
        ;;

    "test")
        echo -e "${GREEN}🧪 Running test suite...${NC}"
        python test_volume_worker.py
        ;;

    "test-runpod")
        if [ -z "$RUNPOD_ENDPOINT" ] || [ -z "$RUNPOD_API_KEY" ]; then
            echo -e "${RED}❌ Set RUNPOD_ENDPOINT and RUNPOD_API_KEY environment variables${NC}"
            exit 1
        fi
        echo -e "${GREEN}🧪 Running tests against RunPod endpoint...${NC}"
        python test_volume_worker.py --runpod
        ;;

    "build")
        echo -e "${GREEN}🐳 Building Docker image...${NC}"
        docker build -t volume-worker .
        echo -e "${GREEN}✅ Image built: volume-worker${NC}"
        ;;

    "clean")
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        rm -rf venv tmp __pycache__ *.pyc
        echo -e "${GREEN}✅ Cleaned up${NC}"
        ;;

    "help"|*)
        echo -e "${YELLOW}Usage:${NC}"
        echo "  ./dev.sh run          - Start handler locally"
        echo "  ./dev.sh test         - Run test suite locally"
        echo "  ./dev.sh test-runpod  - Test against RunPod endpoint"
        echo "  ./dev.sh build        - Build Docker image"
        echo "  ./dev.sh clean        - Clean up files"
        echo "  ./dev.sh help         - Show this help"
        ;;
esac
