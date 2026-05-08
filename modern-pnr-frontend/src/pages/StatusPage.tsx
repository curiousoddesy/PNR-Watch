import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { checkPNRStatus } from '../services/pnrService'
import { isDemoPNR } from '../services/demoData'
import { cn } from '../utils/cn'

const STATUS_LABEL: Record<string, string> = {
  CNF: 'Confirmed',
  RAC: 'RAC',
  WL: 'Waitlist',
  PQWL: 'Waitlist',
  RLWL: 'Waitlist',
  GNWL: 'Waitlist',
  CAN: 'Cancelled',
  FLUSHED: 'Expired',
  Unknown: 'Unknown',
}

const STATUS_TONE: Record<string, string> = {
  CNF: 'text-ink',
  RAC: 'text-ink',
  WL: 'text-ink',
  PQWL: 'text-ink',
  RLWL: 'text-ink',
  GNWL: 'text-ink',
  CAN: 'text-ink-3',
  FLUSHED: 'text-ink-3',
  Unknown: 'text-ink-3',
}

const formatDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' }) }
  catch { return s }
}

const relativeDay = (s: string) => {
  try {
    const target = new Date(s).setHours(0, 0, 0, 0)
    const today = new Date().setHours(0, 0, 0, 0)
    const diff = Math.round((target - today) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff > 1 && diff < 7) return `In ${diff} days`
    if (diff === -1) return 'Yesterday'
    if (diff < 0) return `${-diff} days ago`
    return null
  } catch { return null }
}

