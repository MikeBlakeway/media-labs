#!/bin/bash
# S3 Migration Verification Script

set -e

# Load environment
cd "$(dirname "$0")/.."
source .env.local
export AWS_ACCESS_KEY_ID=$RUNPOD_S3_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$RUNPOD_S3_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=$RUNPOD_S3_REGION

echo "=== S3 Migration Verification ==="
echo "Volume ID: $RUNPOD_VOLUME_ID"
echo "Endpoint: $RUNPOD_S3_ENDPOINT"

echo -e "\n=== New models/ directory structure ==="
timeout 30s aws s3 ls s3://$RUNPOD_VOLUME_ID/models/ --endpoint-url=$RUNPOD_S3_ENDPOINT --region=$RUNPOD_S3_REGION || echo "❌ Timeout or connection error"

echo -e "\n=== Model files count ==="
for dir in clip_vision diffusion_models text_encoders vae; do
  echo -n "Checking $dir... "
  if timeout 20s aws s3 ls s3://$RUNPOD_VOLUME_ID/models/$dir/ --endpoint-url=$RUNPOD_S3_ENDPOINT --region=$RUNPOD_S3_REGION > /dev/null 2>&1; then
    count=$(timeout 30s aws s3 ls s3://$RUNPOD_VOLUME_ID/models/$dir/ --recursive --endpoint-url=$RUNPOD_S3_ENDPOINT --region=$RUNPOD_S3_REGION 2>/dev/null | grep -c "\.safetensors" || echo "0")
    echo "✅ $count .safetensors files"
  else
    echo "❌ directory missing or timeout"
  fi
done

echo -e "\n=== Checking specific clip_vision file ==="
echo -n "clip_vision_h.safetensors... "
if timeout 15s aws s3 ls s3://$RUNPOD_VOLUME_ID/models/clip_vision/clip_vision_h.safetensors --endpoint-url=$RUNPOD_S3_ENDPOINT --region=$RUNPOD_S3_REGION > /dev/null 2>&1; then
  echo "✅ Found"
else
  echo "❌ Not found or timeout"
fi

echo -e "\n=== Migration Status ==="
echo -n "Overall status... "
if timeout 15s aws s3 ls s3://$RUNPOD_VOLUME_ID/models/clip_vision/clip_vision_h.safetensors --endpoint-url=$RUNPOD_S3_ENDPOINT --region=$RUNPOD_S3_REGION > /dev/null 2>&1; then
  echo "✅ S3 Migration Complete"
else
  echo "⚠️  S3 Migration may still be in progress or stalled"
  echo "💡 Try manually restarting the copy operation if needed"
fi
