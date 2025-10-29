import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

export interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

export interface StepperProps {
  steps: Array<{
    label: string
    description?: string
    completed?: boolean
    current?: boolean
    error?: boolean
  }>
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

const progressSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const progressVariants = {
  default: 'bg-primary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  error: 'bg-error-600',
}

const circularVariants = {
  default: 'stroke-primary-600',
  success: 'stroke-success-600',
  warning: 'stroke-warning-600',
  error: 'stroke-error-600',
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
            {label || 'Progress'}
          </span>
          {showLabel && (
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        'w-full bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden',
        progressSizes[size]
      )}>
        <motion.div
          className={cn('h-full rounded-full', progressVariants[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-secondary-200 dark:text-secondary-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={circularVariants[variant]}
          initial={{ strokeDasharray, strokeDashoffset: circumference }}
          animate={{ strokeDasharray, strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {showLabel && (
            <div className="text-2xl font-semibold text-secondary-900 dark:text-secondary-100">
              {Math.round(percentage)}%
            </div>
          )}
          {label && (
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  orientation = 'horizontal',
  className,
}) => {
  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => (
          <div key={index} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step.completed
                    ? 'bg-success-600 text-white'
                    : step.current
                    ? 'bg-primary-600 text-white'
                    : step.error
                    ? 'bg-error-600 text-white'
                    : 'bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
                )}
              >
                {step.completed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.error ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </motion.div>
              
              {index < steps.length - 1 && (
                <div className="w-px h-8 bg-secondary-200 dark:bg-secondary-700 mt-2" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.1 }}
              >
                <h3 className={cn(
                  'text-sm font-medium',
                  step.current
                    ? 'text-primary-600 dark:text-primary-400'
                    : step.completed
                    ? 'text-success-600 dark:text-success-400'
                    : step.error
                    ? 'text-error-600 dark:text-error-400'
                    : 'text-secondary-900 dark:text-secondary-100'
                )}>
                  {step.label}
                </h3>
                {step.description && (
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                    {step.description}
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2',
                step.completed
                  ? 'bg-success-600 text-white'
                  : step.current
                  ? 'bg-primary-600 text-white'
                  : step.error
                  ? 'bg-error-600 text-white'
                  : 'bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
              )}
            >
              {step.completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : step.error ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                index + 1
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.1 }}
              className="text-center"
            >
              <h3 className={cn(
                'text-sm font-medium',
                step.current
                  ? 'text-primary-600 dark:text-primary-400'
                  : step.completed
                  ? 'text-success-600 dark:text-success-400'
                  : step.error
                  ? 'text-error-600 dark:text-error-400'
                  : 'text-secondary-900 dark:text-secondary-100'
              )}>
                {step.label}
              </h3>
              {step.description && (
                <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1 max-w-24">
                  {step.description}
                </p>
              )}
            </motion.div>
          </div>
          
          {index < steps.length - 1 && (
            <div className="flex-1 h-px bg-secondary-200 dark:bg-secondary-700 mx-4 mb-8" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}