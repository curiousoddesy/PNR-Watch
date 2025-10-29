import React, { useMemo, useCallback } from 'react'
import { motion, useTransform, useMotionValue, useSpring, type MotionValue } from 'framer-motion'
import { cn } from '../../utils/cn'

// GPU-accelerated transform properties
const GPU_PROPERTIES = ['transform', 'opacity', 'filter']

export interface GPUAnimationProps {
  children: React.ReactNode
  className?: string
  animate?: any
  transition?: any
  style?: React.CSSProperties
}

export const GPUAnimation: React.FC<GPUAnimationProps> = ({
  children,
  className,
  animate,
  transition,
  style,
  ...props
}) => {
  // Force GPU acceleration by adding transform3d
  const optimizedStyle = useMemo(() => ({
    ...style,
    transform: style?.transform ? `${style.transform} translateZ(0)` : 'translateZ(0)',
    willChange: 'transform, opacity'
  }), [style])

  return (
    <motion.div
      className={className}
      animate={animate}
      transition={transition}
      style={optimizedStyle}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export interface VirtualizedListProps {
  items: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  itemHeight: number
  containerHeight: number
  className?: string
}

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className
}) => {
  const scrollY = useMotionValue(0)
  const visibleItems = Math.ceil(containerHeight / itemHeight) + 2
  
  const startIndex = useTransform(
    scrollY,
    (value) => Math.max(0, Math.floor(value / itemHeight))
  )
  
  const endIndex = useTransform(
    startIndex,
    (value) => Math.min(items.length, value + visibleItems)
  )

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollY.set(e.currentTarget.scrollTop)
  }, [scrollY])

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {items.slice(
          Math.max(0, Math.floor(scrollY.get() / itemHeight)),
          Math.min(items.length, Math.floor(scrollY.get() / itemHeight) + visibleItems)
        ).map((item, index) => {
          const actualIndex = Math.floor(scrollY.get() / itemHeight) + index
          return (
            <motion.div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%',
                willChange: 'transform'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {renderItem(item, actualIndex)}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export interface OptimizedScrollProps {
  children: React.ReactNode
  onScroll?: (scrollY: number) => void
  className?: string
}

export const OptimizedScroll: React.FC<OptimizedScrollProps> = ({
  children,
  onScroll,
  className
}) => {
  const scrollY = useMotionValue(0)
  const smoothScrollY = useSpring(scrollY, { stiffness: 100, damping: 20 })

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollY = e.currentTarget.scrollTop
    scrollY.set(newScrollY)
    onScroll?.(newScrollY)
  }, [scrollY, onScroll])

  return (
    <motion.div
      className={cn('overflow-auto', className)}
      onScroll={handleScroll}
      style={{ willChange: 'scroll-position' }}
    >
      {children}
    </motion.div>
  )
}

export interface LazyAnimationProps {
  children: React.ReactNode
  threshold?: number
  className?: string
  animation?: any
}

export const LazyAnimation: React.FC<LazyAnimationProps> = ({
  children,
  threshold = 0.1,
  className,
  animation = { opacity: [0, 1], y: [20, 0] }
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return (
    <motion.div
      ref={ref}
      className={className}
      animate={isVisible ? animation : undefined}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ willChange: isVisible ? 'transform, opacity' : 'auto' }}
    >
      {children}
    </motion.div>
  )
}

// Optimized particle system
export interface ParticleSystemProps {
  particleCount?: number
  className?: string
  particleClassName?: string
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  particleCount = 50,
  className,
  particleClassName
}) => {
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 3 + 2
    }))
  }, [particleCount])

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={cn('absolute rounded-full bg-current opacity-20', particleClassName)}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            willChange: 'transform'
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.5, 0]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 2
          }}
        />
      ))}
    </div>
  )
}

// Memory-efficient animation hook
export const useOptimizedAnimation = (
  trigger: boolean,
  animation: any,
  dependencies: any[] = []
) => {
  const memoizedAnimation = useMemo(() => animation, dependencies)
  
  return trigger ? memoizedAnimation : undefined
}

// Reduced motion support
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

export interface AccessibleAnimationProps {
  children: React.ReactNode
  animation?: any
  reducedAnimation?: any
  className?: string
}

export const AccessibleAnimation: React.FC<AccessibleAnimationProps> = ({
  children,
  animation,
  reducedAnimation,
  className
}) => {
  const prefersReducedMotion = useReducedMotion()
  
  const finalAnimation = prefersReducedMotion 
    ? (reducedAnimation || { opacity: [0, 1] })
    : animation

  return (
    <motion.div
      animate={finalAnimation}
      className={className}
      transition={{ duration: prefersReducedMotion ? 0.1 : 0.6 }}
    >
      {children}
    </motion.div>
  )
}

// Performance monitoring hook
export const useAnimationPerformance = () => {
  const [fps, setFps] = React.useState(60)
  const frameCount = React.useRef(0)
  const lastTime = React.useRef(performance.now())

  React.useEffect(() => {
    let animationId: number

    const measureFPS = () => {
      frameCount.current++
      const currentTime = performance.now()
      
      if (currentTime - lastTime.current >= 1000) {
        setFps(frameCount.current)
        frameCount.current = 0
        lastTime.current = currentTime
      }
      
      animationId = requestAnimationFrame(measureFPS)
    }

    animationId = requestAnimationFrame(measureFPS)
    
    return () => cancelAnimationFrame(animationId)
  }, [])

  return { fps, isPerformant: fps >= 55 }
}