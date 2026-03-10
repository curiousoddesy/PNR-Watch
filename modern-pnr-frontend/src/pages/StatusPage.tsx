import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { checkPNRStatus } from '../services/pnrService'
import { cn } from '../utils/cn'

interface StatusCfg {
  bg: string        // full Tailwind bg class (for stamp)
  textOnBg: string  // text color on the stamp (always white variants)
  textColor: string // text color for badge on light bg
  badgeBg: string   // light bg for inline badges
  borderColor: string // for left-border accents
  fullLabel: string
  label: string
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  CNF:     { bg: 'bg-green-500',  textOnBg: 'text-white', textColor: 'text-green-700 dark:text-green-400',   badgeBg: 'bg-green-50 dark:bg-green-950/40',   borderColor: '#22c55e', fullLabel: 'CONFIRMED', label: 'Confirmed'  },
  RAC:     { bg: 'bg-amber-500',  textOnBg: 'text-white', textColor: 'text-amber-700 dark:text-amber-400',   badgeBg: 'bg-amber-50 dark:bg-amber-950/40',   borderColor: '#f59e0b', fullLabel: 'RAC',       label: 'RAC'        },
  WL:      { bg: 'bg-orange-500', textOnBg: 'text-white', textColor: 'text-orange-700 dark:text-orange-400', badgeBg: 'bg-orange-50 dark:bg-orange-950/40', borderColor: '#f97316', fullLabel: 'WAITLIST',  label: 'Waitlist'   },
  PQWL:    { bg: 'bg-orange-500', textOnBg: 'text-white', textColor: 'text-orange-700 dark:text-orange-400', badgeBg: 'bg-orange-50 dark:bg-orange-950/40', borderColor: '#f97316', fullLabel: 'PQWL',      label: 'PQWL'       },
  RLWL:    { bg: 'bg-purple-500', textOnBg: 'text-white', textColor: 'text-purple-700 dark:text-purple-400', badgeBg: 'bg-purple-50 dark:bg-purple-950/40', borderColor: '#a855f7', fullLabel: 'RLWL',      label: 'RLWL'       },
  CAN:     { bg: 'bg-red-500',    textOnBg: 'text-white', textColor: 'text-red-700 dark:text-red-400',       badgeBg: 'bg-red-50 dark:bg-red-950/40',       borderColor: '#ef4444', fullLabel: 'CANCELLED', label: 'Cancelled'  },
  FLUSHED: { bg: 'bg-slate-400',  textOnBg: 'text-white', textColor: 'text-slate-600 dark:text-slate-400',   badgeBg: 'bg-slate-50 dark:bg-slate-800/60',   borderColor: '#94a3b8', fullLabel: 'EXPIRED',   label: 'Expired'    },
  Unknown: { bg: 'bg-slate-400',  textOnBg: 'text-white', textColor: 'text-slate-600 dark:text-slate-400',   badgeBg: 'bg-slate-50 dark:bg-slate-800/60',   borderColor: '#94a3b8', fullLabel: 'UNKNOWN',   label: 'Unknown'    },
}

