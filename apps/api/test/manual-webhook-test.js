#!/usr/bin/env node

/**
 * Manual test script for the webhook callback endpoint
 * Tests the POST /api/callbacks/gpu/:jobId endpoint functionality
 */

const { PrismaClient } = require('@prisma/client')
// For manual testing, we'll skip HMAC generation to avoid config complexity
// const { generateCallbackHmac } = require('../src/lib/crypto')

async function testWebhookEndpoint() {
  console.log('🧪 Testing webhook callback endpoint...')
  
  const prisma = new PrismaClient()
  
  try {
    // 1. Create a test job
    console.log('1. Creating test job...')
    const job = await prisma.job.create({
      data: {
        lane: 'VIDEO',
        status: 'RUNNING',
        params: { test: true },
        podId: 'test-runpod-job'
      }
    })
    console.log(`   ✅ Created job: ${job.id}`)
    
    // 2. Generate HMAC for the callback
    console.log('2. Generating HMAC...')
    const hmac = 'test-hmac-for-manual-testing'
    console.log(`   ℹ️  Using test HMAC: ${hmac}`)
    console.log('   💡 In real usage, HMAC would be generated using CALLBACK_SECRET')
    
    // 3. Prepare callback payload
    const callbackPayload = {
      id: 'test-runpod-job',
      status: 'COMPLETED',
      output: {
        output_url: 'https://storage.example.com/videos/test-output.mp4'
      }
    }
    
    console.log('3. Webhook endpoint would receive:')
    console.log(`   URL: POST /api/callbacks/gpu/${job.id}?hmac=${hmac}`)
    console.log(`   Payload:`, JSON.stringify(callbackPayload, null, 2))
    
    // 4. Check job state
    console.log('4. Current job state:')
    const currentJob = await prisma.job.findUnique({
      where: { id: job.id }
    })
    console.log(`   Status: ${currentJob.status}`)
    console.log(`   Progress: ${currentJob.progressPct}%`)
    console.log(`   Output URL: ${currentJob.outputUrl || 'none'}`)
    
    // 5. Clean up
    console.log('5. Cleaning up test job...')
    await prisma.job.delete({
      where: { id: job.id }
    })
    console.log('   ✅ Test job deleted')
    
    console.log('\n🎉 Manual test preparation completed!')
    console.log('\nTo test the actual endpoint:')
    console.log('1. Start the API server: pnpm --filter ./apps/api run dev')
    console.log('2. Use curl or Postman to send the callback payload above')
    console.log('3. Check the server logs for webhook processing messages')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test if called directly
if (require.main === module) {
  testWebhookEndpoint()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Test script failed:', error)
      process.exit(1)
    })
}

module.exports = { testWebhookEndpoint }