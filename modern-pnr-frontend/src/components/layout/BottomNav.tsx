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
      {/* Floating glass pill — iOS 26 tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 mx-auto flex items-center gap-1 px-1.5 py-1.5 rounded-[22px] glass-heavy"
      >
        {/* Search tab */}
        <button
          onClick={() => navigate('/')}
          className={cn(
            'relative flex items-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300',
            isHome
              ? 'bg-brand/12 text-brand'
              : 'text-ink-muted/40 hover:text-ink-muted/60'
          )}
          aria-label="Search"
        >
          {isHome && (
            <motion.div
              layoutId="tab-bg"
              className="absolute inset-0 rounded-[18px] bg-brand/10"
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />
          )}
          <svg className="w-[18px] h-[18px] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 2.2 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          {isHome && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="text-[13px] font-semibold tracking-wide overflow-hidden relative z-10"
            >
              Search
            </motion.span>
          )}
        </button>

        {/* Tracking tab */}
        <button
          onClick={() => navigate('/tracking')}
          className={cn(
            'relative flex items-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-300',
            isTracking
              ? 'bg-brand/12 text-brand'
              : 'text-ink-muted/40 hover:text-ink-muted/60'
          )}
          aria-label="Tracking"
        >
          {isTracking && (
            <motion.div
              layoutId="tab-bg"
              className="absolute inset-0 rounded-[18px] bg-brand/10"
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />
          )}
          <div className="relative z-10">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isTracking ? 2.2 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4"
              />
            </svg>
            {pnrs.length > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-[0_2px_6px_rgba(255,59,48,0.4)]">
                {pnrs.length}
              </span>
            )}
          </div>
          {isTracking && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="text-[13px] font-semibold tracking-wide overflow-hidden relative z-10"
            >
              Tracking
            </motion.span>
          )}
        </button>
      </motion.div>
    </nav>
  )
}
