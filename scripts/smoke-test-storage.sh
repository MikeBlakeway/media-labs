#!/bin/bash

# B2 Storage Helper Smoke Test
# This script tests the presigned URL functionality with actual B2 storage

set -e

echo "🧪 B2 Storage Helper Smoke Test"
echo "==============================="

# Check if we're in cloud mode
if [ "${VIDEO_RUN_MODE}" != "cloud" ]; then
    echo "⚠️  VIDEO_RUN_MODE is not set to 'cloud'. This test requires B2 configuration."
    echo "   Set VIDEO_RUN_MODE=cloud and provide B2 credentials to run this test."
    exit 0
fi

# Check if B2 configuration is available
if [ -z "${B2_ENDPOINT}" ] || [ -z "${B2_BUCKET}" ] || [ -z "${B2_ACCESS_KEY_ID}" ] || [ -z "${B2_SECRET_ACCESS_KEY}" ]; then
    echo "⚠️  B2 configuration is incomplete. This test requires:"
    echo "   - B2_ENDPOINT"
    echo "   - B2_REGION"
    echo "   - B2_BUCKET"
    echo "   - B2_ACCESS_KEY_ID"
    echo "   - B2_SECRET_ACCESS_KEY"
    exit 0
fi

echo "✅ B2 configuration detected"
echo "   Endpoint: ${B2_ENDPOINT}"
echo "   Region: ${B2_REGION}"
echo "   Bucket: ${B2_BUCKET}"
echo ""

# Create a test script that uses our storage helpers
cat > /tmp/storage-smoke-test.ts << 'EOF'
import { presignPut, presignGet } from './src/lib/storage'

async function smokeTest() {
  try {
    const testKey = `smoke-test-${Date.now()}.txt`
    const contentType = 'text/plain'
    const testContent = 'Hello from B2 storage smoke test!'
    
    console.log('🔗 Generating presigned PUT URL...')
    const putUrl = await presignPut(testKey, contentType, 300) // 5 minutes
    console.log('✅ PUT URL generated successfully')
    console.log(`   URL: ${putUrl.substring(0, 100)}...`)
    
    console.log('')
    console.log('📤 Testing file upload with curl...')
    
    // Test upload with curl
    const uploadResult = await fetch(putUrl, {
      method: 'PUT',
      body: testContent,
      headers: {
        'Content-Type': contentType
      }
    })
    
    if (uploadResult.ok) {
      console.log('✅ File uploaded successfully')
    } else {
      throw new Error(`Upload failed: ${uploadResult.status} ${uploadResult.statusText}`)
    }
    
    console.log('')
    console.log('🔗 Generating presigned GET URL...')
    const getUrl = await presignGet(testKey, 300) // 5 minutes
    console.log('✅ GET URL generated successfully')
    console.log(`   URL: ${getUrl.substring(0, 100)}...`)
    
    console.log('')
    console.log('📥 Testing file download with curl...')
    
    // Test download with curl
    const downloadResult = await fetch(getUrl)
    
    if (downloadResult.ok) {
      const downloadedContent = await downloadResult.text()
      if (downloadedContent === testContent) {
        console.log('✅ File downloaded successfully and content matches')
      } else {
        throw new Error('Downloaded content does not match uploaded content')
      }
    } else {
      throw new Error(`Download failed: ${downloadResult.status} ${downloadResult.statusText}`)
    }
    
    console.log('')
    console.log('🎉 Smoke test completed successfully!')
    console.log('')
    console.log('Summary:')
    console.log('- ✅ presignPut() generates valid upload URLs')
    console.log('- ✅ presignGet() generates valid download URLs') 
    console.log('- ✅ URLs work with standard HTTP clients')
    console.log('- ✅ B2 storage integration is working correctly')
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error)
    process.exit(1)
  }
}

smokeTest()
EOF

echo "🚀 Running smoke test..."
echo ""

# Check if fetch is available (Node 18+)
if node -e "fetch" 2>/dev/null; then
    npx ts-node /tmp/storage-smoke-test.ts
else
    echo "⚠️  Node.js fetch API not available. Skipping actual HTTP test."
    echo "   The presigned URL generation functions are tested in the unit tests."
    echo "   To run the full smoke test, use Node.js 18+ or install node-fetch."
fi

echo ""
echo "💡 Manual testing:"
echo "   1. Set VIDEO_RUN_MODE=cloud and configure B2 credentials"
echo "   2. Generate URLs using the storage helper functions"
echo "   3. Test with curl:"
echo "      curl -X PUT --data 'test content' '\$PUT_URL'"
echo "      curl '\$GET_URL'"

# Clean up
rm -f /tmp/storage-smoke-test.ts