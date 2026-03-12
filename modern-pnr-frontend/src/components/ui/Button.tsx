import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useReducedMotion } from '../../hooks/useAccessibility'

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
  primary: [
    'bg-brand text-white',
    'shadow-[0_4px_16px_rgba(0,122,255,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]',
    'hover:shadow-[0_6px_24px_rgba(0,122,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]',
    'hover:brightness-110',
  ].join(' '),
  secondary: [
    'glass-button text-ink',
  ].join(' '),
  outline: [
    'bg-transparent text-ink',
    'border border-ink/[0.08]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
    'hover:bg-ink/[0.04] hover:border-ink/[0.12]',
    'dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    'dark:hover:bg-white/[0.04]',
  ].join(' '),
  ghost: [
    'bg-transparent text-ink-muted',
    'hover:bg-ink/[0.04] hover:text-ink',
    'dark:hover:bg-white/[0.06]',
  ].join(' '),
  destructive: [
    'bg-[#FF3B30] text-white',
    'shadow-[0_4px_16px_rgba(255,59,48,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]',
    'hover:shadow-[0_6px_24px_rgba(255,59,48,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]',
    'hover:brightness-110',
  ].join(' '),
}

const buttonSizes = {
  sm: 'h-8 px-3 text-[12px] font-medium rounded-lg',
  md: 'h-9 px-4 text-[13px] font-semibold rounded-xl',
  lg: 'h-10 px-5 text-[14px] font-semibold rounded-xl',
  xl: 'h-12 px-6 text-[15px] font-semibold rounded-2xl',
}

const LoadingSpinner = ({ size }: { size: ButtonProps['size'] }) => {
  const prefersReducedMotion = useReducedMotion()

  const spinnerSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-4 h-4',
  }[size || 'md']

  return (
    <motion.div
      animate={prefersReducedMotion ? {} : { rotate: 360 }}
      transition={prefersReducedMotion ? {} : { duration: 0.8, repeat: Infinity, ease: 'linear' }}
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

    const accessibleLabel = loading && loadingText ? loadingText : ariaLabel

    return (
      <motion.button
        ref={ref}
        whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.96 } : undefined}
        transition={prefersReducedMotion ? {} : { type: 'spring', stiffness: 400, damping: 20 }}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={accessibleLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ground',
          'disabled:pointer-events-none disabled:opacity-40',
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
