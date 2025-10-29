import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'current'
  className?: string
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const colorClasses = {
  primary: 'border-primary-600',
  secondary: 'border-secondary-600',
  white: 'border-white',
  current: 'border-current'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className
}) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(
        'border-2 border-t-transparent rounded-full',
        spinnerSizes[size],
        colorClasses[color],
        className
      )}
    />
  )
}

export interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'white' | 'current'
  className?: string
}

const dotSizes = {
  sm: 'w-1 h-1',
  md: 'w-2 h-2',
  lg: 'w-3 h-3'
}

const dotColorClasses = {
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  white: 'bg-white',
  current: 'bg-current'
}

const dotVariants: Variants = {
  initial: { y: 0 },
  animate: { y: -8 }
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'primary',
  className
}) => {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: index * 0.1,
            ease: 'easeInOut'
          }}
          className={cn(
            'rounded-full',
            dotSizes[size],
            dotColorClasses[color]
          )}
        />
      ))}
    </div>
  )
}