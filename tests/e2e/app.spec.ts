import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const START_IMAGE_PATH = path.join(FIXTURES_DIR, 'start-image.png');
const END_IMAGE_PATH = path.join(FIXTURES_DIR, 'end-image.png');

test.describe('Media Labs Application', () => {
  test('should load home page successfully', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Verify the page loads and contains expected elements
    await expect(page).toHaveTitle('Create Next App');
    
    // Check for Next.js logo
    const logo = page.locator('img[alt="Next.js logo"]');
    await expect(logo).toBeVisible();

    // Check for main navigation elements
    const videoGeneratorLink = page.locator('a:has-text("🎬 FLF2V Video Generator")');
    await expect(videoGeneratorLink).toBeVisible();
    
    const docsLink = page.locator('a:has-text("Read our docs")');
    await expect(docsLink).toBeVisible();

    // Verify getting started instructions are present
    await expect(page.locator('text=Get started by editing')).toBeVisible();
    await expect(page.locator('code:has-text("app/page.tsx")')).toBeVisible();
  });

  test('should navigate to FLF2V video generator page', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Click on the FLF2V Video Generator link
    const videoGeneratorLink = page.locator('a:has-text("🎬 FLF2V Video Generator")');
    await videoGeneratorLink.click();

    // Verify we're on the FLF2V page
    await expect(page).toHaveURL('/flf2v');
    
    // Check for key elements on the FLF2V page
    // Note: These expectations are based on the component structure seen in the code
    const startImageUpload = page.locator('input[type="file"]').first();
    await expect(startImageUpload).toBeVisible();

    // Check for form controls that should be present - use .first() to avoid strict mode violations
    await expect(page.locator('text=Start Image').first()).toBeVisible();
  });

  test('should have responsive design elements', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // Verify desktop layout elements
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Verify content is still accessible on mobile
    await expect(mainContent).toBeVisible();
    await expect(page.locator('a:has-text("🎬 FLF2V Video Generator")')).toBeVisible();
  });
});

test.describe('FLF2V Video Generation Workflow - Local Fake Mode', () => {
  test('should complete video generation workflow in local_fake mode', async ({ page }) => {
    // Navigate to FLF2V page
    await page.goto('/flf2v');
    
    // Verify page loaded
    await expect(page).toHaveTitle('Create Next App');
    await expect(page.locator('h1:has-text("First-Last Frame to Video")')).toBeVisible();
    
    // Upload start image
    const startImageInput = page.locator('input[type="file"]').first();
    await startImageInput.setInputFiles(START_IMAGE_PATH);
    
    // Verify start image preview appears
    await expect(page.locator('img[alt="Start image preview"]')).toBeVisible();
    await expect(page.locator('text=start-image.png')).toBeVisible();
    
    // Upload end image  
    const endImageInput = page.locator('input[type="file"]').nth(1);
    await endImageInput.setInputFiles(END_IMAGE_PATH);
    
    // Verify end image preview appears
    await expect(page.locator('img[alt="End image preview"]')).toBeVisible();
    await expect(page.locator('text=end-image.png')).toBeVisible();
    
    // Configure video parameters
    await page.locator('button:has-text("Standard (16)")').click(); // Set frames to 16
    await page.locator('button:has-text("Standard (8)")').click();  // Set FPS to 8
    await page.locator('input[value="720p"]').check();              // Set resolution to 720p
    
    // Listen for API requests to verify local_fake mode
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    // Submit the form
    const generateButton = page.locator('button:has-text("Generate Video")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    
    // Verify loading state
    await expect(page.locator('text=Creating Video...')).toBeVisible();
    
    // Wait for job creation success message (this should work in local_fake mode)
    await expect(page.locator('text=Job Created Successfully!')).toBeVisible({ timeout: 30000 });
    
    // Verify job ID is displayed (IDs start with 'cmf')
    const jobIdElement = page.locator('code').filter({ hasText: /^cmf/ });
    await expect(jobIdElement).toBeVisible();
    
    // Verify API calls were made
    expect(apiRequests.some(req => req.url.includes('/api/uploads'))).toBeTruthy();
    expect(apiRequests.some(req => req.url.includes('/api/jobs') && req.method === 'POST')).toBeTruthy();
    
    // Verify "Create Another Video" button appears
    await expect(page.locator('button:has-text("Create Another Video")')).toBeVisible();
  });

  test('should validate image upload requirements', async ({ page }) => {
    // Navigate to FLF2V page
    await page.goto('/flf2v');
    
    // Try to submit without images
    const generateButton = page.locator('button:has-text("Generate Video")');
    await expect(generateButton).toBeDisabled();
    
    // Upload only start image
    const startImageInput = page.locator('input[type="file"]').first();
    await startImageInput.setInputFiles(START_IMAGE_PATH);
    
    // Verify button is still disabled
    await expect(generateButton).toBeDisabled();
    
    // Upload end image
    const endImageInput = page.locator('input[type="file"]').nth(1);
    await endImageInput.setInputFiles(END_IMAGE_PATH);
    
    // Now button should be enabled
    await expect(generateButton).toBeEnabled();
    
    // Test image removal
    await page.locator('button:has-text("Remove")').first().click();
    
    // Button should be disabled again
    await expect(generateButton).toBeDisabled();
    
    // Verify image preview is gone
    await expect(page.locator('img[alt="Start image preview"]')).not.toBeVisible();
  });
});