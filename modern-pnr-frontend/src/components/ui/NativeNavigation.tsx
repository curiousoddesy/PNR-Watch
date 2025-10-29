// Native app-like navigation component

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
  href?: string
  onClick?: () => void
}

interface NativeNavigationProps {
  items: NavigationItem[]
  activeItem?: string
  onItemChange?: (itemId: string) => void
  className?: string
  variant?: 'bottom' | 'side'
  showLabels?: boolean
}

export function NativeNavigation({
  items,
  activeItem,
  onItemChange,
  className,
  variant = 'bottom',
  showLabels = true
}: NativeNavigationProps) {
  const [active, setActive] = useState(activeItem || items[0]?.id)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    if (activeItem) {
      setActive(activeItem)
    }
  }, [activeItem])

  // Auto-hide navigation on scroll (mobile behavior)
  useEffect(() => {
    if (variant !== 'bottom') return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, variant])

  const handleItemClick = (item: NavigationItem) => {
    setActive(item.id)
    onItemChange?.(item.id)
    
    if (item.onClick) {
      item.onClick()
    } else if (item.href) {
      window.location.href = item.href
    }
  }

  if (variant === 'bottom') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-40',
              'bg-white/95 backdrop-blur-lg border-t border-gray-200',
              'safe-area-inset-bottom',
              className
            )}
          >
            <div className="flex items-center justify-around px-2 py-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200',
                    'min-w-[60px] relative',
                    active === item.id
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {/* Icon Container */}
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: active === item.id ? 1.1 : 1,
                      }}
                      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                      className="w-6 h-6"
                    >
                      {item.icon}
                    </motion.div>
                    
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Label */}
                  {showLabels && (
                    <motion.span
                      animate={{
                        opacity: active === item.id ? 1 : 0.7,
                        fontWeight: active === item.id ? 600 : 400,
                      }}
                      className="text-xs leading-none"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  
                  {/* Active Indicator */}
                  {active === item.id && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -top-1 left-1/2 w-1 h-1 bg-blue-600 rounded-full"
                      style={{ x: '-50%' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    )
  }

  // Side navigation variant
  return (
    <motion.nav
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 w-16',
        'bg-white/95 backdrop-blur-lg border-r border-gray-200',
        'flex flex-col items-center py-4',
        className
      )}
    >
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200',
              'relative group',
              active === item.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {/* Icon */}
            <div className="relative">
              <motion.div
                animate={{
                  scale: active === item.id ? 1.1 : 1,
                }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="w-6 h-6"
              >
                {item.icon}
              </motion.div>
              
              {/* Badge */}
              {item.badge && item.badge > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </motion.div>
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {item.label}
            </div>
            
            {/* Active Indicator */}
            {active === item.id && (
              <motion.div
                layoutId="sideActiveIndicator"
                className="absolute left-0 top-1/2 w-1 h-8 bg-blue-600 rounded-r"
                style={{ y: '-50%' }}
              />
            )}
          </button>
        ))}
      </div>
    </motion.nav>
  )
}

// Gesture-based navigation component
export function GestureNavigation({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  children,
  className
}: {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  children: React.ReactNode
  className?: string
}) {
  const [startTouch, setStartTouch] = useState<{ x: number; y: number } | null>(null)
  const [currentTouch, setCurrentTouch] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setStartTouch({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startTouch) return
    
    const touch = e.touches[0]
    setCurrentTouch({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = () => {
    if (!startTouch || !currentTouch) {
      setStartTouch(null)
      setCurrentTouch(null)
      return
    }

    const deltaX = currentTouch.x - startTouch.x
    const deltaY = currentTouch.y - startTouch.y
    const minSwipeDistance = 50

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
    }

    setStartTouch(null)
    setCurrentTouch(null)
  }

  return (
    <div
      className={cn('touch-pan-y', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

// Pull-to-refresh component
export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80
}: {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  threshold?: number
}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY)
    
    if (distance > 0) {
      e.preventDefault()
      setPullDistance(Math.min(distance, threshold * 1.5))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
  }

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              height: Math.max(pullDistance * 0.5, 40)
            }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 z-10"
          >
            <div className="flex items-center gap-2 text-blue-600">
              <motion.div
                animate={{ 
                  rotate: isRefreshing ? 360 : pullProgress * 180,
                  scale: Math.max(pullProgress, 0.5)
                }}
                transition={{ 
                  rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }
                }}
                className="w-5 h-5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-full h-full"
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              </motion.div>
              <span className="text-sm font-medium">
                {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        animate={{ 
          y: pullDistance * 0.5,
          transition: { type: 'spring', damping: 20, stiffness: 300 }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}