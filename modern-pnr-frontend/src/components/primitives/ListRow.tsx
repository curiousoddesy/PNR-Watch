import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface ListRowProps {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  onPress?: () => void
  destructive?: boolean
  divider?: boolean
  className?: string
}

export const ListRow: React.FC<ListRowProps> = ({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  destructive,
  divider = true,
  className,
}) => {
  const reduced = useReducedMotion()
  const interactive = !!onPress
  const Comp: any = interactive ? motion.button : motion.div

  return (
    <Comp
      onClick={onPress}
      whileTap={reduced || !interactive ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3.5 text-left',
        'min-h-[60px] transition-colors duration-150',
        interactive && 'hover:bg-surface-2 active:bg-surface-2',
        divider && 'border-b border-rule last:border-b-0',
        className,
      )}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-[15px] tracking-tight truncate',
            destructive ? 'text-danger' : 'text-ink',
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-[12px] text-ink-2 truncate mt-0.5">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0 text-ink-3">{trailing}</div>}
    </Comp>
  )
}
