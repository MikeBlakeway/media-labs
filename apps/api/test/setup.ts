// Test environment setup
import path from 'path'
import fs from 'fs/promises'
import { execSync } from 'child_process'

// Set up test-specific environment variables
const testDbPath = path.join(__dirname, 'test.db')
process.env.DATABASE_URL = `file:${testDbPath}`
process.env.VIDEO_RUN_MODE = 'local_fake'
process.env.UPLOADS_DIR = path.join(__dirname, 'test-uploads')
process.env.LOCAL_FAKE_UPLOADS_ENABLED = 'true'

// Initialize test database
beforeAll(async () => {
  try {
    // Remove existing test database
    await fs.unlink(testDbPath).catch(() => {})
    
    // Run migrations to create test database
    execSync(`DATABASE_URL="${process.env.DATABASE_URL}" npx prisma migrate dev --skip-generate`, {
      cwd: __dirname + '/..',
      stdio: 'pipe'
    })
    
    console.log('🧪 Test database initialized')
  } catch (error) {
    console.error('Failed to initialize test database:', error)
    throw error
  }
})

// Helper function to wait for async operations to complete
global.waitForAsync = async (ms: number = 200) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper function to clean up test artifacts
global.cleanupTestFiles = async () => {
  try {
    const uploadsDir = process.env.UPLOADS_DIR
    if (uploadsDir && uploadsDir.includes('test')) {
      await fs.rm(uploadsDir, { recursive: true, force: true })
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

console.log('🧪 Test environment setup complete')
console.log(`Database: ${process.env.DATABASE_URL}`)
console.log(`Video mode: ${process.env.VIDEO_RUN_MODE}`)
console.log(`Uploads dir: ${process.env.UPLOADS_DIR}`)

// Declare global types for TypeScript
declare global {
  function waitForAsync(ms?: number): Promise<void>
  function cleanupTestFiles(): Promise<void>
}