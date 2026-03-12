import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { checkPNRStatus } from '../services/pnrService'
import { cn } from '../utils/cn'

interface StatusCfg {
  bg: string
  textColor: string
  badgeBg: string
  borderColor: string
  fullLabel: string
  label: string
  glow: string
  icon: string
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  CNF:     { bg: 'bg-emerald-500',  textColor: 'text-emerald-400',  badgeBg: 'bg-emerald-500/10', borderColor: '#34D399', fullLabel: 'CONFIRMED', label: 'Confirmed', glow: 'rgba(52,211,153,0.25)', icon: 'check' },
  RAC:     { bg: 'bg-amber-500',    textColor: 'text-amber-400',    badgeBg: 'bg-amber-500/10',   borderColor: '#FBBF24', fullLabel: 'RAC',       label: 'RAC',       glow: 'rgba(251,191,36,0.25)', icon: 'clock' },
  WL:      { bg: 'bg-orange-500',   textColor: 'text-orange-400',   badgeBg: 'bg-orange-500/10',  borderColor: '#FB923C', fullLabel: 'WAITLIST',  label: 'Waitlist',  glow: 'rgba(251,146,60,0.25)', icon: 'list' },
  PQWL:    { bg: 'bg-orange-500',   textColor: 'text-orange-400',   badgeBg: 'bg-orange-500/10',  borderColor: '#FB923C', fullLabel: 'PQWL',      label: 'PQWL',      glow: 'rgba(251,146,60,0.25)', icon: 'list' },
  RLWL:    { bg: 'bg-violet-500',   textColor: 'text-violet-400',   badgeBg: 'bg-violet-500/10',  borderColor: '#A78BFA', fullLabel: 'RLWL',      label: 'RLWL',      glow: 'rgba(167,139,250,0.25)', icon: 'list' },
  CAN:     { bg: 'bg-red-500',      textColor: 'text-red-400',      badgeBg: 'bg-red-500/10',     borderColor: '#F87171', fullLabel: 'CANCELLED', label: 'Cancelled', glow: 'rgba(248,113,113,0.25)', icon: 'x' },
  FLUSHED: { bg: 'bg-slate-500',    textColor: 'text-slate-400',    badgeBg: 'bg-slate-500/10',   borderColor: '#94A3B8', fullLabel: 'EXPIRED',   label: 'Expired',   glow: 'rgba(148,163,184,0.15)', icon: 'minus' },
  Unknown: { bg: 'bg-slate-500',    textColor: 'text-slate-400',    badgeBg: 'bg-slate-500/10',   borderColor: '#94A3B8', fullLabel: 'UNKNOWN',   label: 'Unknown',   glow: 'rgba(148,163,184,0.15)', icon: 'question' },
}

const Divider: React.FC = () => (
  <div className="flex items-center -mx-6">
    <div className="w-4 h-4 rounded-full bg-ground flex-shrink-0 -ml-2 border border-edge" />
    <div className="flex-1 border-t border-dashed border-edge/50" />
    <div className="w-4 h-4 rounded-full bg-ground flex-shrink-0 -mr-2 border border-edge" />
  </div>
)

