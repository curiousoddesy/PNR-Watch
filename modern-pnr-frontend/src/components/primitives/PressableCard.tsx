import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface PressableCardProps {
  onPress?: () => void
  elevation?: 'flat' | 'raised'
  className?: string
  children: React.ReactNode
  as?: 'div' | 'button'
  ariaLabel?: string
}

export const PressableCard: React.FC<PressableCardProps> = ({
  onPress,
  elevation = 'raised',
  className,
  children,
  as,
  ariaLabel,
}) => {
  const reduced = useReducedMotion()
  const interactive = !!onPress
  const Comp: any = as ?? (interactive ? motion.button : motion.div)

  return (
    <Comp
      onClick={onPress}
      whileTap={reduced || !interactive ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      aria-label={ariaLabel}
      className={cn(
        'block w-full text-left rounded-card bg-surface',
        elevation === 'raised' && 'shadow-card',
        elevation === 'flat' && 'border border-rule',
        interactive && 'cursor-pointer transition-colors duration-150',
        className,
      )}
    >
      {children}
    </Comp>
  )
}
