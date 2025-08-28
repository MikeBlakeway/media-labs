import { submitToRunPod } from '../src/lib/runpod'

/**
 * Integration test script for RunPod submission helper
 * This script tests the actual integration with RunPod configuration
 * Note: This requires actual RunPod credentials to run successfully
 */
async function testRunPodIntegration() {
  console.log('🧪 Testing RunPod submission helper integration...')

  // Test parameters
  const testParams = {
    jobId: 'integration-test-' + Date.now(),
    workflow: {
      test: true,
      message: 'Integration test workflow',
    },
    images: [
      { name: 'start_image.png', url: 'https://httpbin.org/image/png' },
      { name: 'end_image.png', url: 'https://httpbin.org/image/png' },
    ],
    outputPutUrl: 'https://httpbin.org/put',
    callbackUrl: 'https://httpbin.org/post',
  }

  try {
    // Attempt to submit to RunPod
    const result = await submitToRunPod(testParams)
    
    console.log('✅ Integration test successful!')
    console.log('RunPod Job ID:', result.id)
    console.log('Status:', result.status)
    
    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes('RunPod configuration not available')) {
      console.log('ℹ️  Integration test skipped - RunPod not configured (VIDEO_RUN_MODE != cloud)')
      console.log('   This is expected in local development mode')
      return null
    }
    
    console.error('❌ Integration test failed:', error)
    throw error
  }
}

// Only run if called directly (not when imported)
if (require.main === module) {
  testRunPodIntegration()
    .then((result) => {
      if (result) {
        console.log('🎉 Integration test completed successfully')
        process.exit(0)
      } else {
        console.log('ℹ️  Integration test skipped - this is normal in local dev')
        process.exit(0)
      }
    })
    .catch((error) => {
      console.error('💥 Integration test failed:', error)
      process.exit(1)
    })
}

export { testRunPodIntegration }