import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: 'default' | 'overlay'
  size?: 'sm' | 'md'
}

const SIZE = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
}

const VARIANT = {
  default: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  overlay: 'text-ink bg-surface/80 backdrop-blur-md hover:bg-surface',
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', variant = 'default', className, children, disabled, ...rest }, ref) => {
    const reduced = useReducedMotion()
    return (
      <motion.button
        ref={ref}
        whileTap={reduced || disabled ? undefined : { scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 700, damping: 28 }}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-pill transition-colors duration-150',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          SIZE[size],
          VARIANT[variant],
          className,
        )}
        {...(rest as any)}
      >
        {children}
      </motion.button>
    )
  },
)
IconButton.displayName = 'IconButton'
