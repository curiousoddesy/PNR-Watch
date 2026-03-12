import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { usePNRAutoRefresh } from '../hooks/usePNRAutoRefresh'
import { cn } from '../utils/cn'
import type { PNR } from '../types'

const STATUS_STYLE: Record<string, { textColor: string; badgeBg: string; borderColor: string; dot: string }> = {
  CNF:     { textColor: 'text-emerald-400',  badgeBg: 'bg-emerald-500/10', borderColor: '#34D399', dot: 'bg-emerald-400' },
  RAC:     { textColor: 'text-amber-400',    badgeBg: 'bg-amber-500/10',   borderColor: '#FBBF24', dot: 'bg-amber-400'   },
  WL:      { textColor: 'text-orange-400',   badgeBg: 'bg-orange-500/10',  borderColor: '#FB923C', dot: 'bg-orange-400'  },
  PQWL:    { textColor: 'text-orange-400',   badgeBg: 'bg-orange-500/10',  borderColor: '#FB923C', dot: 'bg-orange-400'  },
  CAN:     { textColor: 'text-red-400',      badgeBg: 'bg-red-500/10',     borderColor: '#F87171', dot: 'bg-red-400'     },
  FLUSHED: { textColor: 'text-slate-400',    badgeBg: 'bg-slate-500/10',   borderColor: '#94A3B8', dot: 'bg-slate-400'   },
}

const FALLBACK_STYLE = { textColor: 'text-slate-400', badgeBg: 'bg-slate-500/10', borderColor: '#64748B', dot: 'bg-slate-400' }

export const TrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const { pnrs, removePNR } = usePNRStore()

  const sortedPNRs = [...pnrs].sort((a, b) =>
    new Date(a.dateOfJourney).getTime() - new Date(b.dateOfJourney).getTime()
  )

  return (
    <div className="min-h-screen bg-ground bg-mesh bg-dots">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-lg mx-auto relative z-10"
      >
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-signal-pulse" />
            <p className="text-[10px] text-ink-muted/40 font-mono font-medium tracking-[0.2em] uppercase leading-none">Watching</p>
          </div>
          <h1 className="font-display font-extrabold text-2xl text-ink leading-tight">
            {sortedPNRs.length} PNR{sortedPNRs.length !== 1 ? 's' : ''}
          </h1>
        </div>
      </motion.div>

      <div className="px-5 pb-12 max-w-lg mx-auto relative z-10">
        {sortedPNRs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} className="text-ink-muted/20">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4"
                />
              </svg>
            </div>
            <p className="text-ink font-display font-bold text-lg mb-1">No journeys tracked</p>
            <p className="text-sm text-ink-muted/40 mb-8 font-mono">Check a PNR and tap "Track Updates"</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-brand text-ground rounded-xl text-sm font-display font-bold hover:brightness-110 transition-all glow-signal"
            >
              Check a PNR
            </button>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2.5 pt-1">
              {sortedPNRs.map((pnr, i) => (
                <PNRListItem
                  key={pnr.id}
                  pnr={pnr}
                  index={i}
                  onClick={() => navigate(`/status/${pnr.number}`)}
                  onRemove={() => removePNR(pnr.id)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

const PNRListItem: React.FC<{
  pnr: PNR
  index: number
  onClick: () => void
  onRemove: () => void
}> = ({ pnr, index, onClick, onRemove }) => {
  const status = pnr.status.currentStatus
  const style = STATUS_STYLE[status] ?? FALLBACK_STYLE
  const isLive = status === 'WL' || status === 'RAC' || status === 'PQWL'
  const { isFetching, lastUpdatedLabel } = usePNRAutoRefresh(pnr.id, pnr.number)

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    } catch {
      return dateString
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      className="glass rounded-2xl cursor-pointer hover:border-brand/30 transition-all duration-200 overflow-hidden group"
      style={{ borderLeftWidth: '3px', borderLeftColor: style.borderColor }}
    >
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* PNR + status */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="font-mono text-sm text-ink font-semibold tracking-wider">{pnr.number}</span>

            <span className={cn(
              'relative inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider',
              style.textColor, style.badgeBg
            )}>
              {status}
              {isLive && (
                <motion.span
                  className={cn('absolute inset-0 rounded-md', style.badgeBg)}
                  animate={{ opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </span>
          </div>

          {/* Train */}
          <p className="text-xs text-ink-muted/50 truncate mb-1">
            <span className="font-mono text-brand/50">{pnr.trainNumber}</span>
            <span className="mx-1.5 text-edge">|</span>
            <span>{pnr.trainName}</span>
          </p>

          {/* Route + date */}
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted/35 font-mono">
            <span>{pnr.from}</span>
            <span className="text-brand/30">-></span>
            <span>{pnr.to}</span>
            <span className="text-edge">·</span>
            <span>{formatDate(pnr.dateOfJourney)}</span>
          </div>
        </div>

        {/* Right side */}
        <div className="ml-4 flex flex-col items-end gap-2 flex-shrink-0">
          {isFetching ? (
            <svg className="w-3.5 h-3.5 text-brand/40 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
            </svg>
          ) : lastUpdatedLabel ? (
            <span className="text-[9px] text-ink-muted/20 font-mono">{lastUpdatedLabel}</span>
          ) : null}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted/15 hover:text-red-400 hover:bg-red-500/10 transition-all"
            aria-label={`Remove PNR ${pnr.number}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
