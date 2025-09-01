import { submitToRunPod, RunPodError, convertImageToBase64, injectWorkflowParameters, mapResolutionToPixels } from '../src/lib/runpod'
import * as runpodConfig from '../src/config/runpod'

// Mock the config module
jest.mock('../src/config/runpod')
const mockLoadRunPodConfig = jest.mocked(runpodConfig.loadRunPodConfig)

// Mock fs/promises
jest.mock('fs/promises')
import * as fs from 'fs/promises'
const mockFs = jest.mocked(fs)

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = jest.mocked(fetch)

describe('RunPod submission helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console.log and console.error mocks
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const mockConfig = {
    apiKey: 'test-api-key',
    endpointId: 'test-endpoint-id',
    region: 'us-east-1',
  }

  const mockParams = {
    jobId: 'test-job-123',
    workflow: { test: 'workflow' },
    images: [
      { name: 'start_image.png', image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
      { name: 'end_image.png', image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
    ],
    outputPutUrl: 'https://example.com/output/test-job-123.mp4',
    callbackUrl: 'https://example.com/callback/test-job-123',
  }

  describe('submitToRunPod', () => {
    it('should submit job successfully and return RunPod response', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)
      
      const mockResponse = {
        id: 'runpod-job-456',
        status: 'IN_QUEUE' as const,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as Response)

      // Act
      const result = await submitToRunPod(mockParams)

      // Assert
      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.runpod.ai/v2/test-endpoint-id/run',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              workflow: mockParams.workflow,
              images: mockParams.images,
              output_put_url: mockParams.outputPutUrl,
              callback_url: mockParams.callbackUrl,
            }
          }),
        }
      )
    })

    it('should throw error when RunPod config is not available', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(null)

      // Act & Assert
      await expect(submitToRunPod(mockParams)).rejects.toThrow(
        'RunPod configuration not available - ensure VIDEO_RUN_MODE=cloud and config is set'
      )
    })

    it('should handle RunPod API error responses', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)
      
      const errorResponse = {
        error: 'Invalid endpoint',
        message: 'Endpoint test-endpoint-id not found',
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
      } as Response)

      // Act & Assert
      await expect(submitToRunPod(mockParams)).rejects.toThrow(RunPodError)
      await expect(submitToRunPod(mockParams)).rejects.toThrow('Endpoint test-endpoint-id not found')
    })

    it('should handle network errors', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      await expect(submitToRunPod(mockParams)).rejects.toThrow(RunPodError)
      await expect(submitToRunPod(mockParams)).rejects.toThrow('Failed to submit job to RunPod: Network error')
    })

    it('should log request and response details', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)
      
      const mockResponse = {
        id: 'runpod-job-456',
        status: 'IN_QUEUE' as const,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as Response)

      const consoleLogSpy = jest.spyOn(console, 'log')

      // Act
      await submitToRunPod(mockParams)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Submitting job to RunPod'),
        expect.objectContaining({
          endpoint: 'test-endpoint-id',
          region: 'us-east-1',
          jobId: 'test-job-123',
          imagesCount: 2,
        })
      )

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ RunPod job submitted successfully'),
        expect.objectContaining({
          runPodJobId: 'runpod-job-456',
          status: 'IN_QUEUE',
        })
      )
    })

    it('should handle malformed JSON error responses', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: () => Promise.resolve('Invalid JSON response'),
      } as Response)

      // Act & Assert
      await expect(submitToRunPod(mockParams)).rejects.toThrow(RunPodError)
      await expect(submitToRunPod(mockParams)).rejects.toThrow('Invalid JSON response')
    })

    it('should validate payload structure and reject invalid data', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)

      const invalidParams = {
        ...mockParams,
        images: [
          { name: '', image: '' }, // Invalid: empty name and image
        ]
      }

      // Act & Assert
      await expect(submitToRunPod(invalidParams)).rejects.toThrow(RunPodError)
      await expect(submitToRunPod(invalidParams)).rejects.toThrow('Invalid payload structure')
    })
  })

  describe('Utility functions', () => {
    describe('mapResolutionToPixels', () => {
      it('should map 720p to correct dimensions', () => {
        const result = mapResolutionToPixels('720p')
        expect(result).toEqual({ width: 1280, height: 720 })
      })

      it('should map 1080p to correct dimensions', () => {
        const result = mapResolutionToPixels('1080p')
        expect(result).toEqual({ width: 1920, height: 1080 })
      })

      it('should throw error for unsupported resolution', () => {
        expect(() => mapResolutionToPixels('4k' as any)).toThrow('Unsupported resolution: 4k')
      })
    })

    describe('convertImageToBase64', () => {
      it('should convert buffer to base64', async () => {
        const buffer = Buffer.from('test image data')
        const result = await convertImageToBase64(buffer)
        expect(result).toBe(buffer.toString('base64'))
      })

      it('should fetch and convert URL to base64', async () => {
        const mockArrayBuffer = new ArrayBuffer(8)
        const mockResponse = {
          ok: true,
          arrayBuffer: () => Promise.resolve(mockArrayBuffer)
        }
        mockFetch.mockResolvedValue(mockResponse as any)

        const result = await convertImageToBase64('https://example.com/image.png')
        expect(result).toBe(Buffer.from(mockArrayBuffer).toString('base64'))
        expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.png')
      })

      it('should throw error for failed fetch', async () => {
        const mockResponse = {
          ok: false,
          statusText: 'Not Found'
        }
        mockFetch.mockResolvedValue(mockResponse as any)

        await expect(convertImageToBase64('https://example.com/missing.png'))
          .rejects.toThrow('Failed to fetch image from https://example.com/missing.png: Not Found')
      })

      it('should convert relative URL to absolute URL using PUBLIC_BASE_URL', async () => {
        const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL
        process.env.PUBLIC_BASE_URL = 'https://api.example.com'

        const mockArrayBuffer = new ArrayBuffer(8)
        const mockResponse = {
          ok: true,
          arrayBuffer: () => Promise.resolve(mockArrayBuffer)
        }
        mockFetch.mockResolvedValue(mockResponse as any)

        await convertImageToBase64('/uploads/test-image.png')
        
        expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/uploads/test-image.png')

        // Restore original value
        if (originalPublicBaseUrl !== undefined) {
          process.env.PUBLIC_BASE_URL = originalPublicBaseUrl
        } else {
          delete process.env.PUBLIC_BASE_URL
        }
      })

      it('should convert relative URL to localhost when PUBLIC_BASE_URL is not set', async () => {
        const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL
        const originalPort = process.env.PORT
        delete process.env.PUBLIC_BASE_URL
        process.env.PORT = '4000'

        const mockArrayBuffer = new ArrayBuffer(8)
        const mockResponse = {
          ok: true,
          arrayBuffer: () => Promise.resolve(mockArrayBuffer)
        }
        mockFetch.mockResolvedValue(mockResponse as any)

        await convertImageToBase64('/uploads/test-image.png')
        
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/uploads/test-image.png')

        // Restore original values
        if (originalPublicBaseUrl !== undefined) {
          process.env.PUBLIC_BASE_URL = originalPublicBaseUrl
        }
        if (originalPort !== undefined) {
          process.env.PORT = originalPort
        } else {
          delete process.env.PORT
        }
      })

      it('should handle PUBLIC_BASE_URL with trailing slash', async () => {
        const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL
        process.env.PUBLIC_BASE_URL = 'https://api.example.com/'

        const mockArrayBuffer = new ArrayBuffer(8)
        const mockResponse = {
          ok: true,
          arrayBuffer: () => Promise.resolve(mockArrayBuffer)
        }
        mockFetch.mockResolvedValue(mockResponse as any)

        await convertImageToBase64('/uploads/test-image.png')
        
        expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/uploads/test-image.png')

        // Restore original value
        if (originalPublicBaseUrl !== undefined) {
          process.env.PUBLIC_BASE_URL = originalPublicBaseUrl
        } else {
          delete process.env.PUBLIC_BASE_URL
        }
      })

      it('should read local upload file directly from filesystem', async () => {
        const testData = Buffer.from('test image from local file')
        mockFs.readFile.mockResolvedValue(testData)
        
        // Mock console.log to verify the local file message
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        
        const result = await convertImageToBase64('/uploads/test-file.png')
        
        expect(result).toBe(testData.toString('base64'))
        expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringMatching(/test-uploads[\/\\]test-file\.png$/))
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📁 Reading local upload file'))
        expect(mockFetch).not.toHaveBeenCalled() // Should not fall back to HTTP fetch
        
        consoleSpy.mockRestore()
      })

      it('should fallback to HTTP fetch when local file read fails', async () => {
        mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'))
        
        // Mock successful HTTP fetch
        const mockArrayBuffer = new ArrayBuffer(8)
        const mockResponse = {
          ok: true,
          arrayBuffer: () => Promise.resolve(mockArrayBuffer)
        }
        mockFetch.mockResolvedValue(mockResponse as any)
        
        // Mock console.warn to verify the fallback message
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
        
        const result = await convertImageToBase64('/uploads/missing-file.png')
        
        expect(result).toBe(Buffer.from(mockArrayBuffer).toString('base64'))
        expect(mockFs.readFile).toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('⚠️ Failed to read local file'),
          expect.any(String)
        )
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/uploads/missing-file.png')
        
        consoleWarnSpy.mockRestore()
      })
    })

    describe('injectWorkflowParameters', () => {
      it('should inject parameters into nodes 83 and 91', () => {
        const workflow = {
          '83': { inputs: { existing: 'value' } },
          '91': { inputs: { other: 'value' } },
          '99': { inputs: { unchanged: 'value' } }
        }

        const params = {
          frames: 16,
          fps: 30,
          width: 1280,
          height: 720
        }

        const result = injectWorkflowParameters(workflow, params)

        expect(result).toEqual({
          '83': {
            inputs: {
              existing: 'value',
              length: 16,
              width: 1280,
              height: 720
            }
          },
          '91': {
            inputs: {
              other: 'value',
              fps: 30
            }
          },
          '99': { inputs: { unchanged: 'value' } }
        })
      })

      it('should handle workflow without nodes 83 or 91', () => {
        const workflow = {
          '1': { inputs: { test: 'value' } }
        }

        const params = {
          frames: 16,
          fps: 30,
          width: 1280,
          height: 720
        }

        const result = injectWorkflowParameters(workflow, params)
        expect(result).toEqual(workflow)
      })
    })
  })
})