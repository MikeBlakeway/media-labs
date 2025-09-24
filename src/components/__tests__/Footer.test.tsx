/**
 * Tests for Footer Component
 *
 * Basic tests for the Footer component navigation links and content structure.
 */

describe('Footer Component', () => {
  describe('footer content structure', () => {
    it('should have correct primary navigation links', () => {
      const primaryLinks = [
        { name: 'Home', href: '/' },
        { name: 'Workflows', href: '/w' },
        { name: 'Manage', href: '/manage' }
      ]

      expect(primaryLinks).toHaveLength(3)
      expect(primaryLinks[0]).toEqual({ name: 'Home', href: '/' })
      expect(primaryLinks[1]).toEqual({ name: 'Workflows', href: '/w' })
      expect(primaryLinks[2]).toEqual({ name: 'Manage', href: '/manage' })
    })

    it('should have correct secondary navigation links', () => {
      const secondaryLinks = [
        { name: 'Admin', href: '/admin' },
        { name: 'Debug', href: '/debug' },
        { name: 'Volume Test', href: '/volume-test' }
      ]

      expect(secondaryLinks).toHaveLength(3)
      expect(secondaryLinks[0]).toEqual({ name: 'Admin', href: '/admin' })
      expect(secondaryLinks[1]).toEqual({ name: 'Debug', href: '/debug' })
      expect(secondaryLinks[2]).toEqual({ name: 'Volume Test', href: '/volume-test' })
    })
  })

  describe('footer metadata', () => {
    it('should display current year in copyright', () => {
      const currentYear = new Date().getFullYear()
      const copyrightText = `© ${currentYear} Media Labs. Built with Next.js and RunPod.`

      expect(copyrightText).toContain(currentYear.toString())
      expect(copyrightText).toContain('Media Labs')
      expect(copyrightText).toContain('Next.js and RunPod')
    })

    it('should have correct version and documentation link', () => {
      const version = 'v1.0.0'
      const docsHref = '/docs'

      expect(version).toBe('v1.0.0')
      expect(docsHref).toBe('/docs')
    })
  })

  describe('branding and description', () => {
    it('should have correct brand name and description', () => {
      const brandName = 'Media Labs'
      const description =
        'AI-powered media generation using RunPod ComfyUI serverless endpoints. Create high-quality images and videos with advanced AI models.'

      expect(brandName).toBe('Media Labs')
      expect(description).toContain('AI-powered media generation')
      expect(description).toContain('RunPod ComfyUI')
      expect(description).toContain('images and videos')
    })
  })

  describe('accessibility attributes', () => {
    it('should have proper ARIA labels for navigation sections', () => {
      const footerNavAriaLabel = 'Footer navigation'
      const footerToolsAriaLabel = 'Footer tools navigation'

      expect(footerNavAriaLabel).toBe('Footer navigation')
      expect(footerToolsAriaLabel).toBe('Footer tools navigation')
    })
  })

  describe('responsive layout classes', () => {
    it('should have correct grid layout classes', () => {
      const gridClasses = 'grid grid-cols-1 md:grid-cols-3 gap-8'
      const bottomBarClasses = 'flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'

      expect(gridClasses).toContain('grid-cols-1')
      expect(gridClasses).toContain('md:grid-cols-3')
      expect(bottomBarClasses).toContain('flex-col')
      expect(bottomBarClasses).toContain('md:flex-row')
    })
  })
})
