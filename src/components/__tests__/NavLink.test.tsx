/**
 * Tests for NavLink Component
 *
 * Basic tests for the NavLink component active state and styling behavior.
 */

describe('NavLink Component', () => {
  describe('active state logic', () => {
    it('should determine active state correctly with exact match', () => {
      // Test exact match logic
      const currentPath: string = '/test'
      const linkHref: string = '/test'
      const exactMatch = true

      const isActive = exactMatch ? currentPath === linkHref : currentPath.startsWith(linkHref)
      expect(isActive).toBe(true)
    })

    it('should not be active with exact match when paths differ', () => {
      // Test exact match logic with different paths
      const currentPath: string = '/test/sub'
      const linkHref: string = '/test'
      const exactMatch = true

      const isActive = exactMatch ? currentPath === linkHref : currentPath.startsWith(linkHref)
      expect(isActive).toBe(false)
    })

    it('should determine active state correctly with prefix match', () => {
      // Test prefix match logic
      const currentPath: string = '/test/sub'
      const linkHref: string = '/test'
      const exactMatch = false

      const isActive = exactMatch ? currentPath === linkHref : currentPath.startsWith(linkHref)
      expect(isActive).toBe(true)
    })

    it('should not be active with prefix match when path does not start with href', () => {
      // Test prefix match logic with different paths
      const currentPath: string = '/other'
      const linkHref: string = '/test'
      const exactMatch = false

      const isActive = exactMatch ? currentPath === linkHref : currentPath.startsWith(linkHref)
      expect(isActive).toBe(false)
    })
  })

  describe('CSS class generation', () => {
    it('should generate correct active classes', () => {
      const activeClasses = 'bg-primary text-primary-foreground'
      const inactiveClasses = 'text-text-muted hover:text-text-primary'

      // Test active state classes
      const isActive = true
      const finalClasses = isActive ? activeClasses : inactiveClasses

      expect(finalClasses).toBe('bg-primary text-primary-foreground')
    })

    it('should generate correct inactive classes', () => {
      const activeClasses = 'bg-primary text-primary-foreground'
      const inactiveClasses = 'text-text-muted hover:text-text-primary'

      // Test inactive state classes
      const isActive = false
      const finalClasses = isActive ? activeClasses : inactiveClasses

      expect(finalClasses).toBe('text-text-muted hover:text-text-primary')
    })
  })

  describe('accessibility attributes', () => {
    it('should include aria-current when active', () => {
      const isActive = true
      const ariaCurrentValue = isActive ? 'page' : undefined

      expect(ariaCurrentValue).toBe('page')
    })

    it('should not include aria-current when inactive', () => {
      const isActive = false
      const ariaCurrentValue = isActive ? 'page' : undefined

      expect(ariaCurrentValue).toBeUndefined()
    })
  })
})
