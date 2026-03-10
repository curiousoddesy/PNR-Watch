import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePNRStore } from '../../stores/pnrStore'
import { cn } from '../../utils/cn'

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { pnrs } = usePNRStore()

  const isHome = location.pathname === '/'
  const isTracking = location.pathname === '/tracking'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-edge flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Home tab */}
      <button
        onClick={() => navigate('/')}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-1 h-16 transition-colors',
          isHome ? 'text-brand' : 'text-ink-muted/50 hover:text-ink-muted'
        )}
        aria-label="Home"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isHome ? 2.5 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <span className="text-[10px] font-medium tracking-wider uppercase">Search</span>
        {isHome && <span className="absolute bottom-[env(safe-area-inset-bottom)] w-5 h-0.5 rounded-full bg-brand mb-0" />}
      </button>

      {/* Tracking tab */}
      <button
        onClick={() => navigate('/tracking')}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-1 h-16 relative transition-colors',
          isTracking ? 'text-brand' : 'text-ink-muted/50 hover:text-ink-muted'
        )}
        aria-label="Tracking"
      >
        <div className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isTracking ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4"
            />
          </svg>
          {pnrs.length > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {pnrs.length}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium tracking-wider uppercase">Tracking</span>
        {isTracking && <span className="absolute bottom-[env(safe-area-inset-bottom)] w-5 h-0.5 rounded-full bg-brand mb-0" />}
      </button>
    </nav>
  )
}
