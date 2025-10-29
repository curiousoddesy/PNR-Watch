import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useKeyboardNavigation, useReducedMotion, useId } from '../../hooks/useAccessibility'
import { Button } from './Button'

export interface NavigationItem {
  id: string
  label: string
  href?: string
  onClick?: () => void
  children?: NavigationItem[]
  current?: boolean
  disabled?: boolean
}

export interface NavigationProps {
  items: NavigationItem[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
  'aria-label'?: string
}

export interface SkipLinksProps {
  links: Array<{
    href: string
    label: string
  }>
  className?: string
}

export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <nav aria-label="Skip navigation" className={cn('sr-only focus-within:not-sr-only', className)}>
      <ul className="flex gap-2 p-2 bg-primary text-white">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="skip-link px-3 py-2 bg-primary text-white rounded focus:outline-none focus:ring-2 focus:ring-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Navigation({ 
  items, 
  orientation = 'horizontal', 
  className,
  'aria-label': ariaLabel = 'Main navigation'
}: NavigationProps) {
  const { currentIndex, handleKeyDown, registerElement } = useKeyboardNavigation(orientation)
  const prefersReducedMotion = useReducedMotion()
  const navId = useId('navigation')

  const handleItemKeyDown = (event: React.KeyboardEvent, item: NavigationItem, index: number) => {
    // Handle activation keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (item.onClick) {
        item.onClick()
      } else if (item.href) {
        window.location.href = item.href
      }
      return
    }

    // Handle arrow navigation
    handleKeyDown(event.nativeEvent)
  }

  return (
    <nav
      id={navId}
      aria-label={ariaLabel}
      className={cn('focus-within:outline-none', className)}
      onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
    >
      <ul
        role="menubar"
        aria-orientation={orientation}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1'
        )}
      >
        {items.map((item, index) => (
          <NavigationItem
            key={item.id}
            item={item}
            index={index}
            isActive={index === currentIndex}
            onKeyDown={(event) => handleItemKeyDown(event, item, index)}
            registerElement={registerElement}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </ul>
    </nav>
  )
}

interface NavigationItemProps {
  item: NavigationItem
  index: number
  isActive: boolean
  onKeyDown: (event: React.KeyboardEvent) => void
  registerElement: (element: HTMLElement | null, index: number) => void
  prefersReducedMotion: boolean
}

function NavigationItem({ 
  item, 
  index, 
  isActive, 
  onKeyDown, 
  registerElement,
  prefersReducedMotion
}: NavigationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const itemRef = useRef<HTMLElement>(null)
  const hasChildren = item.children && item.children.length > 0

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    } else if (item.onClick) {
      item.onClick()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (hasChildren) {
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        setIsExpanded(true)
      } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
        event.preventDefault()
        setIsExpanded(false)
      }
    }
    onKeyDown(event)
  }

  const Element = item.href ? 'a' : 'button'

  return (
    <li role="none">
      <Element
        ref={(el) => {
          itemRef.current = el
          registerElement(el, index)
        }}
        role="menuitem"
        href={item.href}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={item.disabled}
        aria-current={item.current ? 'page' : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-haspopup={hasChildren ? 'menu' : undefined}
        tabIndex={isActive ? 0 : -1}
        className={cn(
          'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          item.current
            ? 'bg-primary text-white'
            : 'text-text hover:bg-surface hover:text-text',
          item.disabled && 'pointer-events-none'
        )}
      >
        <span>{item.label}</span>
        {hasChildren && (
          <motion.svg
            className="w-4 h-4 ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            animate={prefersReducedMotion ? {} : { rotate: isExpanded ? 180 : 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.2 }}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        )}
      </Element>

      {/* Submenu */}
      {hasChildren && (
        <motion.ul
          role="menu"
          aria-labelledby={item.id}
          initial={false}
          animate={prefersReducedMotion ? {} : {
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0
          }}
          transition={prefersReducedMotion ? {} : { duration: 0.2 }}
          className={cn(
            'ml-4 mt-1 space-y-1 overflow-hidden',
            !isExpanded && 'hidden'
          )}
        >
          {item.children?.map((child) => (
            <li key={child.id} role="none">
              <Element
                role="menuitem"
                href={child.href}
                onClick={child.onClick}
                disabled={child.disabled}
                aria-current={child.current ? 'page' : undefined}
                className={cn(
                  'block px-3 py-2 text-sm rounded-md transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  child.current
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                )}
              >
                {child.label}
              </Element>
            </li>
          ))}
        </motion.ul>
      )}
    </li>
  )
}

export interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string
    current?: boolean
  }>
  separator?: React.ReactNode
  className?: string
}

export function Breadcrumb({ items, separator = '/', className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-text-secondary" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.current ? (
              <span
                aria-current="page"
                className="font-medium text-text"
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-text-secondary hover:text-text transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export interface TabsProps {
  tabs: Array<{
    id: string
    label: string
    content: React.ReactNode
    disabled?: boolean
  }>
  defaultTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, defaultTab, onTabChange, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const { currentIndex, handleKeyDown, registerElement } = useKeyboardNavigation('horizontal')
  const tabsId = useId('tabs')
  const prefersReducedMotion = useReducedMotion()

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }

  const handleTabKeyDown = (event: React.KeyboardEvent, tabId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleTabClick(tabId)
    } else {
      handleKeyDown(event.nativeEvent)
    }
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label="Content tabs"
        className="flex border-b border-border"
        onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => registerElement(el, index)}
            role="tab"
            id={`${tabsId}-tab-${tab.id}`}
            aria-controls={`${tabsId}-panel-${tab.id}`}
            aria-selected={tab.id === activeTab}
            tabIndex={tab.id === activeTab ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              tab.id === activeTab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${tabsId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className="py-4 focus:outline-none"
          tabIndex={0}
        >
          {tab.id === activeTab && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? {} : { duration: 0.2 }}
            >
              {tab.content}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}