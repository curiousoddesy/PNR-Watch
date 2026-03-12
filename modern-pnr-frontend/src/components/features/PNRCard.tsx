import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface PNRCardProps {
  pnr: PNR
  onClick?: () => void
  onDelete?: (id: string) => void
  className?: string
}

const statusThemes: Record<string, { bg: string, text: string, dot: string }> = {
  'CNF': { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
  'RAC': { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  'WL': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  'PQWL': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  'CAN': { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  'Unknown': { bg: 'bg-ink/5', text: 'text-ink-muted', dot: 'bg-ink/20' }
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short'
  })

export const PNRCard: React.FC<PNRCardProps> = ({ pnr, onClick, onDelete, className }) => {
  const status = pnr.status.currentStatus
  const theme = statusThemes[status] || statusThemes.Unknown

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative glass-heavy rounded-[32px] p-6 cursor-pointer overflow-hidden transition-all duration-300',
        className
      )}
      onClick={onClick}
    >
      {/* Premium Shimmer Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-1">
            <p className="text-[10px] text-ink-muted/30 font-bold tracking-[0.2em] uppercase">PNR Number</p>
            <h3 className="text-xl font-mono font-bold text-ink tracking-widest">{pnr.number}</h3>
          </div>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-white/10', theme.bg)}>
            <div className={cn('w-1.5 h-1.5 rounded-full', theme.dot)} />
            <span className={cn('text-[10px] font-black uppercase tracking-widest', theme.text)}>
              {status}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="text-left">
            <h4 className="text-lg font-display font-black text-ink leading-none mb-1">{pnr.from}</h4>
            <p className="text-[10px] text-ink-muted/40 font-bold uppercase tracking-wider">{formatDate(pnr.dateOfJourney)}</p>
          </div>

          <div className="flex flex-col items-center gap-1.5 px-4 flex-1">
            <div className="relative w-full flex items-center justify-center">
              <div className="h-[1px] w-full bg-ink/[0.06] rounded-full" />
              <svg className="absolute w-3 h-3 text-ink-muted/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <span className="text-[9px] font-bold text-ink-muted/20 uppercase tracking-[0.2em]">Live Status</span>
          </div>

          <div className="text-right">
            <h4 className="text-lg font-display font-black text-ink leading-none mb-1">{pnr.to}</h4>
            <p className="text-[10px] text-ink-muted/40 font-bold uppercase tracking-wider">{pnr.class}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-ink/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/5 flex items-center justify-center text-brand">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[13px] font-bold text-ink leading-tight">{pnr.trainName}</p>
              <p className="font-mono text-[10px] text-brand font-bold uppercase tracking-wider mt-0.5">{pnr.trainNumber}</p>
            </div>
          </div>

          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(pnr.id) }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted/20 hover:text-red-500 hover:bg-red-500/5 transition-all"
              aria-label="Delete PNR"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
