// Test JSON-based job creation with URL references
const testJobCreation = async () => {
  const port = process.env.PORT || 4000;
  const baseUrl = `http://localhost:${port}`;
  
  // Use publicly accessible test images
  const payload = {
    startImageUrl: 'https://httpbin.org/image/png',
    endImageUrl: 'https://httpbin.org/image/jpeg',
    frames: 24,
    fps: 30,
    resolution: '720p'
  };

  console.log('Testing job creation with URL payload...');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, data);

    if (response.ok) {
      console.log('✅ Job creation successful!');
      return true;
    } else {
      console.log('❌ Job creation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    return false;
  }
};

testJobCreation().then((success) => {
  process.exit(success ? 0 : 1);
});