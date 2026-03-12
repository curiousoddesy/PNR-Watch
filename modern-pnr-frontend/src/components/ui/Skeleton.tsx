import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  lines?: number
  animate?: boolean
}

const skeletonVariants = {
  text: 'h-4 rounded-lg',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-2xl',
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animate = true,
  className,
  style,
  ...props
}) => {
  const baseStyles = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '2rem'),
    ...style,
  }

  const shimmerClass = animate
    ? 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 dark:after:via-white/5 after:to-transparent after:animate-[shimmer_1.5s_ease-in-out_infinite]'
    : ''

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2.5', className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'bg-ink/[0.04] dark:bg-white/[0.04] relative overflow-hidden',
              skeletonVariants[variant],
              shimmerClass,
              index === lines - 1 && 'w-3/4'
            )}
            style={{
              height: baseStyles.height,
              width: index === lines - 1 ? '75%' : baseStyles.width,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-ink/[0.04] dark:bg-white/[0.04] relative overflow-hidden',
        skeletonVariants[variant],
        shimmerClass,
        className
      )}
      style={baseStyles}
      {...props}
    />
  )
}

export const SkeletonText: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="text" {...props} />
)

export const SkeletonCircle: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="circular" {...props} />
)

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('glass rounded-3xl p-5 space-y-3', className)}>
    <div className="flex items-center space-x-3">
      <SkeletonCircle width={40} height={40} />
      <div className="flex-1 space-y-2">
        <SkeletonText width="60%" />
        <SkeletonText width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex justify-between pt-2">
      <Skeleton width={80} height={36} className="rounded-2xl" />
      <Skeleton width={60} height={36} className="rounded-2xl" />
    </div>
  </div>
)

export const SkeletonList: React.FC<{
  items?: number
  showAvatar?: boolean
  className?: string
}> = ({
  items = 3,
  showAvatar = true,
  className
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="glass rounded-3xl p-4 flex items-center space-x-3">
        {showAvatar && <SkeletonCircle width={36} height={36} />}
        <div className="flex-1 space-y-2">
          <SkeletonText width="80%" />
          <SkeletonText width="55%" />
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonTable: React.FC<{
  rows?: number
  columns?: number
  className?: string
}> = ({
  rows = 5,
  columns = 4,
  className
}) => (
  <div className={cn('glass rounded-3xl p-5 space-y-3', className)}>
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonText key={index} width="70%" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonText key={colIndex} width={`${60 + Math.random() * 30}%`} />
        ))}
      </div>
    ))}
  </div>
)
