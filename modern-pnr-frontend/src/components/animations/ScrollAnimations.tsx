import React, { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, useInView, type Variants } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface ScrollRevealProps {
  children: React.ReactNode
  variant?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'rotate'
  delay?: number
  duration?: number
  threshold?: number
  triggerOnce?: boolean
  className?: string
}

const scrollVariants: Record<string, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  slideUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  },
  slideDown: {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
  },
  slideRight: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  },
  rotate: {
    hidden: { opacity: 0, rotate: -10 },
    visible: { opacity: 1, rotate: 0 }
  }
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  variant = 'fadeIn',
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  triggerOnce = true,
  className
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: triggerOnce,
    margin: `-${(1 - threshold) * 100}% 0px`
  })

  return (
    <motion.div
      ref={ref}
      variants={scrollVariants[variant]}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{
        duration,
        delay,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface ParallaxProps {
  children: React.ReactNode
  speed?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}

export const Parallax: React.FC<ParallaxProps> = ({
  children,
  speed = 0.5,
  direction = 'up',
  className
}) => {
  const [scrollY, setScrollY] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const scrolled = window.scrollY
        const rate = scrolled * speed
        setScrollY(rate)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  const getTransform = () => {
    switch (direction) {
      case 'up':
        return `translateY(-${scrollY}px)`
      case 'down':
        return `translateY(${scrollY}px)`
      case 'left':
        return `translateX(-${scrollY}px)`
      case 'right':
        return `translateX(${scrollY}px)`
      default:
        return `translateY(-${scrollY}px)`
    }
  }

  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div
        style={{ transform: getTransform() }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export interface SmoothScrollProps {
  children: React.ReactNode
  speed?: number
  className?: string
}

export const SmoothScroll: React.FC<SmoothScrollProps> = ({
  children,
  speed = 1,
  className
}) => {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let ticking = false

    const updateScrollY = () => {
      setScrollY(window.scrollY)
      ticking = false
    }

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollY)
        ticking = true
      }
    }

    const handleScroll = () => requestTick()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.div
      className={className}
      animate={{ y: -scrollY * speed }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      {children}
    </motion.div>
  )
}

export interface ScrollProgressProps {
  className?: string
  color?: string
  height?: number
}

export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  className,
  color = '#3b82f6',
  height = 4
}) => {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollPx = document.documentElement.scrollTop
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const scrolled = scrollPx / winHeightPx
      setScrollProgress(scrolled)
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollProgress)
  }, [])

  return (
    <motion.div
      className={cn('fixed top-0 left-0 right-0 z-50 origin-left', className)}
      style={{
        height: `${height}px`,
        backgroundColor: color,
        scaleX: scrollProgress
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: scrollProgress }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    />
  )
}

// Hook for scroll-triggered animations
export const useScrollAnimation = (threshold = 0.1, triggerOnce = true) => {
  const ref = useRef(null)
  const controls = useAnimation()
  const isInView = useInView(ref, { 
    once: triggerOnce,
    margin: `-${(1 - threshold) * 100}% 0px`
  })

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else {
      controls.start('hidden')
    }
  }, [isInView, controls])

  return { ref, controls, isInView }
}

// Staggered children animation
export interface StaggeredAnimationProps {
  children: React.ReactNode
  staggerDelay?: number
  variant?: keyof typeof scrollVariants
  className?: string
}

export const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({
  children,
  staggerDelay = 0.1,
  variant = 'slideUp',
  className
}) => {
  const { ref, controls } = useScrollAnimation()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={controls}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={scrollVariants[variant]}
          transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}