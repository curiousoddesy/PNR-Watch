import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useReducedMotion } from '../../hooks/useAccessibility'
import type { AriaAttributes } from '../../utils/accessibility'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  loadingText?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

const buttonVariants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
  secondary: 'bg-secondary-100 hover:bg-secondary-200 text-secondary-900 dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:text-secondary-100',
  outline: 'border border-secondary-300 hover:bg-secondary-50 text-secondary-700 dark:border-secondary-600 dark:hover:bg-secondary-800 dark:text-secondary-300',
  ghost: 'hover:bg-secondary-100 text-secondary-700 dark:hover:bg-secondary-800 dark:text-secondary-300',
  destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
}

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-6 py-3 text-base font-medium',
  xl: 'px-8 py-4 text-lg font-semibold',
}

const LoadingSpinner = ({ size }: { size: ButtonProps['size'] }) => {
  const prefersReducedMotion = useReducedMotion()
  
  const spinnerSize = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size || 'md']

  return (
    <motion.div
      animate={prefersReducedMotion ? {} : { rotate: 360 }}
      transition={prefersReducedMotion ? {} : { duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn('border-2 border-current border-t-transparent rounded-full', spinnerSize)}
      aria-hidden="true"
    />
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    disabled = false, 
    children, 
    className,
    loadingText,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading
    const prefersReducedMotion = useReducedMotion()

    // Determine accessible label
    const accessibleLabel = loading && loadingText ? loadingText : ariaLabel

    return (
      <motion.button
        ref={ref}
        whileHover={!isDisabled && !prefersReducedMotion ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.98 } : undefined}
        transition={prefersReducedMotion ? {} : { type: 'spring', stiffness: 400, damping: 17 }}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={accessibleLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'high-contrast:border-2 high-contrast:border-current',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        {...props}
      >
        {loading && <LoadingSpinner size={size} />}
        <span className={loading ? 'sr-only' : undefined}>
          {children}
        </span>
        {loading && loadingText && (
          <span aria-live="polite" className="sr-only">
            {loadingText}
          </span>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'