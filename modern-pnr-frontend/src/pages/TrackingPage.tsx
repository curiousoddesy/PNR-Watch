import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { usePNRAutoRefresh } from '../hooks/usePNRAutoRefresh'
import { cn } from '../utils/cn'
import type { PNR } from '../types'

const STATUS_STYLE: Record<string, { textColor: string; badgeBg: string; borderColor: string; dot: string }> = {
  CNF:     { textColor: 'text-green-600 dark:text-green-400',   badgeBg: 'bg-green-500/10',   borderColor: '#34C759', dot: 'bg-green-500' },
  RAC:     { textColor: 'text-amber-600 dark:text-amber-400',   badgeBg: 'bg-amber-500/10',   borderColor: '#FF9F0A', dot: 'bg-amber-500' },
  WL:      { textColor: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-500/10',  borderColor: '#FF9500', dot: 'bg-orange-500' },
  PQWL:    { textColor: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-500/10',  borderColor: '#FF9500', dot: 'bg-orange-500' },
  CAN:     { textColor: 'text-red-600 dark:text-red-400',       badgeBg: 'bg-red-500/10',     borderColor: '#FF3B30', dot: 'bg-red-500' },
  FLUSHED: { textColor: 'text-gray-500 dark:text-gray-400',     badgeBg: 'bg-gray-500/10',    borderColor: '#8E8E93', dot: 'bg-gray-400' },
}

const FALLBACK_STYLE = { textColor: 'text-gray-500 dark:text-gray-400', badgeBg: 'bg-gray-500/10', borderColor: '#8E8E93', dot: 'bg-gray-400' }

export const TrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const { pnrs, removePNR } = usePNRStore()

  const sortedPNRs = [...pnrs].sort((a, b) =>
    new Date(a.dateOfJourney).getTime() - new Date(b.dateOfJourney).getTime()
  )

  return (
    <div className="min-h-screen bg-ground bg-vivid">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="px-6 pt-10 pb-6 max-w-lg mx-auto relative z-10"
      >
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-2xl glass-button flex items-center justify-center text-ink-muted hover:text-brand transition-colors mb-6"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-[10px] text-ink-muted/30 font-black tracking-[0.25em] uppercase">Live Vault</p>
            </div>
            <h1 className="font-display font-black text-4xl text-ink leading-tight">
              My Journeys
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-black text-brand leading-none">{sortedPNRs.length}</p>
            <p className="text-[10px] font-bold text-ink-muted/30 uppercase tracking-widest mt-1">Active</p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 pb-12 max-w-lg mx-auto relative z-10">
        {sortedPNRs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 glass-heavy rounded-[40px] p-10 mt-4"
          >
            <div className="w-20 h-20 rounded-[32px] bg-brand/5 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-brand/40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4" />
              </svg>
            </div>
            <h3 className="text-xl font-display font-black text-ink mb-2">Vault is Empty</h3>
            <p className="text-[14px] text-ink-muted/40 mb-10 leading-relaxed">
              Start tracking a PNR to see real-time status updates and arrival alerts here.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-10 h-14 bg-brand text-white rounded-full text-[15px] font-bold shadow-[0_20px_40px_rgba(0,122,255,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              Add New PNR
            </button>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-4 pt-2">
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, delay: index * 0.1, type: 'spring', damping: 25 }}
      onClick={onClick}
      className="group relative glass-heavy rounded-[32px] p-5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
    >
      {/* Dynamic Status Border */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', style.dot)} />

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[16px] text-ink font-black tracking-widest group-hover:text-brand transition-colors">{pnr.number}</span>
            <span className={cn(
              'inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/10',
              style.textColor, style.badgeBg
            )}>
              {status}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-ink/[0.04] flex items-center justify-center text-ink-muted/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink leading-tight truncate">{pnr.trainName}</p>
              <p className="font-mono text-[10px] text-brand/50 font-bold uppercase tracking-widest mt-0.5">{pnr.trainNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-ink-muted/30 uppercase tracking-[0.15em] pl-1">
            <span>{pnr.from}</span>
            <svg className="w-3 h-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span>{pnr.to}</span>
            <span className="mx-1 opacity-20 text-[16px]">·</span>
            <span className="text-brand/40">{formatDate(pnr.dateOfJourney)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="h-10 flex items-center gap-2">
            {isFetching && (
              <svg className="w-3.5 h-3.5 text-brand/40 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
              </svg>
            )}
            <p className="text-[9px] font-black text-ink-muted/15 uppercase tracking-tighter">
              {lastUpdatedLabel || 'Active'}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-ink-muted/15 hover:text-red-500 hover:bg-red-500/5 transition-all"
            aria-label={`Remove PNR ${pnr.number}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
