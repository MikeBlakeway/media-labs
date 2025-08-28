import { submitToRunPod } from '../src/lib/runpod'

/**
 * Demo script showing how to use the RunPod submission helper
 * This demonstrates the main interface and typical usage patterns
 */
async function runDemo() {
  console.log('🎬 RunPod Submission Helper Demo')
  console.log('================================\n')

  // Example job parameters as they would be used in the main API
  const jobParams = {
    jobId: 'demo-job-' + Date.now(),
    workflow: {
      // This would typically be loaded from apps/api/workflows/wan2.1_flf2v_720_f16.json
      version: '2.1',
      type: 'flf2v',
      resolution: '720p',
      frames: 16,
      settings: {
        fps: 24,
        quality: 'high',
      },
    },
    images: [
      {
        name: 'start_image.png',
        url: 'https://example.com/uploads/start_image.png',
      },
      {
        name: 'end_image.png', 
        url: 'https://example.com/uploads/end_image.png',
      },
    ],
    outputPutUrl: 'https://example.com/storage/videos/demo-job-123.mp4',
    callbackUrl: 'https://example.com/api/callbacks/gpu/demo-job-123?hmac=abc123',
  }

  console.log('📋 Job Parameters:')
  console.log('  Job ID:', jobParams.jobId)
  console.log('  Images:', jobParams.images.length, 'files')
  console.log('  Output URL:', jobParams.outputPutUrl)
  console.log('  Callback URL:', jobParams.callbackUrl)
  console.log()

  try {
    console.log('🚀 Submitting job to RunPod...')
    
    const result = await submitToRunPod(jobParams)
    
    console.log('✅ Job submitted successfully!')
    console.log('  RunPod Job ID:', result.id)
    console.log('  Initial Status:', result.status)
    console.log()
    console.log('🔄 Next steps:')
    console.log('  - Job will be processed by RunPod GPU workers')
    console.log('  - Status updates will be sent to callback URL')
    console.log('  - Final video will be uploaded to output PUT URL')
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('RunPod configuration not available')) {
      console.log('ℹ️  Demo mode: RunPod not configured')
      console.log('   In production, ensure VIDEO_RUN_MODE=cloud and set:')
      console.log('   - RUNPOD_API_KEY=your_api_key')
      console.log('   - RUNPOD_ENDPOINT_ID=your_endpoint_id')
      console.log('   - RUNPOD_REGION=your_region')
      console.log()
      console.log('✨ The RunPod helper is ready for use when configured!')
    } else {
      console.error('❌ Demo failed:', error)
      throw error
    }
  }
}

// Run the demo
if (require.main === module) {
  runDemo()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!')
    })
    .catch((error) => {
      console.error('\n💥 Demo failed:', error)
      process.exit(1)
    })
}

export { runDemo }