export const StatusPage: React.FC = () => {
  const { pnrNumber } = useParams<{ pnrNumber: string }>()
  const navigate = useNavigate()
  const { pnrs, addPNR, removePNR } = usePNRStore()

  const { data: pnrData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['pnr-status', pnrNumber],
    queryFn: () => checkPNRStatus(pnrNumber!),
    enabled: !!pnrNumber,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  })

  const isTracking = pnrs.some(p => p.number === pnrNumber)
  const isDemo = !!pnrNumber && isDemoPNR(pnrNumber)

  const handleTrackToggle = () => {
    if (!pnrData) return
    isTracking ? removePNR(pnrData.id) : addPNR(pnrData)
  }

  const status = pnrData?.status
  const statusKey = status?.currentStatus ?? 'Unknown'
  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey
  const dayLabel = pnrData ? relativeDay(pnrData.dateOfJourney) : null

  return (
    <div className="pt-8 pb-24 fade-up">
      <button
        onClick={() => navigate('/')}
        className="link inline-flex items-center gap-2 text-[14px] font-medium text-ink-2 mb-12"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {isLoading && (
        <div className="space-y-12 animate-pulse">
          <div className="h-3 w-16 bg-rule rounded-full" />
          <div className="h-20 w-3/4 bg-rule rounded-md" />
          <div className="h-px bg-rule" />
          <div className="space-y-3">
            <div className="h-3 w-20 bg-rule rounded-full" />
            <div className="h-5 w-1/2 bg-rule rounded-md" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16"
        >
          <p className="type-eyebrow mb-4">PNR · {pnrNumber}</p>
          <h2 className="type-display text-ink mb-4" style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}>
            We couldn't reach this one.
          </h2>
          <p className="text-[16px] text-ink-2 max-w-md mb-10 tracking-tight">
            {error instanceof Error ? error.message : 'Please try again in a moment.'}
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => refetch()} className="btn-primary">
              Try again
            </button>
            <button onClick={() => navigate('/')} className="link text-[14px] font-medium text-ink-2">
              Back to search
            </button>
          </div>
        </motion.div>
      )}

      {pnrData && status && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Verdict */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-20"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
              <p className="type-eyebrow">PNR</p>
              <span className="type-mono text-[13px] text-ink-2 tracking-wider">{pnrNumber}</span>
              {isDemo && (
                <span className="text-[10px] tracking-[0.16em] uppercase text-ink-3 px-2 py-0.5 border border-rule rounded-full">
                  Sample
                </span>
              )}
              {status.chartPrepared && (
                <>
                  <span className="text-ink-3">·</span>
                  <span className="text-[12px] text-ink-2 tracking-tight">Chart prepared</span>
                </>
              )}
            </div>

            <h1
              className={cn('type-display', STATUS_TONE[statusKey] ?? 'text-ink')}
              style={{ fontSize: 'clamp(56px, 13vw, 132px)' }}
            >
              {statusLabel}.
            </h1>

            {pnrData.passengerName && pnrData.passengerName !== 'Passenger' && (
              <p className="mt-6 text-[18px] text-ink-2 tracking-tight">
                For <span className="text-ink">{pnrData.passengerName}</span>
                {status.passengers.length > 1 && ` and ${status.passengers.length - 1} more`}.
              </p>
            )}
          </motion.section>

          {/* Journey */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <div className="flex items-baseline justify-between mb-8">
              <p className="type-eyebrow">Journey</p>
              {dayLabel && (
                <p className="text-[13px] text-ink-2 tracking-tight">{dayLabel}</p>
              )}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 sm:gap-12 items-end">
              <div>
                <p className="type-eyebrow mb-2 text-[10px]">From</p>
                <p className="type-headline text-ink truncate" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                  {pnrData.from || '—'}
                </p>
                <p className="type-mono text-[14px] text-ink-2 mt-2 tracking-wider">
                  {status.trainInfo.departureTime || '--:--'}
                </p>
              </div>

              <div className="text-right">
                <p className="type-eyebrow mb-2 text-[10px]">To</p>
                <p className="type-headline text-ink truncate" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                  {pnrData.to || '—'}
                </p>
                <p className="type-mono text-[14px] text-ink-2 mt-2 tracking-wider">
                  {status.trainInfo.arrivalTime || '--:--'}
                </p>
              </div>
            </div>

            {/* Route line — quiet, with a single dot. */}
            <div className="relative mt-10 mb-8 h-[2px] bg-rule">
              <div className="absolute left-0 -top-[3px] w-2 h-2 rounded-full bg-ink" />
              <div className="absolute right-0 -top-[3px] w-2 h-2 rounded-full bg-ink" />
              {status.trainInfo.duration && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-3 bg-paper">
                  <span className="text-[11px] text-ink-2 tracking-tight">{status.trainInfo.duration}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
              <Detail label="Train" value={
                <>
                  <span className="type-mono text-ink mr-2">{pnrData.trainNumber}</span>
                  <span className="text-ink-2">{pnrData.trainName}</span>
                </>
              } />
              <Detail label="Date" value={formatDate(pnrData.dateOfJourney)} />
              {pnrData.class && pnrData.class !== '—' && <Detail label="Class" value={pnrData.class} />}
              {pnrData.quota && <Detail label="Quota" value={pnrData.quota} />}
              {status.trainInfo.distance && <Detail label="Distance" value={status.trainInfo.distance} />}
            </div>
          </motion.section>

          {/* Passengers */}
          {status.passengers.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="mb-16"
            >
              <div className="flex items-baseline justify-between mb-4">
                <p className="type-eyebrow">Passengers</p>
                <span className="type-mono text-[12px] text-ink-3">{status.passengers.length}</span>
              </div>

              <ul className="border-t border-rule">
                {status.passengers.map((passenger, i) => {
                  const pStatus = passenger.currentStatus
                  const seat = [passenger.coachPosition, passenger.seatNumber].filter(Boolean).join(' · ')
                  const isFinal = pStatus.startsWith('CNF') || pStatus.startsWith('RAC')
                  return (
                    <li key={i} className="border-b border-rule">
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-5">
                        <span className="type-mono text-[13px] text-ink-3 w-6">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="text-[16px] text-ink tracking-tight">
                            {passenger.name || `Passenger ${i + 1}`}
                          </p>
                          <p className="text-[12px] text-ink-3 mt-0.5 tracking-tight">
                            {seat
                              ? <>Seat <span className="type-mono text-ink-2">{seat}</span></>
                              : passenger.bookingStatus && passenger.bookingStatus !== pStatus
                                ? <>Booked as <span className="type-mono">{passenger.bookingStatus}</span></>
                                : 'Awaiting allocation'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'type-mono text-[14px] tracking-wider',
                            isFinal ? 'text-ink' : 'text-ink-2'
                          )}>
                            {pStatus}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </motion.section>
          )}

          {/* Action */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="flex items-center justify-between gap-4 pt-2"
          >
            <button onClick={handleTrackToggle} className="btn-primary">
              {isTracking ? 'Stop tracking' : 'Track this trip'}
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="link inline-flex items-center gap-2 text-[14px] font-medium text-ink-2"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className={isFetching ? 'animate-spin' : ''}
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
              </svg>
              {isFetching ? 'Refreshing' : 'Refresh'}
            </button>
          </motion.section>
        </motion.div>
      )}
    </div>
  )
}

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="type-eyebrow mb-1.5 text-[10px]">{label}</p>
    <p className="text-[15px] text-ink tracking-tight">{value}</p>
  </div>
)
