#!/bin/bash
# Test script for the worker integration

set -e

echo "🧪 Testing Media Labs ComfyUI Worker Integration..."

# Check if worker is running
if ! curl -s -f http://localhost:8000/health > /dev/null; then
    echo "❌ Worker is not running on localhost:8000"
    echo "   Run './scripts/dev-worker.sh' first"
    exit 1
fi

echo "✅ Worker is running"

# Test the health endpoint
echo "📡 Testing health endpoint..."
curl -s http://localhost:8000/health | jq '.'

# Test with a simple workflow
echo "🎨 Testing with sample workflow..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d @worker/test_input.json \
  http://localhost:8000/runsync | jq '.'

echo "🎉 Integration test completed!"
echo "💡 You can now set USE_LOCAL_WORKER=true in your .env to use the local worker"
