import React from 'react'
import { cn } from '../../utils/cn'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface StatusPillProps {
  tone?: Tone
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

const TONE: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-neutral-soft text-ink-2',
}

const SIZE = {
  sm: 'px-2 h-5 text-[10px]',
  md: 'px-2.5 h-6 text-[11px]',
}

export const StatusPill: React.FC<StatusPillProps> = ({ tone = 'neutral', size = 'md', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-pill font-semibold tracking-wide uppercase whitespace-nowrap',
      TONE[tone],
      SIZE[size],
      className,
    )}
  >
    {children}
  </span>
)

const TONE_BY_STATUS: Record<string, Tone> = {
  CNF: 'success',
  RAC: 'warning',
  WL: 'info',
  PQWL: 'info',
  RLWL: 'info',
  GNWL: 'info',
  CAN: 'danger',
  FLUSHED: 'neutral',
  Unknown: 'neutral',
}

export const toneForStatus = (status: string): Tone => {
  const head = status.split('/')[0]
  return TONE_BY_STATUS[head] ?? 'neutral'
}