export const StatusPage: React.FC = () => {
  const { pnrNumber } = useParams<{ pnrNumber: string }>()
  const navigate = useNavigate()
  const { pnrs, addPNR, removePNR } = usePNRStore()

  const { data: pnrData, isLoading, error, refetch } = useQuery({
    queryKey: ['pnr-status', pnrNumber],
    queryFn: () => checkPNRStatus(pnrNumber!),
    enabled: !!pnrNumber,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  })

  const isTracking = pnrs.some(p => p.number === pnrNumber)

  const handleTrackToggle = () => {
    if (!pnrData) return
    isTracking ? removePNR(pnrData.id) : addPNR(pnrData)
  }

  const status = pnrData?.status
  const cfg = STATUS_CONFIG[status?.currentStatus ?? 'Unknown'] ?? STATUS_CONFIG.Unknown

  return (
    <div className="min-h-screen bg-ground bg-mesh bg-dots">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-lg mx-auto relative z-10"
      >
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-ink-muted hover:text-brand transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-[10px] text-ink-muted/40 font-mono font-medium tracking-[0.2em] uppercase leading-none">PNR</p>
          <p className="font-mono text-lg text-brand font-semibold tracking-[0.1em] leading-tight mt-0.5">
            {pnrNumber}
          </p>
        </div>
      </motion.div>

      <div className="px-5 pb-12 max-w-lg mx-auto space-y-3.5 relative z-10">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3.5 animate-pulse">
            <div className="w-full h-36 rounded-2xl bg-surface border border-edge" />
            <div className="bg-surface rounded-2xl border border-edge p-6 space-y-4">
              <div className="h-3 w-20 bg-edge rounded-full" />
              <div className="h-5 w-44 bg-edge rounded-full" />
              <div className="h-3 w-full bg-edge/60 rounded-full" />
              <div className="h-3 w-2/3 bg-edge/60 rounded-full" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <p className="text-ink font-display font-bold mb-1">Could not fetch status</p>
            <p className="text-sm text-ink-muted/50 mb-6 font-mono">
              {error instanceof Error ? error.message : 'Try again in a moment'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2.5 bg-brand text-ground rounded-xl text-sm font-display font-bold hover:brightness-110 transition-all glow-signal"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Main content */}
        <AnimatePresence>
          {pnrData && status && !isLoading && (
            <>
              {/* Status badge — clean, modern reveal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn('rounded-2xl overflow-hidden relative', cfg.bg)}
                style={{ boxShadow: `0 12px 40px ${cfg.glow}` }}
              >
                {/* Geometric pattern overlay */}
                <div className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 21px),
                      repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 21px)`,
                  }}
                />
                <div className="relative py-8 px-6 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.35 }}
                  >
                    <p className="text-white/40 text-[10px] font-mono font-medium tracking-[0.3em] uppercase mb-2.5">
                      Booking Status
                    </p>
                    <p className="text-white font-display font-extrabold leading-none"
                      style={{ fontSize: 'clamp(2.5rem, 9vw, 3.5rem)', letterSpacing: '0.03em' }}
                    >
                      {cfg.fullLabel}
                    </p>
                    {status.chartPrepared && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        transition={{ delay: 0.4 }}
                        className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-signal-pulse" />
                        <span className="text-white/60 text-[10px] font-mono tracking-[0.2em] uppercase">Chart Prepared</span>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>

              {/* Journey card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="glass rounded-2xl overflow-hidden"
              >
                {/* Train info */}
                <div className="px-6 pt-5 pb-4">
                  <p className="text-[10px] text-ink-muted/40 font-mono font-medium tracking-[0.2em] uppercase mb-1">Train</p>
                  <p className="text-ink font-display font-bold text-lg leading-snug">
                    <span className="font-mono text-brand">{pnrData.trainNumber}</span>
                    <span className="text-edge mx-2">|</span>
                    <span className="text-ink/80">{pnrData.trainName}</span>
                  </p>
                </div>

                <Divider />

                {/* Route */}
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] text-ink-muted/40 font-mono font-medium tracking-[0.2em] uppercase mb-1">From</p>
                      <p className="text-ink font-display font-extrabold text-xl leading-tight">{pnrData.from}</p>
                      {status.trainInfo.departureTime && (
                        <p className="font-mono text-xs text-brand/60 mt-1">{status.trainInfo.departureTime}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
                      <div className="flex items-center gap-0.5 text-brand/30">
                        <div className="w-5 border-t border-dashed border-current" />
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                      {status.trainInfo.duration && (
                        <p className="font-mono text-[9px] text-ink-muted/25 whitespace-nowrap">{status.trainInfo.duration}</p>
                      )}
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-[10px] text-ink-muted/40 font-mono font-medium tracking-[0.2em] uppercase mb-1">To</p>
                      <p className="text-ink font-display font-extrabold text-xl leading-tight">{pnrData.to}</p>
                      {status.trainInfo.arrivalTime && (
                        <p className="font-mono text-xs text-brand/60 mt-1">{status.trainInfo.arrivalTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Journey meta chips */}
                  <div className="flex items-center gap-1.5 mt-4">
                    <span className="font-mono text-[11px] text-ink-muted/50 px-2 py-0.5 rounded-md bg-edge/30">{pnrData.dateOfJourney}</span>
                    {pnrData.class !== '—' && (
                      <span className="font-mono text-[11px] text-ink-muted/50 px-2 py-0.5 rounded-md bg-edge/30 uppercase">{pnrData.class}</span>
                    )}
                  </div>
                </div>

                {/* Passengers */}
                {status.passengers.length > 0 && (
                  <>
                    <Divider />
                    <div className="px-6 pb-5 pt-4">
                      <p className="text-[10px] text-ink-muted/40 font-mono font-medium tracking-[0.2em] uppercase mb-3">
                        {status.passengers.length === 1 ? '1 Passenger' : `${status.passengers.length} Passengers`}
                      </p>
                      <div className="space-y-2">
                        {status.passengers.map((passenger, i) => {
                          const pCfg = STATUS_CONFIG[passenger.currentStatus] ?? STATUS_CONFIG.Unknown
                          return (
                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-edge/30 last:border-0">
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm text-ink font-semibold">{passenger.name}</span>
                                  {passenger.age > 0 && (
                                    <span className="text-[11px] text-ink-muted/40 font-mono">{passenger.age}{passenger.gender}</span>
                                  )}
                                </div>
                                {passenger.coachPosition && passenger.seatNumber && (
                                  <p className="font-mono text-xs text-ink-muted/35 mt-0.5">
                                    {passenger.coachPosition} · Seat {passenger.seatNumber}
                                  </p>
                                )}
                                {passenger.bookingStatus && passenger.bookingStatus !== passenger.currentStatus && (
                                  <p className="text-[10px] text-ink-muted/20 font-mono mt-0.5">
                                    Booked: {passenger.bookingStatus}
                                  </p>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'text-[11px] font-bold font-mono tracking-wider px-2.5 py-1 rounded-lg',
                                  pCfg.textColor, pCfg.badgeBg
                                )}
                                style={{ border: `1px solid ${pCfg.borderColor}20` }}
                              >
                                {passenger.currentStatus}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Track toggle */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleTrackToggle}
                className={cn(
                  'w-full py-3.5 rounded-xl text-sm font-display font-bold tracking-wide transition-all duration-200 border-2',
                  isTracking
                    ? 'bg-surface border-edge text-ink-muted hover:border-red-400/40 hover:text-red-400'
                    : 'bg-brand text-ground border-brand glow-signal-strong hover:brightness-110'
                )}
              >
                {isTracking ? 'Stop Tracking' : '+ Track Updates'}
              </motion.button>

              {/* Refresh */}
              <div className="text-center pt-1 pb-4">
                <button
                  onClick={() => refetch()}
                  className="text-[11px] text-ink-muted/25 hover:text-brand transition-colors font-mono tracking-wider inline-flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  refresh
                </button>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