// Boarding-pass perforation divider
const Perforation: React.FC = () => (
  <div className="flex items-center -mx-5 my-0">
    <div className="w-4 h-4 rounded-full bg-ground flex-shrink-0 border border-edge border-l-0" />
    <div className="flex-1 border-t border-dashed border-edge" />
    <div className="w-4 h-4 rounded-full bg-ground flex-shrink-0 border border-edge border-r-0" />
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
    <div className="min-h-screen bg-ground bg-dotgrid">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-lg mx-auto">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-full bg-surface border border-edge flex items-center justify-center text-ink-muted hover:text-ink hover:border-ink/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase leading-none">PNR Number</p>
          <p className="font-mono text-lg text-ink font-medium tracking-[0.1em] leading-tight mt-0.5">
            {pnrNumber}
          </p>
        </div>
      </div>

      <div className="px-5 pb-12 max-w-lg mx-auto space-y-4">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="w-full h-36 rounded-2xl bg-surface border border-edge" />
            <div className="bg-surface rounded-2xl border border-edge p-5 space-y-3">
              <div className="h-3 w-24 bg-edge rounded-full" />
              <div className="h-5 w-48 bg-edge rounded-full" />
              <div className="h-3 w-full bg-edge rounded-full" />
              <div className="h-3 w-2/3 bg-edge rounded-full" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-2xl border border-edge p-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <p className="text-ink font-semibold mb-1">Could not fetch status</p>
            <p className="text-sm text-ink-muted/60 mb-6">
              {error instanceof Error ? error.message : 'Try again in a moment'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-medium font-display hover:bg-brand/90 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Main content */}
        <AnimatePresence>
          {pnrData && status && !isLoading && (
            <>
              {/* THE STAMP — visceral status reveal */}
              <motion.div
                initial={{ clipPath: 'circle(0% at 50% 55%)' }}
                animate={{ clipPath: 'circle(150% at 50% 55%)' }}
                transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn('rounded-2xl overflow-hidden', cfg.bg)}
              >
                <div className="py-8 px-6 text-center" style={{ transform: 'rotate(-0.5deg)' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <p className="text-white/50 text-xs font-medium tracking-[0.25em] uppercase mb-2">
                      Booking Status
                    </p>
                    <p
                      className="text-white font-display font-bold leading-none"
                      style={{ fontSize: 'clamp(2.75rem, 10vw, 4rem)', letterSpacing: '0.04em' }}
                    >
                      {cfg.fullLabel}
                    </p>
                    {status.chartPrepared && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-white/40 text-xs tracking-[0.25em] uppercase mt-3"
                      >
                        · Chart Prepared ·
                      </motion.p>
                    )}
                  </motion.div>
                </div>
              </motion.div>

              {/* Boarding pass card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="bg-surface rounded-2xl border border-edge overflow-hidden"
              >
                {/* Train header */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase mb-1">Train</p>
                  <p className="text-ink font-semibold">
                    <span className="font-mono">{pnrData.trainNumber}</span>
                    <span className="text-ink-muted/50 mx-2">·</span>
                    <span className="text-ink/80">{pnrData.trainName}</span>
                  </p>
                </div>

                {/* Perforation */}
                <Perforation />

                {/* Route — boarding pass layout */}
                <div className="px-5 py-5">
                  <div className="flex items-center gap-2">
                    {/* From */}
                    <div className="flex-1">
                      <p className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase mb-0.5">From</p>
                      <p className="text-ink font-display font-bold text-2xl leading-tight">{pnrData.from}</p>
                      {status.trainInfo.departureTime && (
                        <p className="font-mono text-xs text-ink-muted mt-1">{status.trainInfo.departureTime}</p>
                      )}
                    </div>

                    {/* Center arrow */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 px-1">
                      <div className="flex items-center gap-0.5 text-ink-muted/30">
                        <div className="w-4 border-t border-dashed border-current" />
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                      {status.trainInfo.duration && (
                        <p className="font-mono text-[10px] text-ink-muted/30 whitespace-nowrap">{status.trainInfo.duration}</p>
                      )}
                    </div>

                    {/* To */}
                    <div className="flex-1 text-right">
                      <p className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase mb-0.5">To</p>
                      <p className="text-ink font-display font-bold text-2xl leading-tight">{pnrData.to}</p>
                      {status.trainInfo.arrivalTime && (
                        <p className="font-mono text-xs text-ink-muted mt-1">{status.trainInfo.arrivalTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Journey meta */}
                  <div className="flex items-center gap-2 mt-4 text-xs text-ink-muted/50">
                    <span className="font-mono">{pnrData.dateOfJourney}</span>
                    {pnrData.class !== '—' && (
                      <>
                        <span>·</span>
                        <span className="font-mono uppercase">{pnrData.class}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Passengers */}
                {status.passengers.length > 0 && (
                  <>
                    <Perforation />
                    <div className="px-5 pb-5 pt-4">
                      <p className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase mb-3">
                        {status.passengers.length === 1 ? '1 Passenger' : `${status.passengers.length} Passengers`}
                      </p>
                      <div className="space-y-3">
                        {status.passengers.map((passenger, i) => {
                          const pCfg = STATUS_CONFIG[passenger.currentStatus] ?? STATUS_CONFIG.Unknown
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm text-ink font-medium">{passenger.name}</span>
                                  {passenger.age > 0 && (
                                    <span className="text-xs text-ink-muted">{passenger.age}{passenger.gender}</span>
                                  )}
                                </div>
                                {passenger.coachPosition && passenger.seatNumber && (
                                  <p className="font-mono text-xs text-ink-muted/50 mt-0.5">
                                    {passenger.coachPosition} · Seat {passenger.seatNumber}
                                  </p>
                                )}
                                {passenger.bookingStatus && passenger.bookingStatus !== passenger.currentStatus && (
                                  <p className="text-xs text-ink-muted/30 mt-0.5">
                                    Booked: {passenger.bookingStatus}
                                  </p>
                                )}
                              </div>
                              <span className={cn(
                                'text-xs font-bold font-mono tracking-wider px-2.5 py-1 rounded-lg',
                                pCfg.textColor, pCfg.badgeBg
                              )}>
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
                transition={{ delay: 0.35 }}
                onClick={handleTrackToggle}
                className={cn(
                  'w-full py-4 rounded-xl text-sm font-display font-bold tracking-wide transition-all duration-200',
                  isTracking
                    ? 'bg-surface border border-edge text-ink-muted hover:border-red-200 hover:text-red-500 hover:bg-red-50/50'
                    : 'bg-brand text-white shadow-[0_4px_20px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_28px_rgba(26,86,219,0.35)]'
                )}
              >
                {isTracking ? '× Stop Tracking' : '+ Track Updates'}
              </motion.button>

              {/* Refresh */}
              <div className="text-center pb-4">
                <button
                  onClick={() => refetch()}
                  className="text-xs text-ink-muted/30 hover:text-ink-muted transition-colors font-mono"
                >
                  ↻ refresh status
                </button>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
