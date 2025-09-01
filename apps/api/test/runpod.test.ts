import { submitToRunPod, RunPodError } from '../src/lib/runpod'
import * as runpodConfig from '../src/config/runpod'
import * as workflowUtils from '../src/lib/workflow-utils'

// Mock the config module
jest.mock('../src/config/runpod')
const mockLoadRunPodConfig = jest.mocked(runpodConfig.loadRunPodConfig)

// Mock workflow utils
jest.mock('../src/lib/workflow-utils')
const mockDownloadImageAsBase64 = jest.mocked(workflowUtils.downloadImageAsBase64)
const mockInjectWorkflowParameters = jest.mocked(workflowUtils.injectWorkflowParameters)
const mockBufferToBase64 = jest.mocked(workflowUtils.bufferToBase64)

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = jest.mocked(fetch)

describe('RunPod submission helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console.log and console.error mocks
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Set up default mock returns
    mockDownloadImageAsBase64.mockResolvedValue('base64ImageData')
    mockInjectWorkflowParameters.mockReturnValue({ test: 'workflow' })
    mockBufferToBase64.mockImplementation((buffer: Buffer) => buffer.toString('base64'))
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
      { name: 'start_image.png', url: 'https://example.com/start.png' },
      { name: 'end_image.png', url: 'https://example.com/end.png' },
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
              images: [
                { name: 'start_image.png', image: 'base64ImageData' },
                { name: 'end_image.png', image: 'base64ImageData' },
              ],
              output_put_url: mockParams.outputPutUrl,
              callback_url: mockParams.callbackUrl,
            }
          }),
        }
      )
      
      // Verify image conversion was called
      expect(mockDownloadImageAsBase64).toHaveBeenCalledTimes(2)
      expect(mockDownloadImageAsBase64).toHaveBeenCalledWith('https://example.com/start.png')
      expect(mockDownloadImageAsBase64).toHaveBeenCalledWith('https://example.com/end.png')
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

    it('should inject video parameters when provided', async () => {
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

      const mockWorkflowInjected = { injected: 'workflow' }
      mockInjectWorkflowParameters.mockReturnValue(mockWorkflowInjected)

      const paramsWithVideo = {
        ...mockParams,
        videoParams: { frames: 30, fps: 24, width: 1024, height: 576 },
        resolution: '720p'
      }

      // Act
      await submitToRunPod(paramsWithVideo)

      // Assert
      expect(mockInjectWorkflowParameters).toHaveBeenCalledWith(
        mockParams.workflow,
        { frames: 30, fps: 24, width: 1024, height: 576 },
        '720p'
      )
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.runpod.ai/v2/test-endpoint-id/run',
        expect.objectContaining({
          body: JSON.stringify({
            input: {
              workflow: mockWorkflowInjected,
              images: [
                { name: 'start_image.png', image: 'base64ImageData' },
                { name: 'end_image.png', image: 'base64ImageData' },
              ],
              output_put_url: mockParams.outputPutUrl,
              callback_url: mockParams.callbackUrl,
            }
          })
        })
      )
    })

    it('should handle image conversion failure', async () => {
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)
      
      // Override the default mock to fail for this test
      mockDownloadImageAsBase64.mockReset()
      mockDownloadImageAsBase64.mockRejectedValue(new Error('Download failed'))

      // Act & Assert
      await expect(submitToRunPod(mockParams)).rejects.toThrow(RunPodError)
      await expect(submitToRunPod(mockParams)).rejects.toThrow('Failed to convert image start_image.png to base64: Download failed')
    })
      // Arrange
      mockLoadRunPodConfig.mockReturnValue(mockConfig)

    it('should handle images with buffers (local mode)', async () => {
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

      // Mock params with buffers
      const paramsWithBuffers = {
        ...mockParams,
        images: [
          { 
            name: 'start_image.png', 
            url: 'https://placeholder.images/start.png',
            buffer: Buffer.from('fake image data 1')
          },
          { 
            name: 'end_image.png', 
            url: 'https://placeholder.images/end.png',
            buffer: Buffer.from('fake image data 2')
          },
        ]
      }

      // Act
      await submitToRunPod(paramsWithBuffers)

      // Assert - downloadImageAsBase64 should NOT be called since we have buffers
      expect(mockDownloadImageAsBase64).not.toHaveBeenCalled()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.runpod.ai/v2/test-endpoint-id/run',
        expect.objectContaining({
          body: JSON.stringify({
            input: {
              workflow: mockParams.workflow,
              images: [
                { name: 'start_image.png', image: Buffer.from('fake image data 1').toString('base64') },
                { name: 'end_image.png', image: Buffer.from('fake image data 2').toString('base64') },
              ],
              output_put_url: mockParams.outputPutUrl,
              callback_url: mockParams.callbackUrl,
            }
          })
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
  })
})