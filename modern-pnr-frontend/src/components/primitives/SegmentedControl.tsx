import React from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { cn } from '../../utils/cn'

interface Option<T extends string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  fullWidth = true,
}: SegmentedControlProps<T>) {
  return (
    <LayoutGroup id="seg-control">
      <div
        role="tablist"
        className={cn(
          'inline-flex items-center p-0.5 rounded-pill bg-surface-2',
          fullWidth && 'w-full',
          className,
        )}
      >
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'relative flex-1 h-9 px-4 text-[13px] font-medium tracking-tight rounded-pill transition-colors duration-150',
                active ? 'text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="seg-thumb"
                  className="absolute inset-0 rounded-pill bg-paper shadow-card"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
