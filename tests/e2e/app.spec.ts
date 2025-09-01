import { test, expect } from '@playwright/test';

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