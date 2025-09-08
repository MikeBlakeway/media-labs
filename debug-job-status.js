#!/usr/bin/env node

/**
 * Debug script to check RunPod job status
 * Usage: node debug-job-status.js <job-id>
 */

const jobId = process.argv[2]

if (!jobId) {
  console.error('Usage: node debug-job-status.js <job-id>')
  console.error('Example: node debug-job-status.js abc123-def456-ghi789')
  process.exit(1)
}

async function checkJobStatus() {
  try {
    console.log(`🔍 Checking status for job: ${jobId}`)
    console.log(`📅 Timestamp: ${new Date().toISOString()}\n`)

    // Check via your local API endpoint
    const response = await fetch(`http://localhost:3000/api/runpod/status/${jobId}`)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    console.log('📊 Raw API Response:')
    console.log(JSON.stringify(data, null, 2))

    console.log('\n📋 Status Summary:')
    console.log(`  Status: ${data.status || 'Unknown'}`)
    console.log(`  Job ID: ${data.id || 'N/A'}`)

    if (data.delayTime !== undefined) {
      console.log(`  Delay Time: ${data.delayTime}ms`)
    }

    if (data.executionTime !== undefined) {
      console.log(`  Execution Time: ${data.executionTime}ms`)
    }

    if (data.output) {
      console.log(`  Has Output: ${Object.keys(data.output).length > 0 ? 'Yes' : 'No'}`)
      if (data.output.images) {
        console.log(`  Images: ${data.output.images.length} found`)
      }
      if (data.output.errors && data.output.errors.length > 0) {
        console.log(`  Errors: ${data.output.errors.length} found`)
        data.output.errors.forEach((error, i) => {
          console.log(`    ${i + 1}. ${error}`)
        })
      }
    }

    // Determine if job is complete
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT']
    const isComplete = terminalStates.includes(data.status)

    console.log(`\n🎯 Job State:`)
    console.log(`  Complete: ${isComplete ? 'Yes' : 'No'}`)
    console.log(`  Can Cancel: ${['IN_QUEUE', 'RUNNING'].includes(data.status) ? 'Yes' : 'No'}`)

    if (!isComplete) {
      console.log('\n⏳ Job is still running. You can run this script again to check status.')
      console.log(`   Next check: node debug-job-status.js ${jobId}`)
    }
  } catch (error) {
    console.error('❌ Error checking job status:')
    console.error(error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('  1. Make sure your dev server is running: npm run dev')
    console.error('  2. Check that the job ID is correct')
    console.error('  3. Verify your RunPod API configuration')
  }
}

checkJobStatus()
