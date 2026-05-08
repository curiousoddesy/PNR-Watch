import React, { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

interface AppBarProps {
  title?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  large?: boolean
  className?: string
}

export const AppBar: React.FC<AppBarProps> = ({ title, leading, trailing, large, className }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-paper/85 backdrop-blur-md transition-shadow duration-200',
        'pt-safe',
        scrolled && 'border-b border-rule',
        className,
      )}
    >
      <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-2">
        <div className="w-11 flex justify-start">{leading}</div>
        <div className={cn(
          'flex-1 text-center text-[16px] font-semibold tracking-tight truncate',
          large && 'text-left',
        )}>
          {title}
        </div>
        <div className="w-11 flex justify-end">{trailing}</div>
      </div>
    </header>
  )
}
