import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { usePNRAutoRefresh } from '../hooks/usePNRAutoRefresh'
import { cn } from '../utils/cn'
import type { PNR } from '../types'

const STATUS_STYLE: Record<string, { textColor: string; badgeBg: string; borderColor: string; dot: string }> = {
  CNF:     { textColor: 'text-green-700 dark:text-green-400',   badgeBg: 'bg-green-50 dark:bg-green-950/40',   borderColor: '#22c55e', dot: 'bg-green-500'  },
  RAC:     { textColor: 'text-amber-700 dark:text-amber-400',   badgeBg: 'bg-amber-50 dark:bg-amber-950/40',   borderColor: '#f59e0b', dot: 'bg-amber-500'  },
  WL:      { textColor: 'text-orange-700 dark:text-orange-400', badgeBg: 'bg-orange-50 dark:bg-orange-950/40', borderColor: '#f97316', dot: 'bg-orange-500' },
  PQWL:    { textColor: 'text-orange-700 dark:text-orange-400', badgeBg: 'bg-orange-50 dark:bg-orange-950/40', borderColor: '#f97316', dot: 'bg-orange-500' },
  CAN:     { textColor: 'text-red-700 dark:text-red-400',       badgeBg: 'bg-red-50 dark:bg-red-950/40',       borderColor: '#ef4444', dot: 'bg-red-500'    },
  FLUSHED: { textColor: 'text-slate-600 dark:text-slate-400',   badgeBg: 'bg-slate-50 dark:bg-slate-800/60',   borderColor: '#94a3b8', dot: 'bg-slate-400' },
}

const FALLBACK_STYLE = { textColor: 'text-slate-600 dark:text-slate-400', badgeBg: 'bg-slate-50 dark:bg-slate-800/60', borderColor: '#cbd5e1', dot: 'bg-slate-300' }

export const TrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const { pnrs, removePNR } = usePNRStore()

  const sortedPNRs = [...pnrs].sort((a, b) =>
    new Date(a.dateOfJourney).getTime() - new Date(b.dateOfJourney).getTime()
  )

  return (
    <div className="min-h-screen bg-ground bg-dotgrid">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-lg mx-auto">
        <div>
          <p className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase leading-none">Watching</p>
          <h1 className="font-display font-bold text-xl text-ink leading-tight mt-0.5">
            {sortedPNRs.length} PNR{sortedPNRs.length !== 1 ? 's' : ''}
          </h1>
        </div>
      </div>

      <div className="px-5 pb-12 max-w-lg mx-auto">
        {sortedPNRs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            {/* Train icon */}
            <div className="w-16 h-16 rounded-full bg-surface border border-edge flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-ink-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4"
                />
              </svg>
            </div>
            <p className="text-ink-muted font-medium mb-1">No journeys tracked</p>
            <p className="text-sm text-ink-muted/50 mb-6">Check a PNR and tap "Track Updates"</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-display font-bold hover:bg-brand/90 transition-colors shadow-[0_4px_16px_rgba(26,86,219,0.25)]"
            >
              Check a PNR
            </button>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3 pt-1">
              {sortedPNRs.map((pnr) => (
                <PNRListItem
                  key={pnr.id}
                  pnr={pnr}
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
  onClick: () => void
  onRemove: () => void
}> = ({ pnr, onClick, onRemove }) => {
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
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="bg-surface rounded-2xl border border-edge cursor-pointer hover:shadow-md hover:border-ink/10 transition-all duration-150 overflow-hidden"
      style={{ borderLeftWidth: '4px', borderLeftColor: style.borderColor }}
    >
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* PNR + status badge row */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="font-mono text-sm text-ink font-medium tracking-wider">{pnr.number}</span>

            {/* Status badge with optional breathing pulse */}
            <span className={cn(
              'relative inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono tracking-wider',
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

          {/* Train name */}
          <p className="text-xs text-ink-muted/70 truncate mb-1">
            <span className="font-mono">{pnr.trainNumber}</span>
            <span className="mx-1.5 text-ink-muted/30">·</span>
            {pnr.trainName}
          </p>

          {/* Route + date */}
          <div className="flex items-center gap-1.5 text-xs text-ink-muted/50 font-mono">
            <span>{pnr.from}</span>
            <span className="text-ink-muted/30">→</span>
            <span>{pnr.to}</span>
            <span className="text-ink-muted/20 mx-0.5">·</span>
            <span>{formatDate(pnr.dateOfJourney)}</span>
          </div>
        </div>

        {/* Right side: spinner + remove */}
        <div className="ml-3 flex flex-col items-end gap-2 flex-shrink-0">
          {isFetching ? (
            <svg className="w-3.5 h-3.5 text-ink-muted/30 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
            </svg>
          ) : lastUpdatedLabel ? (
            <span className="text-[10px] text-ink-muted/30 font-mono">{lastUpdatedLabel}</span>
          ) : null}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted/20 hover:text-red-400 hover:bg-red-50 transition-all"
            aria-label={`Remove PNR ${pnr.number}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
