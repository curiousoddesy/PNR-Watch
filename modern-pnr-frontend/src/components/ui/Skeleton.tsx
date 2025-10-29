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
  text: 'h-4 rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-md',
}

const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%'
  }
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

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'bg-secondary-200 dark:bg-secondary-700 relative overflow-hidden',
              skeletonVariants[variant],
              index === lines - 1 && 'w-3/4' // Last line is shorter
            )}
            style={{
              height: baseStyles.height,
              width: index === lines - 1 ? '75%' : baseStyles.width,
            }}
          >
            {animate && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-secondary-200 dark:bg-secondary-700 relative overflow-hidden',
        skeletonVariants[variant],
        className
      )}
      style={baseStyles}
      {...props}
    >
      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear'
          }}
        />
      )}
    </div>
  )
}

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="text" {...props} />
)

export const SkeletonCircle: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="circular" {...props} />
)

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 space-y-3', className)}>
    <div className="flex items-center space-x-3">
      <SkeletonCircle width={40} height={40} />
      <div className="flex-1 space-y-2">
        <SkeletonText width="60%" />
        <SkeletonText width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex justify-between">
      <Skeleton width={80} height={32} className="rounded-md" />
      <Skeleton width={60} height={32} className="rounded-md" />
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
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        {showAvatar && <SkeletonCircle width={32} height={32} />}
        <div className="flex-1 space-y-2">
          <SkeletonText width="80%" />
          <SkeletonText width="60%" />
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
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonText key={index} width="70%" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonText key={colIndex} width={`${60 + Math.random() * 30}%`} />
        ))}
      </div>
    ))}
  </div>
)