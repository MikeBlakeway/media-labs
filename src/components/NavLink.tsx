'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
  exactMatch?: boolean
}

export function NavLink({ href, children, className = '', exactMatch = false }: NavLinkProps) {
  const pathname = usePathname()

  // Determine if this link is active
  const isActive = exactMatch ? pathname === href : pathname.startsWith(href)

  const baseClasses =
    'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
  const activeClasses = isActive ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary'

  return (
    <Link
      href={href}
      className={`${baseClasses} ${activeClasses} ${className}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
