import { convertImageToBase64 } from '../src/lib/runpod'

async function testImageConversion() {
  const startImageUrl = 'https://github.com/user-attachments/assets/4995e603-c821-4c46-b3b3-2deaf09218c0'
  const endImageUrl = 'https://github.com/user-attachments/assets/aaeae558-75b7-430d-a9f8-3ca4add7aa50'

  console.log('Testing image conversion from GitHub URLs...')
  
  try {
    console.log('Converting start image...')
    const startBase64 = await convertImageToBase64(startImageUrl)
    console.log(`✅ Start image converted: ${startBase64.length} characters`)
    
    console.log('Converting end image...')
    const endBase64 = await convertImageToBase64(endImageUrl)
    console.log(`✅ End image converted: ${endBase64.length} characters`)
    
    console.log('🎉 Both images converted successfully!')
    return true
  } catch (error) {
    console.error('❌ Image conversion failed:', error)
    return false
  }
}

testImageConversion().then((success) => {
  process.exit(success ? 0 : 1)
})