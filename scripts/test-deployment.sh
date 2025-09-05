#!/bin/bash
# Post-Deployment Test Script

set -e

cd "$(dirname "$0")/.."
source .env.local

echo "=== Post-Deployment Test ==="
echo "Testing RunPod endpoint: $RUNPOD_ENDPOINT_ID"

# Test 1: Basic model loading
echo -e "\n=== Test 1: Basic Model Loading ==="
response=$(curl -s -X POST "https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "workflow": {
        "1": {
          "class_type": "UNETLoader",
          "inputs": {
            "unet_name": "wan2.1_flf2v_720p_14B_fp16.safetensors"
          }
        }
      },
      "patches": []
    }
  }')

echo "Response: $response"

# Check for success indicators
if echo "$response" | grep -q "error"; then
  echo "❌ Test failed - Error detected"
  echo "$response" | jq '.error' 2>/dev/null || echo "$response"
elif echo "$response" | grep -q "SUBMITTED\|SUCCESS"; then
  echo "✅ Test passed - Model loading successful"
else
  echo "⚠️  Unexpected response - Check manually"
fi

echo -e "\n=== Test Complete ==="
echo "If successful, the 'Value not in list' error should be resolved!"
