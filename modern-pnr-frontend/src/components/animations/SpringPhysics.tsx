import React from 'react'
import { motion, useSpring, useTransform, type SpringOptions } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface SpringAnimationProps {
  children: React.ReactNode
  trigger?: boolean
  springConfig?: SpringOptions
  className?: string
  from?: number
  to?: number
}

// Predefined spring configurations for different use cases
export const springConfigs = {
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 400, damping: 30, mass: 1 },
  slow: { stiffness: 280, damping: 60, mass: 1 },
  bouncy: { stiffness: 300, damping: 8, mass: 1 },
  elastic: { stiffness: 200, damping: 5, mass: 0.8 }
}

export const SpringAnimation: React.FC<SpringAnimationProps> = ({
  children,
  trigger = false,
  springConfig = springConfigs.gentle,
  className,
  from = 0,
  to = 1
}) => {
  const springValue = useSpring(trigger ? to : from, springConfig)

  return (
    <motion.div
      style={{ scale: springValue }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface FloatingElementProps {
  children: React.ReactNode
  intensity?: 'subtle' | 'normal' | 'strong'
  direction?: 'vertical' | 'horizontal' | 'both'
  className?: string
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  intensity = 'normal',
  direction = 'vertical',
  className
}) => {
  const intensityMap = {
    subtle: { range: 5, duration: 3 },
    normal: { range: 10, duration: 2.5 },
    strong: { range: 15, duration: 2 }
  }

  const { range, duration } = intensityMap[intensity]

  const getAnimationProps = () => {
    switch (direction) {
      case 'vertical':
        return {
          y: [-range, range, -range],
          transition: {
            duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }
      case 'horizontal':
        return {
          x: [-range, range, -range],
          transition: {
            duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }
      case 'both':
        return {
          x: [-range/2, range/2, -range/2],
          y: [-range, range, -range],
          transition: {
            duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }
      default:
        return {}
    }
  }

  return (
    <motion.div
      animate={getAnimationProps()}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface ElasticScaleProps {
  children: React.ReactNode
  trigger?: boolean
  scale?: number
  className?: string
}

export const ElasticScale: React.FC<ElasticScaleProps> = ({
  children,
  trigger = false,
  scale = 1.1,
  className
}) => {
  return (
    <motion.div
      animate={{ scale: trigger ? scale : 1 }}
      transition={springConfigs.elastic}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface BouncyButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export const BouncyButton: React.FC<BouncyButtonProps> = ({
  children,
  onClick,
  className,
  disabled = false
}) => {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={springConfigs.bouncy}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  )
}

export interface WobbleOnHoverProps {
  children: React.ReactNode
  className?: string
}

export const WobbleOnHover: React.FC<WobbleOnHoverProps> = ({
  children,
  className
}) => {
  return (
    <motion.div
      whileHover={{
        rotate: [0, -1, 1, -1, 1, 0],
        transition: { duration: 0.5 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface SpringModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose?: () => void
  className?: string
  overlayClassName?: string
}

export const SpringModal: React.FC<SpringModalProps> = ({
  children,
  isOpen,
  onClose,
  className,
  overlayClassName
}) => {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50',
        overlayClassName
      )}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={springConfigs.wobbly}
        className={cn('bg-white rounded-lg p-6 max-w-md w-full mx-4', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// Hook for spring-based animations
export const useSpringAnimation = (
  initialValue: number = 0,
  config: SpringOptions = springConfigs.gentle
) => {
  const springValue = useSpring(initialValue, config)
  
  const setValue = (newValue: number) => {
    springValue.set(newValue)
  }

  return { value: springValue, setValue }
}

// Performance-optimized spring component
export interface PerformantSpringProps {
  children: React.ReactNode
  value: number
  transform?: (value: number) => any
  className?: string
}

export const PerformantSpring: React.FC<PerformantSpringProps> = ({
  children,
  value,
  transform = (v) => ({ scale: v }),
  className
}) => {
  const springValue = useSpring(value, springConfigs.stiff)
  const transformedValue = useTransform(springValue, transform)

  return (
    <motion.div
      style={transformedValue}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Magnetic attraction effect
export interface MagneticProps {
  children: React.ReactNode
  strength?: number
  className?: string
}

export const Magnetic: React.FC<MagneticProps> = ({
  children,
  strength = 0.3,
  className
}) => {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    setMousePosition({
      x: (e.clientX - centerX) * strength,
      y: (e.clientY - centerY) * strength
    })
  }

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => {
    setIsHovered(false)
    setMousePosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      animate={{
        x: isHovered ? mousePosition.x : 0,
        y: isHovered ? mousePosition.y : 0
      }}
      transition={springConfigs.gentle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}