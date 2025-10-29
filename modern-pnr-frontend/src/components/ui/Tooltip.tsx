import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
  className?: string
}

export interface PopoverProps {
  content: React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'click' | 'hover'
  closeOnClickOutside?: boolean
  disabled?: boolean
  className?: string
}

const tooltipVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

const popoverVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

const getTooltipPosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right'
) => {
  const spacing = 8
  let top = 0
  let left = 0

  switch (placement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - spacing
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'bottom':
      top = triggerRect.bottom + spacing
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.left - tooltipRect.width - spacing
      break
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.right + spacing
      break
  }

  // Keep tooltip within viewport
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  if (left < 0) left = spacing
  if (left + tooltipRect.width > viewport.width) {
    left = viewport.width - tooltipRect.width - spacing
  }
  if (top < 0) top = spacing
  if (top + tooltipRect.height > viewport.height) {
    top = viewport.height - tooltipRect.height - spacing
  }

  return { top, left }
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 500,
  disabled = false,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const newPosition = getTooltipPosition(triggerRect, tooltipRect, placement)
      setPosition(newPosition)
    }
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, placement])

  const handleMouseEnter = () => {
    if (disabled) return
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={tooltipRef}
              variants={tooltipVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.15 }}
              className={cn(
                'fixed z-50 px-2 py-1 text-sm text-white bg-secondary-900 dark:bg-secondary-100 dark:text-secondary-900 rounded shadow-lg pointer-events-none',
                className
              )}
              style={{
                top: position.top,
                left: position.left,
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export const Popover: React.FC<PopoverProps> = ({
  content,
  children,
  placement = 'bottom',
  trigger = 'click',
  closeOnClickOutside = true,
  disabled = false,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    if (triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const newPosition = getTooltipPosition(triggerRect, popoverRect, placement)
      setPosition(newPosition)
    }
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, placement])

  useEffect(() => {
    if (!closeOnClickOutside || !isVisible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        popoverRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVisible, closeOnClickOutside])

  const handleTrigger = () => {
    if (disabled) return
    
    if (trigger === 'click') {
      setIsVisible(!isVisible)
    }
  }

  const handleMouseEnter = () => {
    if (disabled || trigger !== 'hover') return
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    if (disabled || trigger !== 'hover') return
    setIsVisible(false)
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={popoverRef}
              variants={popoverVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className={cn(
                'fixed z-50 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg',
                className
              )}
              style={{
                top: position.top,
                left: position.left,
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}