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
  tintGlow: string
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  CNF:     { bg: 'rgba(52, 199, 89, 0.75)',   textColor: 'text-green-600 dark:text-green-400',   badgeBg: 'bg-green-500/10',   borderColor: '#34C759', fullLabel: 'CONFIRMED', tintGlow: 'rgba(52,199,89,0.25)' },
  RAC:     { bg: 'rgba(255, 159, 10, 0.75)',   textColor: 'text-amber-600 dark:text-amber-400',   badgeBg: 'bg-amber-500/10',   borderColor: '#FF9F0A', fullLabel: 'RAC',       tintGlow: 'rgba(255,159,10,0.25)' },
  WL:      { bg: 'rgba(255, 149, 0, 0.75)',    textColor: 'text-orange-600 dark:text-orange-400',  badgeBg: 'bg-orange-500/10',  borderColor: '#FF9500', fullLabel: 'WAITLIST',  tintGlow: 'rgba(255,149,0,0.25)' },
  PQWL:    { bg: 'rgba(255, 149, 0, 0.75)',    textColor: 'text-orange-600 dark:text-orange-400',  badgeBg: 'bg-orange-500/10',  borderColor: '#FF9500', fullLabel: 'PQWL',      tintGlow: 'rgba(255,149,0,0.25)' },
  RLWL:    { bg: 'rgba(175, 82, 222, 0.75)',   textColor: 'text-violet-600 dark:text-violet-400',  badgeBg: 'bg-violet-500/10',  borderColor: '#AF52DE', fullLabel: 'RLWL',      tintGlow: 'rgba(175,82,222,0.25)' },
  CAN:     { bg: 'rgba(255, 59, 48, 0.75)',    textColor: 'text-red-600 dark:text-red-400',        badgeBg: 'bg-red-500/10',     borderColor: '#FF3B30', fullLabel: 'CANCELLED', tintGlow: 'rgba(255,59,48,0.25)' },
  FLUSHED: { bg: 'rgba(142, 142, 147, 0.6)',   textColor: 'text-gray-500 dark:text-gray-400',      badgeBg: 'bg-gray-500/10',    borderColor: '#8E8E93', fullLabel: 'EXPIRED',   tintGlow: 'rgba(142,142,147,0.15)' },
  Unknown: { bg: 'rgba(142, 142, 147, 0.6)',   textColor: 'text-gray-500 dark:text-gray-400',      badgeBg: 'bg-gray-500/10',    borderColor: '#8E8E93', fullLabel: 'UNKNOWN',   tintGlow: 'rgba(142,142,147,0.15)' },
}

