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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Status Header — Premium Ticket Stamp */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative glass-tinted rounded-[40px] overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${cfg.bg} 0%, ${cfg.borderColor} 100%)`,
                  ['--tint-glow' as any]: cfg.tintGlow,
                }}
              >
                {/* Visual texture & Highlights */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_-20%,#fff,transparent)]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-white/40" />

                <div className="relative py-12 px-8 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase mb-3">
                      Current Status
                    </p>
                    <h2 className="text-white font-display font-black leading-none drop-shadow-2xl"
                      style={{ fontSize: 'clamp(3rem, 12vw, 4.5rem)', letterSpacing: '-0.02em' }}
                    >
                      {cfg.fullLabel}
                    </h2>

                    {status.chartPrepared && (
                      <div className="mt-6 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span className="text-white text-[10px] font-bold tracking-[0.15em] uppercase">Final Chart Ready</span>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Ticket "Cut" detail */}
                <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-10">
                  <div className="w-8 h-8 rounded-full bg-ground" />
                  <div className="w-8 h-8 rounded-full bg-ground" />
                </div>
              </motion.div>

              {/* Journey Details — Visual Track */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="glass-heavy rounded-[32px] p-8"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="text-left">
                    <p className="text-[10px] text-ink-muted/30 font-bold tracking-widest uppercase mb-2">From</p>
                    <h3 className="text-2xl font-display font-black text-ink leading-none">{pnrData.from}</h3>
                    <p className="font-mono text-[14px] text-brand font-bold mt-2">{status.trainInfo.departureTime || '--:--'}</p>
                  </div>

                  <div className="flex-1 px-6 flex flex-col items-center gap-3">
                    <div className="relative w-full flex items-center">
                      <div className="h-[2px] w-full bg-ink/[0.06] rounded-full" />
                      <motion.div
                        initial={{ left: 0 }}
                        animate={{ left: '60%' }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                        className="absolute w-2 h-2 rounded-full bg-brand shadow-[0_0_12px_rgba(0,122,255,0.6)]"
                      />
                      <svg className="absolute right-0 w-4 h-4 text-ink/[0.06]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-ink-muted/30 uppercase tracking-[0.2em]">
                      {status.trainInfo.duration || 'Scheduled'}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-ink-muted/30 font-bold tracking-widest uppercase mb-2">To</p>
                    <h3 className="text-2xl font-display font-black text-ink leading-none">{pnrData.to}</h3>
                    <p className="font-mono text-[14px] text-brand font-bold mt-2">{status.trainInfo.arrivalTime || '--:--'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-ink/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted/40 font-bold uppercase tracking-wider">Train</p>
                      <p className="text-[14px] font-bold text-ink">
                        <span className="font-mono text-brand">{pnrData.trainNumber}</span>
                        <span className="mx-2 text-ink/10">|</span>
                        {pnrData.trainName}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-ink/[0.04] text-[11px] font-bold text-ink-muted tracking-wide uppercase">{pnrData.class}</span>
                  </div>
                </div>
              </motion.div>

              {/* Passenger List — Premium Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[11px] font-black text-ink-muted/30 uppercase tracking-[0.2em]">Passenger Details</h4>
                  <span className="px-2 py-0.5 rounded-md bg-ink/[0.04] text-[10px] font-bold text-ink-muted/40 uppercase">
                    {status.passengers.length} Total
                  </span>
                </div>

                {status.passengers.map((passenger, i) => {
                  const pCfg = STATUS_CONFIG[passenger.currentStatus] ?? STATUS_CONFIG.Unknown
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + (i * 0.1) }}
                      className="glass-heavy rounded-[24px] p-5 flex items-center justify-between group hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-ink/[0.04] flex items-center justify-center text-ink-muted/30 font-display font-black text-lg">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-ink mb-0.5">{passenger.name}</p>
                          <p className="text-[11px] font-bold text-ink-muted/40 uppercase tracking-widest">
                            {passenger.coachPosition || 'TBA'} · <span className="text-brand/60">Seat {passenger.seatNumber || '--'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            'inline-block px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest uppercase',
                            pCfg.textColor, pCfg.badgeBg
                          )}
                          style={{ border: `1px solid ${pCfg.borderColor}20` }}
                        >
                          {passenger.currentStatus}
                        </span>
                        {passenger.bookingStatus && passenger.bookingStatus !== passenger.currentStatus && (
                          <p className="text-[9px] font-bold text-ink-muted/20 uppercase tracking-tighter mt-1.5">
                            Booked: {passenger.bookingStatus}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Action Bar — Sticky at bottom */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-4 pb-10 flex flex-col gap-4"
              >
                <button
                  onClick={handleTrackToggle}
                  className={cn(
                    'w-full h-16 rounded-[24px] font-display font-black text-[15px] tracking-widest uppercase transition-all duration-300',
                    isTracking
                      ? 'glass-button text-red-500 hover:bg-red-500/5'
                      : 'bg-brand text-white shadow-[0_20px_40px_rgba(0,122,255,0.3)] hover:scale-[1.02] active:scale-98'
                  )}
                >
                  {isTracking ? 'Remove from Trips' : 'Track Status Live'}
                </button>

                <button
                  onClick={() => refetch()}
                  className="flex items-center justify-center gap-3 py-3 text-ink-muted/30 hover:text-brand transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Update Status</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
