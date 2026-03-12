import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  children: React.ReactNode
}

const cardVariants = {
  default: 'glass',
  elevated: 'glass-heavy',
  outlined: [
    'bg-transparent',
    'border border-ink/[0.06] dark:border-white/[0.06]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
    'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  ].join(' '),
  ghost: 'bg-transparent',
}

const cardPadding = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    hoverable = false,
    children,
    className,
    ...props
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverable ? { scale: 1.01, y: -2 } : undefined}
        whileTap={hoverable ? { scale: 0.98 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(
          'rounded-3xl relative overflow-hidden transition-all',
          cardVariants[variant],
          cardPadding[padding],
          hoverable && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {/* Top specular highlight */}
        {(variant === 'default' || variant === 'elevated') && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/8 pointer-events-none" />
        )}
        <div className="relative">
          {children}
        </div>
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1 pb-3', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-[17px] font-display font-bold leading-tight text-ink', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-[14px] text-ink-muted/60', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-3 border-t border-ink/[0.04] dark:border-white/[0.04]', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'
