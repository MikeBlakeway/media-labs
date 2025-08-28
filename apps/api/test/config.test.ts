import { loadRunPodConfig, validateRunPodConfig, RunPodConfigSchema } from '../src/config/runpod'
import { loadStorageConfig, loadAppConfig, validateStorageConfig, StorageConfigSchema, AppConfigSchema } from '../src/config/storage'

describe('Cloud Mode Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('RunPod Configuration', () => {
    it('should return null when VIDEO_RUN_MODE is not cloud', () => {
      process.env.VIDEO_RUN_MODE = 'local_fake'
      const config = loadRunPodConfig()
      expect(config).toBeNull()
    })

    it('should validate and return config when VIDEO_RUN_MODE is cloud and all env vars are set', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.RUNPOD_API_KEY = 'test-api-key'
      process.env.RUNPOD_ENDPOINT_ID = 'test-endpoint-id'
      process.env.RUNPOD_REGION = 'us-east-1'

      const config = loadRunPodConfig()
      expect(config).toEqual({
        apiKey: 'test-api-key',
        endpointId: 'test-endpoint-id',
        region: 'us-east-1',
      })
    })

    it('should throw error when VIDEO_RUN_MODE is cloud but required env vars are missing', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      // Missing all RunPod env vars

      expect(() => loadRunPodConfig()).toThrow(
        'RunPod configuration validation failed in cloud mode'
      )
    })

    it('should validate schema correctly', () => {
      const validConfig = {
        apiKey: 'test-key',
        endpointId: 'test-endpoint',
        region: 'us-east-1',
      }

      expect(() => RunPodConfigSchema.parse(validConfig)).not.toThrow()

      const invalidConfig = {
        apiKey: '', // Empty string should fail
        endpointId: 'test-endpoint',
      }

      expect(() => RunPodConfigSchema.parse(invalidConfig)).toThrow()
    })
  })

  describe('Storage Configuration', () => {
    it('should return null when VIDEO_RUN_MODE is not cloud', () => {
      process.env.VIDEO_RUN_MODE = 'local_fake'
      const config = loadStorageConfig()
      expect(config).toBeNull()
    })

    it('should validate and return config when VIDEO_RUN_MODE is cloud and all env vars are set', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'

      const config = loadStorageConfig()
      expect(config).toEqual({
        endpoint: 'https://s3.us-east-1.backblazeb2.com',
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      })
    })

    it('should throw error when VIDEO_RUN_MODE is cloud but required env vars are missing', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      // Missing all B2 env vars

      expect(() => loadStorageConfig()).toThrow(
        'B2 storage configuration validation failed in cloud mode'
      )
    })

    it('should validate schema correctly', () => {
      const validConfig = {
        endpoint: 'https://s3.us-east-1.backblazeb2.com',
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      }

      expect(() => StorageConfigSchema.parse(validConfig)).not.toThrow()

      const invalidConfig = {
        endpoint: 'not-a-url', // Invalid URL
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      }

      expect(() => StorageConfigSchema.parse(invalidConfig)).toThrow()
    })
  })

  describe('App Configuration', () => {
    it('should return null when VIDEO_RUN_MODE is not cloud', () => {
      process.env.VIDEO_RUN_MODE = 'local_fake'
      const config = loadAppConfig()
      expect(config).toBeNull()
    })

    it('should validate and return config when VIDEO_RUN_MODE is cloud and all env vars are set', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.PUBLIC_BASE_URL = 'https://example.com'
      process.env.CALLBACK_SECRET = 'test-secret'

      const config = loadAppConfig()
      expect(config).toEqual({
        publicBaseUrl: 'https://example.com',
        callbackSecret: 'test-secret',
      })
    })

    it('should throw error when VIDEO_RUN_MODE is cloud but required env vars are missing', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      // Missing all app env vars

      expect(() => loadAppConfig()).toThrow(
        'Application configuration validation failed in cloud mode'
      )
    })

    it('should validate schema correctly', () => {
      const validConfig = {
        publicBaseUrl: 'https://example.com',
        callbackSecret: 'test-secret',
      }

      expect(() => AppConfigSchema.parse(validConfig)).not.toThrow()

      const invalidConfig = {
        publicBaseUrl: 'not-a-url', // Invalid URL
        callbackSecret: '',
      }

      expect(() => AppConfigSchema.parse(invalidConfig)).toThrow()
    })
  })

  describe('Validation Functions', () => {
    let exitSpy: jest.SpyInstance
    let consoleLogSpy: jest.SpyInstance
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit() was called')
      })
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      exitSpy.mockRestore()
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should not exit when VIDEO_RUN_MODE is local_fake', () => {
      process.env.VIDEO_RUN_MODE = 'local_fake'

      expect(() => validateRunPodConfig()).not.toThrow()
      expect(() => validateStorageConfig()).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('should exit when VIDEO_RUN_MODE is cloud but config is invalid', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      // Missing all required env vars

      expect(() => validateRunPodConfig()).toThrow('process.exit() was called')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should not exit when VIDEO_RUN_MODE is cloud and all config is valid', () => {
      process.env.VIDEO_RUN_MODE = 'cloud'
      process.env.RUNPOD_API_KEY = 'test-api-key'
      process.env.RUNPOD_ENDPOINT_ID = 'test-endpoint-id'
      process.env.RUNPOD_REGION = 'us-east-1'
      process.env.B2_ENDPOINT = 'https://s3.us-east-1.backblazeb2.com'
      process.env.B2_REGION = 'us-east-1'
      process.env.B2_BUCKET = 'test-bucket'
      process.env.B2_ACCESS_KEY_ID = 'test-access-key'
      process.env.B2_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.PUBLIC_BASE_URL = 'https://example.com'
      process.env.CALLBACK_SECRET = 'test-secret'

      expect(() => validateRunPodConfig()).not.toThrow()
      expect(() => validateStorageConfig()).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })
  })
})