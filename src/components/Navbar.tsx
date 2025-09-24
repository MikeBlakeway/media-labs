'use client'

import Link from 'next/link'
import { useState } from 'react'
import { NavLink } from './NavLink'
import { DarkModeToggle } from './DarkModeToggle'

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const navigation = [
    { name: 'Home', href: '/', exactMatch: true },
    { name: 'Workflows', href: '/w', exactMatch: false },
    { name: 'Manage', href: '/manage', exactMatch: false },
    { name: 'Register', href: '/register', exactMatch: false },
    { name: 'Admin', href: '/admin', exactMatch: false }
  ]

  return (
    <nav role='navigation' aria-label='Main navigation' className='border-b border-default bg-card'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Brand */}
          <div className='flex items-center'>
            <Link
              href='/'
              className='flex-shrink-0 flex items-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md'
            >
              <h1 className='text-xl font-bold text-primary hover:text-primary-hover transition-colors duration-200'>
                Media Labs
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center space-x-1'>
            {navigation.map(item => (
              <NavLink key={item.name} href={item.href} exactMatch={item.exactMatch}>
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* Desktop Theme Toggle */}
          <div className='hidden md:flex items-center'>
            <DarkModeToggle />
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden flex items-center space-x-2'>
            <DarkModeToggle />
            <button
              type='button'
              onClick={toggleMobileMenu}
              className='inline-flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
              aria-controls='mobile-menu'
              aria-expanded={isMobileMenuOpen}
              aria-label='Toggle navigation menu'
            >
              <span className='sr-only'>Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg
                  className='block h-6 w-6'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' />
                </svg>
              ) : (
                <svg
                  className='block h-6 w-6'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className='md:hidden' id='mobile-menu'>
            <div className='px-2 pt-2 pb-3 space-y-1 border-t border-default'>
              {navigation.map(item => (
                <NavLink
                  key={item.name}
                  href={item.href}
                  exactMatch={item.exactMatch}
                  className='block w-full text-left'
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
