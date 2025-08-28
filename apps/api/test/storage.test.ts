import { presignPut, presignGet, resetS3Client } from '../src/lib/storage'

// Mock the AWS SDK modules
jest.mock('@aws-sdk/client-s3')
jest.mock('@aws-sdk/s3-request-presigner')

const mockS3Client = jest.fn()
const mockGetSignedUrl = jest.fn()

// Import the mocked modules
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Set up the mocks
;(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(mockS3Client)
;(getSignedUrl as jest.MockedFunction<typeof getSignedUrl>).mockImplementation(mockGetSignedUrl)

describe('Storage Helper Functions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    mockS3Client.mockClear()
    mockGetSignedUrl.mockClear()
    
    // Reset S3 client instance
    resetS3Client()
    
    // Reset environment
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('presignPut', () => {
    it('should throw error when not in cloud mode', async () => {
      process.env.VIDEO_RUN_MODE = 'local_fake'

      await expect(presignPut('test-key', 'video/mp4')).rejects.toThrow(
        'Storage not configured - VIDEO_RUN_MODE must be "cloud" with valid B2 configuration'
      )
    })

    it('should throw error when B2 configuration is missing', async () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      // Missing B2 env vars

      await expect(presignPut('test-key', 'video/mp4')).rejects.toThrow(
        'B2 storage configuration validation failed in cloud mode'
      )
    })

    it('should generate presigned PUT URL with valid configuration', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      // Mock successful URL generation
      const expectedUrl = 'https://s3.us-east-1.backblazeb2.com/test-bucket/test-key?presigned-params'
      mockGetSignedUrl.mockResolvedValue(expectedUrl)

      const result = await presignPut('test-key', 'video/mp4', 1800)

      expect(result).toBe(expectedUrl)
      expect(mockS3Client).toHaveBeenCalledWith({
        endpoint: 'https://s3.us-east-1.backblazeb2.com',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        forcePathStyle: true,
      })
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object), // S3Client instance
        expect.any(Object), // PutObjectCommand instance  
        { expiresIn: 1800 }
      )
    })

    it('should use default expiration time when not provided', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      const expectedUrl = 'https://s3.us-east-1.backblazeb2.com/test-bucket/test-key?presigned-params'
      mockGetSignedUrl.mockResolvedValue(expectedUrl)

      await presignPut('test-key', 'video/mp4')

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 } // Default value
      )
    })

    it('should handle AWS SDK errors gracefully', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      // Mock AWS SDK error
      const awsError = new Error('Invalid credentials')
      mockGetSignedUrl.mockRejectedValue(awsError)

      await expect(presignPut('test-key', 'video/mp4')).rejects.toThrow(
        'Failed to generate presigned PUT URL: Invalid credentials'
      )
    })
  })

  describe('presignGet', () => {
    it('should throw error when not in cloud mode', async () => {
      process.env.VIDEO_RUN_MODE = 'local_fake'

      await expect(presignGet('test-key')).rejects.toThrow(
        'Storage not configured - VIDEO_RUN_MODE must be "cloud" with valid B2 configuration'
      )
    })

    it('should throw error when B2 configuration is missing', async () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      // Missing B2 env vars

      await expect(presignGet('test-key')).rejects.toThrow(
        'B2 storage configuration validation failed in cloud mode'
      )
    })

    it('should generate presigned GET URL with valid configuration', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      // Mock successful URL generation
      const expectedUrl = 'https://s3.us-east-1.backblazeb2.com/test-bucket/test-key?presigned-params'
      mockGetSignedUrl.mockResolvedValue(expectedUrl)

      const result = await presignGet('test-key', 7200)

      expect(result).toBe(expectedUrl)
      expect(mockS3Client).toHaveBeenCalledWith({
        endpoint: 'https://s3.us-east-1.backblazeb2.com',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        forcePathStyle: true,
      })
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object), // S3Client instance
        expect.any(Object), // GetObjectCommand instance
        { expiresIn: 7200 }
      )
    })

    it('should use default expiration time when not provided', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      const expectedUrl = 'https://s3.us-east-1.backblazeb2.com/test-bucket/test-key?presigned-params'
      mockGetSignedUrl.mockResolvedValue(expectedUrl)

      await presignGet('test-key')

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 } // Default value
      )
    })

    it('should handle AWS SDK errors gracefully', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      // Mock AWS SDK error
      const awsError = new Error('Network timeout')
      mockGetSignedUrl.mockRejectedValue(awsError)

      await expect(presignGet('test-key')).rejects.toThrow(
        'Failed to generate presigned GET URL: Network timeout'
      )
    })
  })

  describe('S3 Client Reuse', () => {
    it('should reuse the same S3 client instance for multiple calls', async () => {
      // Set up valid B2 configuration
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      const expectedUrl = 'https://s3.us-east-1.backblazeb2.com/test-bucket/test-key?presigned-params'
      mockGetSignedUrl.mockResolvedValue(expectedUrl)

      // Make multiple calls
      await presignPut('test-key-1', 'video/mp4')
      await presignGet('test-key-2')
      await presignPut('test-key-3', 'image/jpeg')

      // S3Client should only be instantiated once
      expect(mockS3Client).toHaveBeenCalledTimes(1)
    })
  })
})