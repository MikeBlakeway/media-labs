'use client'

import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const primaryLinks = [
    { name: 'Home', href: '/' },
    { name: 'Workflows', href: '/w' },
    { name: 'Manage', href: '/manage' }
  ]

  const secondaryLinks = [
    { name: 'Admin', href: '/admin' },
    { name: 'Debug', href: '/debug' },
    { name: 'Volume Test', href: '/volume-test' }
  ]

  return (
    <footer className='bg-card border-t border-default mt-auto'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {/* Brand and Description */}
          <div className='space-y-4'>
            <Link
              href='/'
              className='inline-block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md'
            >
              <h2 className='text-lg font-bold text-primary hover:text-primary-hover transition-colors duration-200'>
                Media Labs
              </h2>
            </Link>
            <p className='text-sm text-text-muted leading-relaxed'>
              AI-powered media generation using RunPod ComfyUI serverless endpoints. Create high-quality images and
              videos with advanced AI models.
            </p>
          </div>

          {/* Primary Navigation */}
          <div className='space-y-4'>
            <h3 className='text-sm font-semibold text-text-primary uppercase tracking-wider'>Navigation</h3>
            <nav className='space-y-2' aria-label='Footer navigation'>
              {primaryLinks.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className='block text-sm text-text-muted hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded'
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Secondary Links */}
          <div className='space-y-4'>
            <h3 className='text-sm font-semibold text-text-primary uppercase tracking-wider'>Tools</h3>
            <nav className='space-y-2' aria-label='Footer tools navigation'>
              {secondaryLinks.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className='block text-sm text-text-muted hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded'
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='mt-8 pt-8 border-t border-default'>
          <div className='flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'>
            <p className='text-sm text-text-muted'>© {currentYear} Media Labs. Built with Next.js and RunPod.</p>
            <div className='flex items-center space-x-6'>
              <span className='text-xs text-text-muted'>v1.0.0</span>
              <Link
                href='/docs'
                className='text-xs text-text-muted hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded'
              >
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
