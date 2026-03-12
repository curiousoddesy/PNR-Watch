import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePNRStore } from '../../stores/pnrStore'
import { cn } from '../../utils/cn'

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { pnrs } = usePNRStore()

  const isHome = location.pathname === '/'
  const isTracking = location.pathname === '/tracking'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Floating pill nav */}
      <div className="mb-4 mx-auto flex items-center gap-1 px-1.5 py-1.5 rounded-2xl bg-surface/80 backdrop-blur-xl border border-edge/50 shadow-lg shadow-black/10">
        {/* Home tab */}
        <button
          onClick={() => navigate('/')}
          className={cn(
            'relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-250',
            isHome
              ? 'bg-brand/10 text-brand'
              : 'text-ink-muted/40 hover:text-ink-muted/60'
          )}
          aria-label="Search"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 2.2 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          {isHome && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              className="text-xs font-display font-bold tracking-wide overflow-hidden"
            >
              Search
            </motion.span>
          )}
        </button>

        {/* Tracking tab */}
        <button
          onClick={() => navigate('/tracking')}
          className={cn(
            'relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-250',
            isTracking
              ? 'bg-brand/10 text-brand'
              : 'text-ink-muted/40 hover:text-ink-muted/60'
          )}
          aria-label="Tracking"
        >
          <div className="relative">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isTracking ? 2.2 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4"
              />
            </svg>
            {pnrs.length > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-brand text-ground text-[8px] font-bold font-mono flex items-center justify-center leading-none">
                {pnrs.length}
              </span>
            )}
          </div>
          {isTracking && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              className="text-xs font-display font-bold tracking-wide overflow-hidden"
            >
              Tracking
            </motion.span>
          )}
        </button>
      </div>
    </nav>
  )
}
