import React from 'react'
import { cn } from '../../utils/cn'

interface SkeletonProps {
  w?: number | string
  h?: number | string
  radius?: number | string
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ w, h = 16, radius = 8, className }) => (
  <div
    className={cn('shimmer block', className)}
    style={{
      width: typeof w === 'number' ? `${w}px` : w ?? '100%',
      height: typeof h === 'number' ? `${h}px` : h,
      borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
    }}
    aria-hidden
  />
)
