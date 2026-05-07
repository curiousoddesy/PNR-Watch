import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { usePNRAutoRefresh } from '../hooks/usePNRAutoRefresh'
import { cn } from '../utils/cn'
import type { PNR } from '../types'

const STATUS_LABEL: Record<string, string> = {
  CNF: 'Confirmed',
  RAC: 'RAC',
  WL: 'Waitlist',
  PQWL: 'Waitlist',
  RLWL: 'Waitlist',
  GNWL: 'Waitlist',
  CAN: 'Cancelled',
  FLUSHED: 'Expired',
}

const formatDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  catch { return s }
}

export const TrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const { pnrs, removePNR } = usePNRStore()

  const sortedPNRs = [...pnrs].sort((a, b) =>
    new Date(a.dateOfJourney).getTime() - new Date(b.dateOfJourney).getTime()
  )

  return (
    <div className="pt-10 pb-24">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-16"
      >
        <p className="type-eyebrow mb-4">Trips</p>
        <div className="flex items-baseline justify-between gap-6">
          <h1 className="type-display text-ink" style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}>
            {sortedPNRs.length === 0
              ? 'Nothing yet.'
              : sortedPNRs.length === 1
                ? 'One trip.'
                : `${sortedPNRs.length} trips.`}
          </h1>
        </div>
        {sortedPNRs.length > 0 && (
          <p className="mt-4 text-[16px] text-ink-2 tracking-tight">
            We refresh each one every five minutes. You don't have to look.
          </p>
        )}
      </motion.section>

      {sortedPNRs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="border-t border-rule pt-12"
        >
          <p className="text-[16px] text-ink-2 max-w-md tracking-tight mb-6">
            When you check a PNR and decide to keep an eye on it, it'll live here. Quiet, automatic, always current.
          </p>
          <Link to="/" className="btn-primary">
            Search a PNR
          </Link>
        </motion.div>
      ) : (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border-t border-rule"
        >
          <AnimatePresence initial={false}>
            {sortedPNRs.map((pnr, i) => (
              <PNRRow
                key={pnr.id}
                pnr={pnr}
                index={i}
                onClick={() => navigate(`/status/${pnr.number}`)}
                onRemove={() => removePNR(pnr.id)}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}

const PNRRow: React.FC<{
  pnr: PNR
  index: number
  onClick: () => void
  onRemove: () => void
}> = ({ pnr, index, onClick, onRemove }) => {
  const status = pnr.status.currentStatus
  const label = STATUS_LABEL[status] ?? status
  const { isFetching, lastUpdatedLabel } = usePNRAutoRefresh(pnr.id, pnr.number)
  const isMuted = status === 'CAN' || status === 'FLUSHED'

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-rule group"
    >
      <div className="flex items-center gap-6 py-6">
        <button
          onClick={onClick}
          className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-6 items-baseline text-left transition-opacity hover:opacity-70"
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="type-mono text-[15px] tracking-wider text-ink">{pnr.number}</span>
              {isFetching && (
                <span className="type-eyebrow text-[10px] pulse-soft">Updating</span>
              )}
            </div>
            <p className={cn(
              'text-[20px] tracking-tight truncate',
              isMuted ? 'text-ink-3 line-through decoration-1' : 'text-ink'
            )}>
              {pnr.trainName}
              <span className="text-ink-3 font-normal"> · {pnr.trainNumber}</span>
            </p>
            <p className="text-[13px] text-ink-2 mt-1 tracking-tight">
              {pnr.from} <span className="text-ink-3 mx-1.5">→</span> {pnr.to}
              <span className="text-ink-3 mx-2">·</span>
              {formatDate(pnr.dateOfJourney)}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className={cn(
              'text-[15px] tracking-tight',
              isMuted ? 'text-ink-3' : 'text-ink'
            )}>
              {label}
            </p>
            {lastUpdatedLabel && (
              <p className="text-[11px] text-ink-3 mt-0.5 tracking-tight">
                {lastUpdatedLabel}
              </p>
            )}
          </div>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="btn-icon opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label={`Remove PNR ${pnr.number}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.li>
  )
}
