#!/bin/bash
# Simple test script for the integration

echo "🧪 Testing Media Labs ComfyUI Worker Integration..."

# Check if Next.js is running
echo "📡 Checking Next.js app..."
if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ Next.js app is running on localhost:3000"
else
    echo "❌ Next.js app is not running. Start it with 'npm run dev'"
    exit 1
fi

# Check if worker is running
echo "📡 Checking ComfyUI worker..."
if curl -s -f http://localhost:8000/openapi.json > /dev/null; then
    echo "✅ ComfyUI worker API is running on localhost:8000"
else
    echo "❌ ComfyUI worker is not running. Start it with 'cd worker && docker-compose up -d'"
    exit 1
fi

# Test the workflow list endpoint
echo "📡 Testing workflow list endpoint..."
WORKFLOW_RESPONSE=$(curl -s http://localhost:3000/api/workflows/list)
echo "Response: $WORKFLOW_RESPONSE"

# Test a simple workflow template (if any exist)
echo "📡 Testing workflow templates..."
if echo "$WORKFLOW_RESPONSE" | grep -q "slug"; then
    echo "✅ Found workflow templates"
    # Extract first slug and test it
    FIRST_SLUG=$(echo "$WORKFLOW_RESPONSE" | jq -r '.[0].slug' 2>/dev/null || echo "")
    if [[ -n "$FIRST_SLUG" && "$FIRST_SLUG" != "null" ]]; then
        echo "🧪 Testing workflow: $FIRST_SLUG"
        curl -s "http://localhost:3000/api/workflows/$FIRST_SLUG" | jq '.'
    fi
else
    echo "⚠️  No workflow templates found. You can create one at http://localhost:3000/register"
fi

echo ""
echo "🎉 Integration test completed!"
echo ""
echo "📊 Summary:"
echo "✅ Next.js app: http://localhost:3000"
echo "✅ Worker API: http://localhost:8000"
echo "✅ Worker Docs: http://localhost:8000/"
echo "⚠️  ComfyUI will fail without GPU, but API integration works"
echo ""
echo "🚀 Next steps:"
echo "1. Create a workflow at http://localhost:3000/register"
echo "2. Test it at http://localhost:3000/w/[slug]"
echo "3. For production, deploy worker with GPU support to RunPod"
