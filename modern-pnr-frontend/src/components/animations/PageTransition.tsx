import React from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

export interface PageTransitionProps {
  children: React.ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown'
  duration?: number
  delay?: number
}

const pageVariants: Record<string, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  }
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  variant = 'fade',
  duration = 0.3,
  delay = 0
}) => {
  return (
    <motion.div
      variants={pageVariants[variant]}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration,
        delay,
        ease: [0.4, 0.0, 0.2, 1] // Custom easing for smooth transitions
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface AnimatedPageProps {
  children: React.ReactNode
  className?: string
  variant?: PageTransitionProps['variant']
  duration?: number
  delay?: number
}

export const AnimatedPage: React.FC<AnimatedPageProps> = (props) => {
  return (
    <AnimatePresence mode="wait">
      <PageTransition {...props} />
    </AnimatePresence>
  )
}