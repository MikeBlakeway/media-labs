import { convertImageToBase64 } from '../src/lib/runpod'
import fs from 'fs/promises'
import path from 'path'

describe('Local File Reading Integration', () => {
  const testUploadDir = process.env.UPLOADS_DIR || './test-uploads'

  beforeEach(async () => {
    // Ensure test upload directory exists
    await fs.mkdir(testUploadDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testUploadDir)
      for (const file of files) {
        if (file.startsWith('test-')) {
          await fs.unlink(path.join(testUploadDir, file))
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it('should read local upload files directly without HTTP fetch', async () => {
    // Create a test file in the uploads directory
    const testFileName = 'test-local-file.png'
    const testFilePath = path.join(testUploadDir, testFileName)
    const testData = Buffer.from('test image data for local reading')
    
    await fs.writeFile(testFilePath, testData)
    
    // Mock fetch to ensure it's not called
    const mockFetch = jest.fn()
    global.fetch = mockFetch
    
    // Convert the local file URL
    const result = await convertImageToBase64(`/uploads/${testFileName}`)
    
    // Verify the result matches the original data
    expect(result).toBe(testData.toString('base64'))
    
    // Verify fetch was not called (local file read was used)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle missing local files gracefully by falling back to HTTP', async () => {
    // Mock fetch for fallback
    const testData = 'fallback image data'
    const mockArrayBuffer = new ArrayBuffer(testData.length)
    const view = new Uint8Array(mockArrayBuffer)
    for (let i = 0; i < testData.length; i++) {
      view[i] = testData.charCodeAt(i)
    }
    
    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer)
    }
    const mockFetch = jest.fn().mockResolvedValue(mockResponse)
    global.fetch = mockFetch
    
    // Try to convert a non-existent local file
    const result = await convertImageToBase64('/uploads/non-existent-file.png')
    
    // Verify it fell back to HTTP fetch
    const expectedBase64 = Buffer.from(mockArrayBuffer).toString('base64')
    expect(result).toBe(expectedBase64)
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/uploads/non-existent-file.png')
  })
})