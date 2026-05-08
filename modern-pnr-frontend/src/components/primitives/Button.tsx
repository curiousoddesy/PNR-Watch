import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'md' | 'lg'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:opacity-90 disabled:opacity-30',
  secondary: 'bg-surface-2 text-ink hover:bg-rule disabled:opacity-40',
  ghost: 'bg-transparent text-ink hover:bg-surface-2 disabled:opacity-40',
  destructive: 'bg-danger text-white hover:opacity-90 disabled:opacity-40',
}

const SIZE: Record<Size, string> = {
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-13 px-6 text-[15px]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leading, trailing, fullWidth, className, children, disabled, ...rest }, ref) => {
    const reduced = useReducedMotion()
    return (
      <motion.button
        ref={ref}
        whileTap={reduced || disabled || loading ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-tight',
          'transition-colors duration-150 disabled:cursor-not-allowed select-none',
          VARIANT[variant],
          SIZE[size],
          fullWidth && 'w-full',
          className,
        )}
        {...(rest as any)}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="opacity-80">Loading…</span>
          </span>
        ) : (
          <>
            {leading}
            <span>{children}</span>
            {trailing}
          </>
        )}
      </motion.button>
    )
  },
)
Button.displayName = 'Button'
