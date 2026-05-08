import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { checkPNRStatus } from '../services/pnrService'
import { isDemoPNR } from '../services/demoData'
import {
  Button,
  IconButton,
  ListRow,
  PressableCard,
  Sheet,
  Skeleton,
  StatusPill,
  toneForStatus,
} from '../components/primitives'
import { useToastActions } from '../components/primitives'
import { cn } from '../utils/cn'

const STATUS_LABEL: Record<string, string> = {
  CNF: 'Confirmed',
  RAC: 'RAC',
  WL: 'Waitlist',
  PQWL: 'PQ Waitlist',
  RLWL: 'RL Waitlist',
  GNWL: 'Waitlist',
  CAN: 'Cancelled',
  FLUSHED: 'Expired',
  Unknown: 'Unknown',
}

const formatDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return s
  }
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
  } catch {
    return null
  }
}

export const StatusPage: React.FC = () => {
  const { pnrNumber } = useParams<{ pnrNumber: string }>()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const { pnrs, addPNR, removePNR } = usePNRStore()
  const toast = useToastActions()

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['pnr-status', pnrNumber],
    queryFn: () => checkPNRStatus(pnrNumber!),
    enabled: !!pnrNumber,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  })

  const isTracking = pnrs.some((p) => p.number === pnrNumber)
  const isDemo = !!pnrNumber && isDemoPNR(pnrNumber)
  const status = data?.status
  const statusKey = status?.currentStatus.split('/')[0] ?? 'Unknown'
  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey
  const dayLabel = data ? relativeDay(data.dateOfJourney) : null

  // Close → navigate back
  const close = () => {
    setOpen(false)
    setTimeout(() => navigate(-1), 250)
  }

  // If user came directly to this URL with no history, replace -1 with /
  useEffect(() => {
    return () => { /* no-op */ }
  }, [])

  const handleTrack = () => {
    if (!data) return
    if (isTracking) {
      removePNR(data.id)
      toast.info('Stopped tracking', `${data.number}`)
    } else {
      addPNR(data)
      toast.success('Tracking', 'We\'ll watch this PNR every five minutes.')
    }
  }

  return (
    <Sheet open={open} onClose={close} ariaLabel={`Status for PNR ${pnrNumber}`}>
      <div className="px-5 pt-2 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-3">PNR</p>
            <p className="font-mono text-[20px] tracking-[0.06em] text-ink mt-0.5 truncate">
              {pnrNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="text-[10px] tracking-[0.16em] uppercase text-ink-3 px-2 h-5 flex items-center border border-rule rounded-pill">
                Sample
              </span>
            )}
            <IconButton aria-label="Close" size="sm" onClick={close}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton h={36} w="60%" />
            <Skeleton h={120} radius={16} />
            <Skeleton h={64} radius={16} />
            <Skeleton h={64} radius={16} />
          </div>
        )}

        {error && !isLoading && (
          <div className="py-6">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-danger mb-2">Error</p>
            <h2 className="text-[24px] font-semibold tracking-tight mb-2">We couldn't reach this one.</h2>
            <p className="text-[14px] text-ink-2 tracking-tight mb-6">
              {error instanceof Error ? error.message : 'Please try again in a moment.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => refetch()}>Try again</Button>
              <Button variant="ghost" onClick={close}>Back</Button>
            </div>
          </div>
        )}

        {data && status && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {/* Verdict — colored by tone for instant readability */}
            <div className="flex items-baseline justify-between gap-3 flex-wrap" aria-live="polite">
              <h1 className={cn(
                'text-[48px] sm:text-[60px] font-semibold tracking-tight leading-[1.0]',
                statusKey === 'CNF' && 'text-success',
                statusKey === 'RAC' && 'text-warning',
                (statusKey === 'WL' || statusKey === 'PQWL' || statusKey === 'RLWL' || statusKey === 'GNWL') && 'text-info',
                statusKey === 'CAN' && 'text-danger',
                (statusKey === 'FLUSHED' || statusKey === 'Unknown') && 'text-ink-2',
              )}>
                {statusLabel}.
              </h1>
              <StatusPill tone={toneForStatus(status.currentStatus)}>
                {status.currentStatus}
              </StatusPill>
            </div>

            {data.passengerName && data.passengerName !== 'Passenger' && (
              <p className="text-[15px] text-ink-2 tracking-tight">
                For <span className="text-ink">{data.passengerName}</span>
                {status.passengers.length > 1 && ` and ${status.passengers.length - 1} more`}.
              </p>
            )}

            {status.chartPrepared && (
              <div className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-pill bg-success-soft text-success text-[11px] font-semibold tracking-wide uppercase">
                <span className="block w-1.5 h-1.5 rounded-full bg-success" />
                Chart prepared
              </div>
            )}

            {/* Train + journey card */}
            <PressableCard elevation="raised" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0">
                  <p className="text-[14px] text-ink truncate font-medium tracking-tight">
                    {data.trainName}
                  </p>
                  <p className="font-mono text-[12px] text-ink-2 mt-0.5 tracking-wider">
                    {data.trainNumber}
                  </p>
                </div>
                {dayLabel && (
                  <span className="text-[12px] text-ink-2 tracking-tight whitespace-nowrap">
                    {dayLabel}
                  </span>
                )}
              </div>

              {/* Stations */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <div>
                  <p className="text-[20px] font-semibold tracking-tight truncate">{data.from}</p>
                  <p className="font-mono text-[13px] text-ink-2 mt-1 tracking-wider">
                    {status.trainInfo.departureTime || '--:--'}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center min-w-12">
                  <div className="relative w-full flex items-center">
                    <span className="block w-1.5 h-1.5 rounded-full bg-ink-3" />
                    <span className="flex-1 h-px bg-rule" />
                    <span className="block w-1.5 h-1.5 rounded-full bg-ink-3" />
                  </div>
                  {status.trainInfo.duration && (
                    <span className="text-[10px] text-ink-3 tracking-tight mt-1.5">
                      {status.trainInfo.duration}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-semibold tracking-tight truncate">{data.to}</p>
                  <p className="font-mono text-[13px] text-ink-2 mt-1 tracking-wider">
                    {status.trainInfo.arrivalTime || '--:--'}
                  </p>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-4 pt-4 border-t border-rule text-[12px] text-ink-2 tracking-tight">
                <span>{formatDate(data.dateOfJourney)}</span>
                {data.class && data.class !== '—' && (
                  <>
                    <span className="text-ink-3">·</span>
                    <span>{data.class}</span>
                  </>
                )}
                {data.quota && (
                  <>
                    <span className="text-ink-3">·</span>
                    <span>Quota {data.quota}</span>
                  </>
                )}
                {status.trainInfo.distance && (
                  <>
                    <span className="text-ink-3">·</span>
                    <span>{status.trainInfo.distance}</span>
                  </>
                )}
              </div>
            </PressableCard>

            {/* Passengers */}
            {status.passengers.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h3 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-3">Passengers</h3>
                  <span className="text-[11px] text-ink-3 font-mono">{status.passengers.length}</span>
                </div>
                <PressableCard elevation="raised">
                  {status.passengers.map((p, i) => {
                    const seat = [p.coachPosition, p.seatNumber].filter(Boolean).join(' · ')
                    return (
                      <ListRow
                        key={i}
                        leading={
                          <span className="font-mono text-[12px] text-ink-3 w-6 inline-block text-center">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        }
                        title={p.name || `Passenger ${i + 1}`}
                        subtitle={
                          seat
                            ? `Seat ${seat}`
                            : p.bookingStatus && p.bookingStatus !== p.currentStatus
                              ? `Booked as ${p.bookingStatus}`
                              : 'Awaiting allocation'
                        }
                        trailing={
                          <StatusPill tone={toneForStatus(p.currentStatus)} size="sm">
                            {p.currentStatus}
                          </StatusPill>
                        }
                      />
                    )
                  })}
                </PressableCard>
              </section>
            )}

            {/* Action footer */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant={isTracking ? 'secondary' : 'primary'}
                size="lg"
                onClick={handleTrack}
                fullWidth
              >
                {isTracking ? 'Stop tracking' : 'Track this trip'}
              </Button>
              <IconButton
                aria-label="Refresh"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className={isFetching ? 'animate-spin' : ''}
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
                </svg>
              </IconButton>
            </div>
          </motion.div>
        )}
      </div>
    </Sheet>
  )
}
