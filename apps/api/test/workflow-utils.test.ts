import { 
  translateResolution, 
  injectWorkflowParameters, 
  downloadImageAsBase64, 
  bufferToBase64,
  VideoParameters 
} from '../src/lib/workflow-utils'

// Mock fetch for downloadImageAsBase64 tests
global.fetch = jest.fn()
const mockFetch = jest.mocked(fetch)

describe('Workflow utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('translateResolution', () => {
    it('should translate 720p to correct dimensions', () => {
      const result = translateResolution('720p')
      expect(result).toEqual({ width: 1280, height: 720 })
    })

    it('should translate 1080p to correct dimensions', () => {
      const result = translateResolution('1080p')
      expect(result).toEqual({ width: 1920, height: 1080 })
    })

    it('should return default 720p for invalid resolution', () => {
      const result = translateResolution('invalid')
      expect(result).toEqual({ width: 1280, height: 720 })
    })

    it('should return default 720p for undefined resolution', () => {
      const result = translateResolution(undefined)
      expect(result).toEqual({ width: 1280, height: 720 })
    })
  })

  describe('injectWorkflowParameters', () => {
    const mockWorkflow = {
      '83': {
        inputs: {
          length: 0,
          width: 0,
          height: 0,
          other_param: 'unchanged'
        }
      },
      '91': {
        inputs: {
          fps: 0,
          other_param: 'unchanged'
        }
      },
      '100': {
        inputs: {
          something_else: 'unchanged'
        }
      }
    }

    it('should inject video parameters into correct workflow nodes', () => {
      const params: VideoParameters = {
        frames: 30,
        fps: 24,
        width: 1024,
        height: 576
      }

      const result = injectWorkflowParameters(mockWorkflow, params) as any

      expect(result['83'].inputs.length).toBe(30)
      expect(result['83'].inputs.width).toBe(1024)
      expect(result['83'].inputs.height).toBe(576)
      expect(result['83'].inputs.other_param).toBe('unchanged')

      expect(result['91'].inputs.fps).toBe(24)
      expect(result['91'].inputs.other_param).toBe('unchanged')

      expect(result['100'].inputs.something_else).toBe('unchanged')
    })

    it('should use resolution defaults when dimensions not provided', () => {
      const params: VideoParameters = {
        frames: 60,
        fps: 30
      }

      const result = injectWorkflowParameters(mockWorkflow, params, '1080p') as any

      expect(result['83'].inputs.length).toBe(60)
      expect(result['83'].inputs.width).toBe(1920) // From 1080p resolution
      expect(result['83'].inputs.height).toBe(1080) // From 1080p resolution

      expect(result['91'].inputs.fps).toBe(30)
    })

    it('should use default values when no parameters provided', () => {
      const params: VideoParameters = {}

      const result = injectWorkflowParameters(mockWorkflow, params) as any

      expect(result['83'].inputs.length).toBe(16) // Default frames
      expect(result['83'].inputs.width).toBe(1280) // Default from 720p
      expect(result['83'].inputs.height).toBe(720) // Default from 720p

      expect(result['91'].inputs.fps).toBe(8) // Default fps
    })

    it('should not modify original workflow object', () => {
      const params: VideoParameters = { frames: 100 }
      const originalWorkflow = JSON.parse(JSON.stringify(mockWorkflow))

      injectWorkflowParameters(mockWorkflow, params)

      // Original should be unchanged
      expect(mockWorkflow).toEqual(originalWorkflow)
    })

    it('should handle workflow without target nodes', () => {
      const simpleWorkflow = { '1': { inputs: { test: 'value' } } }
      const params: VideoParameters = { frames: 30 }

      const result = injectWorkflowParameters(simpleWorkflow, params)

      // Should not throw and should return workflow unchanged
      expect(result).toEqual(simpleWorkflow)
    })
  })

  describe('downloadImageAsBase64', () => {
    it('should download and convert image to base64', async () => {
      const mockImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer)
      } as Response)

      const result = await downloadImageAsBase64('https://example.com/image.png')
      
      expect(result).toBe(Buffer.from(mockImageData).toString('base64'))
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.png')
    })

    it('should throw error for failed download', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      await expect(downloadImageAsBase64('https://example.com/missing.png'))
        .rejects.toThrow('Failed to download and encode image from https://example.com/missing.png: Failed to fetch image: 404 Not Found')
    })

    it('should throw error for network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(downloadImageAsBase64('https://example.com/image.png'))
        .rejects.toThrow('Failed to download and encode image from https://example.com/image.png: Network error')
    })
  })

  describe('bufferToBase64', () => {
    it('should convert buffer to base64 string', () => {
      const buffer = Buffer.from('Hello, World!', 'utf-8')
      const result = bufferToBase64(buffer)
      
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ==')
    })

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0)
      const result = bufferToBase64(buffer)
      
      expect(result).toBe('')
    })
  })
})