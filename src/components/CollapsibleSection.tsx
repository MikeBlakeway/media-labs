'use client'

import { useState, useRef, useId, KeyboardEvent, ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
  summaryText?: string
  className?: string
}

/**
 * Accessible collapsible section component with keyboard navigation
 * and screen reader support. Follows ARIA guidelines for disclosure widgets.
 */
export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  summaryText,
  className = ''
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  const buttonId = useId()
  const contentId = useId()

  const handleToggle = () => {
    setIsExpanded(prev => {
      const newExpanded = !prev

      // Focus management: when expanding, focus the first focusable element inside
      if (newExpanded && contentRef.current) {
        // Use requestAnimationFrame to ensure content is rendered before focusing
        requestAnimationFrame(() => {
          const firstFocusable = contentRef.current?.querySelector(
            'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement

          if (firstFocusable) {
            firstFocusable.focus()
          }
        })
      }

      return newExpanded
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // Handle Enter and Space key activation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  return (
    <div className={`rounded-lg border border-default bg-card ${className}`}>
      {/* Toggle Button */}
      <button
        id={buttonId}
        type='button'
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={`
          w-full px-4 py-3 text-left transition-colors duration-200
          hover:bg-gray-50 dark:hover:bg-slate-800/50
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
          flex items-center justify-between
          ${isExpanded ? 'border-b border-default' : ''}
        `}
      >
        <div className='flex items-center gap-3'>
          {/* Chevron Icon */}
          <svg
            className={`
              w-4 h-4 transition-transform duration-200 text-gray-500 dark:text-gray-400
              ${isExpanded ? 'rotate-90' : 'rotate-0'}
            `}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>

          {/* Title */}
          <span className='font-medium text-primary'>{title}</span>

          {/* Summary Badge */}
          {summaryText && !isExpanded && (
            <span className='ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full'>
              {summaryText}
            </span>
          )}
        </div>

        {/* Screen reader text */}
        <span className='sr-only'>{isExpanded ? 'Collapse section' : 'Expand section'}</span>
      </button>

      {/* Collapsible Content */}
      <div
        id={contentId}
        ref={contentRef}
        role='region'
        aria-labelledby={buttonId}
        className={`
          transition-all duration-200 ease-in-out overflow-hidden
          ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        style={{
          // Provide reduced motion fallback
          ...(window.matchMedia('(prefers-reduced-motion: reduce)').matches && {
            transition: 'none'
          })
        }}
      >
        <div className='p-4 space-y-4'>{children}</div>
      </div>
    </div>
  )
}
