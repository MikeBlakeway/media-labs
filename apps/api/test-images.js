async function testImageConversion() {
  const startImageUrl = 'https://github.com/user-attachments/assets/4995e603-c821-4c46-b3b3-2deaf09218c0';
  const endImageUrl = 'https://github.com/user-attachments/assets/aaeae558-75b7-430d-a9f8-3ca4add7aa50';

  console.log('Testing image URLs access...');
  
  try {
    console.log('Fetching start image...');
    const startResponse = await fetch(startImageUrl);
    console.log(`✅ Start image accessible: ${startResponse.status} ${startResponse.statusText}`);
    
    console.log('Fetching end image...');
    const endResponse = await fetch(endImageUrl);
    console.log(`✅ End image accessible: ${endResponse.status} ${endResponse.statusText}`);
    
    console.log('🎉 Both images are accessible!');
    return true;
  } catch (error) {
    console.error('❌ Image access failed:', error);
    return false;
  }
}

testImageConversion().then((success) => {
  process.exit(success ? 0 : 1);
});