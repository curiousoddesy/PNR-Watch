import React from 'react'
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface MicroInteractionProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  variant?: 'hover' | 'tap' | 'focus' | 'pulse' | 'bounce' | 'shake' | 'glow'
  intensity?: 'subtle' | 'normal' | 'strong'
  disabled?: boolean
}

const microInteractionVariants: Record<string, Record<string, Variants>> = {
  hover: {
    subtle: {
      rest: { scale: 1 },
      hover: { scale: 1.01 }
    },
    normal: {
      rest: { scale: 1 },
      hover: { scale: 1.02 }
    },
    strong: {
      rest: { scale: 1 },
      hover: { scale: 1.05 }
    }
  },
  tap: {
    subtle: {
      rest: { scale: 1 },
      tap: { scale: 0.99 }
    },
    normal: {
      rest: { scale: 1 },
      tap: { scale: 0.98 }
    },
    strong: {
      rest: { scale: 1 },
      tap: { scale: 0.95 }
    }
  },
  focus: {
    subtle: {
      rest: { boxShadow: '0 0 0 0px rgba(59, 130, 246, 0)' },
      focus: { boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)' }
    },
    normal: {
      rest: { boxShadow: '0 0 0 0px rgba(59, 130, 246, 0)' },
      focus: { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.4)' }
    },
    strong: {
      rest: { boxShadow: '0 0 0 0px rgba(59, 130, 246, 0)' },
      focus: { boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)' }
    }
  },
  pulse: {
    subtle: {
      rest: { scale: 1 },
      animate: { scale: [1, 1.01, 1] }
    },
    normal: {
      rest: { scale: 1 },
      animate: { scale: [1, 1.02, 1] }
    },
    strong: {
      rest: { scale: 1 },
      animate: { scale: [1, 1.05, 1] }
    }
  },
  bounce: {
    subtle: {
      rest: { y: 0 },
      animate: { y: [0, -2, 0] }
    },
    normal: {
      rest: { y: 0 },
      animate: { y: [0, -4, 0] }
    },
    strong: {
      rest: { y: 0 },
      animate: { y: [0, -8, 0] }
    }
  },
  shake: {
    subtle: {
      rest: { x: 0 },
      animate: { x: [-1, 1, -1, 1, 0] }
    },
    normal: {
      rest: { x: 0 },
      animate: { x: [-2, 2, -2, 2, 0] }
    },
    strong: {
      rest: { x: 0 },
      animate: { x: [-4, 4, -4, 4, 0] }
    }
  },
  glow: {
    subtle: {
      rest: { filter: 'drop-shadow(0 0 0px rgba(59, 130, 246, 0))' },
      animate: { filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))' }
    },
    normal: {
      rest: { filter: 'drop-shadow(0 0 0px rgba(59, 130, 246, 0))' },
      animate: { filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' }
    },
    strong: {
      rest: { filter: 'drop-shadow(0 0 0px rgba(59, 130, 246, 0))' },
      animate: { filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5))' }
    }
  }
}

const getTransition = (variant: string, intensity: string) => {
  const baseTransition = { type: 'spring', stiffness: 400, damping: 17 }
  
  switch (variant) {
    case 'pulse':
    case 'bounce':
      return {
        duration: intensity === 'subtle' ? 0.8 : intensity === 'normal' ? 1 : 1.2,
        repeat: Infinity,
        repeatType: 'loop' as const,
        ease: 'easeInOut'
      }
    case 'shake':
      return {
        duration: 0.5,
        ease: 'easeInOut'
      }
    case 'glow':
      return {
        duration: 1.5,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        ease: 'easeInOut'
      }
    default:
      return baseTransition
  }
}

export const MicroInteraction: React.FC<MicroInteractionProps> = ({
  children,
  variant = 'hover',
  intensity = 'normal',
  disabled = false,
  className,
  ...props
}) => {
  const variants = microInteractionVariants[variant]?.[intensity]
  const transition = getTransition(variant, intensity)

  if (disabled || !variants) {
    return <div className={className} {...props}>{children}</div>
  }

  const motionProps: any = {
    variants,
    initial: 'rest',
    transition
  }

  // Add appropriate triggers based on variant
  switch (variant) {
    case 'hover':
      motionProps.whileHover = 'hover'
      break
    case 'tap':
      motionProps.whileTap = 'tap'
      break
    case 'focus':
      motionProps.whileFocus = 'focus'
      break
    case 'pulse':
    case 'bounce':
    case 'shake':
    case 'glow':
      motionProps.animate = 'animate'
      break
  }

  return (
    <motion.div
      className={className}
      {...motionProps}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Specialized components for common use cases
export const HoverScale: React.FC<Omit<MicroInteractionProps, 'variant'>> = (props) => (
  <MicroInteraction variant="hover" {...props} />
)

export const TapScale: React.FC<Omit<MicroInteractionProps, 'variant'>> = (props) => (
  <MicroInteraction variant="tap" {...props} />
)

export const PulseAnimation: React.FC<Omit<MicroInteractionProps, 'variant'>> = (props) => (
  <MicroInteraction variant="pulse" {...props} />
)

export const BounceAnimation: React.FC<Omit<MicroInteractionProps, 'variant'>> = (props) => (
  <MicroInteraction variant="bounce" {...props} />
)