const Divider: React.FC = () => (
  <div className="flex items-center -mx-6">
    <div className="w-5 h-5 rounded-full bg-ground flex-shrink-0 -ml-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]" />
    <div className="flex-1 border-t border-dashed border-ink/[0.06]" />
    <div className="w-5 h-5 rounded-full bg-ground flex-shrink-0 -mr-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]" />
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
    <div className="min-h-screen bg-ground bg-vivid">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 px-5 pt-7 pb-3 max-w-lg mx-auto relative z-10"
      >
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-2xl glass-button flex items-center justify-center text-ink-muted hover:text-brand transition-colors"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-[11px] text-ink-muted/40 font-medium tracking-widest uppercase leading-none">PNR</p>
          <p className="font-mono text-lg text-brand font-semibold tracking-[0.1em] leading-tight mt-0.5">
            {pnrNumber}
          </p>
        </div>
      </motion.div>

      <div className="px-5 pb-12 max-w-lg mx-auto space-y-4 relative z-10">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <div className="w-full h-36 rounded-3xl glass animate-pulse" />
            <div className="glass rounded-3xl p-6 space-y-4 animate-pulse">
              <div className="h-3 w-20 bg-ink/[0.06] rounded-full" />
              <div className="h-5 w-44 bg-ink/[0.06] rounded-full" />
              <div className="h-3 w-full bg-ink/[0.04] rounded-full" />
              <div className="h-3 w-2/3 bg-ink/[0.04] rounded-full" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-heavy rounded-3xl p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <p className="text-ink font-display font-bold mb-1">Could not fetch status</p>
            <p className="text-[14px] text-ink-muted/50 mb-6">
              {error instanceof Error ? error.message : 'Try again in a moment'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-brand text-white rounded-2xl text-[15px] font-semibold shadow-[0_4px_16px_rgba(0,122,255,0.25)] hover:shadow-[0_6px_24px_rgba(0,122,255,0.35)] transition-all"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Main content */}
        <AnimatePresence>
          {pnrData && status && !isLoading && (
            <>
              {/* Status stamp — colored tinted glass */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="glass-tinted rounded-3xl overflow-hidden relative"
                style={{
                  background: cfg.bg,
                  ['--tint-glow' as any]: cfg.tintGlow,
                }}
              >
                {/* Specular highlight overlay */}
                <div className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
                  }}
                />
                <div className="relative py-9 px-6 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                  >
                    <p className="text-white/50 text-[11px] font-medium tracking-[0.25em] uppercase mb-2">
                      Booking Status
                    </p>
                    <p className="text-white font-display font-bold leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                      style={{ fontSize: 'clamp(2.5rem, 9vw, 3.5rem)', letterSpacing: '0.02em' }}
                    >
                      {cfg.fullLabel}
                    </p>
                    {status.chartPrepared && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        transition={{ delay: 0.4 }}
                        className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm"
                      >
                        <div className="w-[5px] h-[5px] rounded-full bg-white/80 animate-signal-pulse" />
                        <span className="text-white/70 text-[11px] font-medium tracking-widest uppercase">Chart Prepared</span>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>

              {/* Journey card — liquid glass */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.5 }}
                className="glass-heavy rounded-3xl overflow-hidden"
              >
                {/* Train info */}
                <div className="px-6 pt-6 pb-4">
                  <p className="text-[11px] text-ink-muted/40 font-medium tracking-widest uppercase mb-1">Train</p>
                  <p className="text-ink font-display font-bold text-lg leading-snug">
                    <span className="font-mono text-brand">{pnrData.trainNumber}</span>
                    <span className="text-ink/10 mx-2">|</span>
                    <span className="text-ink/70">{pnrData.trainName}</span>
                  </p>
                </div>

                <Divider />

                {/* Route */}
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] text-ink-muted/40 font-medium tracking-widest uppercase mb-1">From</p>
                      <p className="text-ink font-display font-bold text-xl leading-tight">{pnrData.from}</p>
                      {status.trainInfo.departureTime && (
                        <p className="font-mono text-[13px] text-brand/60 mt-1">{status.trainInfo.departureTime}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 flex-shrink-0 px-3">
                      <div className="flex items-center gap-1 text-ink-muted/20">
                        <div className="w-6 border-t border-dashed border-current" />
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                      {status.trainInfo.duration && (
                        <p className="font-mono text-[10px] text-ink-muted/25 whitespace-nowrap">{status.trainInfo.duration}</p>
                      )}
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-[11px] text-ink-muted/40 font-medium tracking-widest uppercase mb-1">To</p>
                      <p className="text-ink font-display font-bold text-xl leading-tight">{pnrData.to}</p>
                      {status.trainInfo.arrivalTime && (
                        <p className="font-mono text-[13px] text-brand/60 mt-1">{status.trainInfo.arrivalTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Journey chips — glass pill badges */}
                  <div className="flex items-center gap-2 mt-5">
                    <span className="text-[12px] font-medium text-ink-muted/50 px-3 py-1 rounded-xl bg-ink/[0.04]">{pnrData.dateOfJourney}</span>
                    {pnrData.class !== '—' && (
                      <span className="text-[12px] font-medium text-ink-muted/50 px-3 py-1 rounded-xl bg-ink/[0.04] uppercase">{pnrData.class}</span>
                    )}
                  </div>
                </div>

                {/* Passengers */}
                {status.passengers.length > 0 && (
                  <>
                    <Divider />
                    <div className="px-6 pb-6 pt-4">
                      <p className="text-[11px] text-ink-muted/40 font-medium tracking-widest uppercase mb-3.5">
                        {status.passengers.length === 1 ? '1 Passenger' : `${status.passengers.length} Passengers`}
                      </p>
                      <div className="space-y-1">
                        {status.passengers.map((passenger, i) => {
                          const pCfg = STATUS_CONFIG[passenger.currentStatus] ?? STATUS_CONFIG.Unknown
                          return (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-ink/[0.04] last:border-0">
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[15px] text-ink font-semibold">{passenger.name}</span>
                                  {passenger.age > 0 && (
                                    <span className="text-[12px] text-ink-muted/40 font-mono">{passenger.age}{passenger.gender}</span>
                                  )}
                                </div>
                                {passenger.coachPosition && passenger.seatNumber && (
                                  <p className="font-mono text-[12px] text-ink-muted/30 mt-0.5">
                                    {passenger.coachPosition} · Seat {passenger.seatNumber}
                                  </p>
                                )}
                                {passenger.bookingStatus && passenger.bookingStatus !== passenger.currentStatus && (
                                  <p className="text-[11px] text-ink-muted/20 font-mono mt-0.5">
                                    Booked: {passenger.bookingStatus}
                                  </p>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'text-[11px] font-bold font-mono tracking-wider px-3 py-1.5 rounded-xl',
                                  pCfg.textColor, pCfg.badgeBg
                                )}
                                style={{ border: `0.5px solid ${pCfg.borderColor}20` }}
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

              {/* Track toggle — glass or brand filled */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                onClick={handleTrackToggle}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'w-full py-4 rounded-2xl text-[15px] font-semibold tracking-wide transition-all duration-200',
                  isTracking
                    ? 'glass-button text-ink-muted hover:text-red-500'
                    : 'bg-brand text-white shadow-[0_4px_20px_rgba(0,122,255,0.3)] hover:shadow-[0_6px_28px_rgba(0,122,255,0.4)]'
                )}
              >
                {isTracking ? 'Stop Tracking' : '+ Track Updates'}
              </motion.button>

              {/* Refresh */}
              <div className="text-center pt-1 pb-4">
                <button
                  onClick={() => refetch()}
                  className="text-[12px] text-ink-muted/25 hover:text-brand transition-colors font-medium tracking-wide inline-flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
