import React, { useRef } from 'react'
import { motion, useDragControls, type PanInfo } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface SwipeGestureProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  className?: string
  disabled?: boolean
}

export const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
  disabled = false
}) => {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return

    const { offset } = info
    const absX = Math.abs(offset.x)
    const absY = Math.abs(offset.y)

    // Determine if swipe is more horizontal or vertical
    if (absX > absY) {
      // Horizontal swipe
      if (absX > threshold) {
        if (offset.x > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (offset.x < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    } else {
      // Vertical swipe
      if (absY > threshold) {
        if (offset.y > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (offset.y < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    }
  }

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className={cn('cursor-grab active:cursor-grabbing', className)}
      whileDrag={{ scale: 1.02 }}
    >
      {children}
    </motion.div>
  )
}

export interface LongPressGestureProps {
  children: React.ReactNode
  onLongPress?: () => void
  duration?: number
  className?: string
  disabled?: boolean
}

export const LongPressGesture: React.FC<LongPressGestureProps> = ({
  children,
  onLongPress,
  duration = 500,
  className,
  disabled = false
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = () => {
    if (disabled || !onLongPress) return
    
    timeoutRef.current = setTimeout(() => {
      onLongPress()
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }, duration)
  }

  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  return (
    <motion.div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      whileTap={{ scale: 0.98 }}
      className={cn('select-none', className)}
    >
      {children}
    </motion.div>
  )
}

export interface PinchZoomGestureProps {
  children: React.ReactNode
  onPinchStart?: () => void
  onPinchEnd?: () => void
  onZoom?: (scale: number) => void
  minScale?: number
  maxScale?: number
  className?: string
  disabled?: boolean
}

export const PinchZoomGesture: React.FC<PinchZoomGestureProps> = ({
  children,
  onPinchStart,
  onPinchEnd,
  onZoom,
  minScale = 0.5,
  maxScale = 3,
  className,
  disabled = false
}) => {
  const [scale, setScale] = React.useState(1)
  const [isZooming, setIsZooming] = React.useState(false)

  const handleWheel = (event: React.WheelEvent) => {
    if (disabled) return
    
    event.preventDefault()
    const delta = event.deltaY * -0.01
    const newScale = Math.min(Math.max(scale + delta, minScale), maxScale)
    
    setScale(newScale)
    onZoom?.(newScale)
  }

  return (
    <motion.div
      onWheel={handleWheel}
      animate={{ scale }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn('origin-center', className)}
      style={{ touchAction: disabled ? 'auto' : 'none' }}
    >
      {children}
    </motion.div>
  )
}

export interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh?: () => Promise<void> | void
  threshold?: number
  className?: string
  disabled?: boolean
  refreshIndicator?: React.ReactNode
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  className,
  disabled = false,
  refreshIndicator
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [canRefresh, setCanRefresh] = React.useState(false)

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || isRefreshing) return

    const distance = Math.max(0, info.offset.y)
    setPullDistance(distance)
    setCanRefresh(distance >= threshold)
  }

  const handleDragEnd = async () => {
    if (disabled || isRefreshing || !canRefresh || !onRefresh) {
      setPullDistance(0)
      setCanRefresh(false)
      return
    }

    setIsRefreshing(true)
    
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
      setCanRefresh(false)
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Refresh indicator */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ 
          y: pullDistance > 0 ? Math.min(pullDistance - 60, 0) : -60,
          opacity: pullDistance > 20 ? 1 : 0
        }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center h-16 z-10"
      >
        {refreshIndicator || (
          <div className="flex items-center space-x-2 text-sm text-secondary-600">
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
              className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full"
            />
            <span>
              {isRefreshing ? 'Refreshing...' : canRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ y: isRefreshing ? 60 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Haptic feedback utility
export const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 50,
      heavy: 100
    }
    navigator.vibrate(patterns[type])
  }
}