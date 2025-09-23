import { sanitizeFilename, isAllowedMime } from '../filename'

describe('sanitizeFilename', () => {
  it('removes path traversal', () => {
    expect(sanitizeFilename('../etc/passwd')).not.toMatch(/\.\./)
  })
  it('limits length to 200 chars', () => {
    const longName = 'a'.repeat(300)
    expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(200)
  })
})

describe('isAllowedMime', () => {
  it('accepts image/png', () => {
    expect(isAllowedMime('image/png')).toBe(true)
  })
  it('rejects application/x-msdownload', () => {
    expect(isAllowedMime('application/x-msdownload')).toBe(false)
  })
})
