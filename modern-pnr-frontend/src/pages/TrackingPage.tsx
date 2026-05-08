import React, { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { usePNRStore } from '../stores/pnrStore'
import { usePNRAutoRefresh } from '../hooks/usePNRAutoRefresh'
import {
  AppBar,
  Button,
  IconButton,
  PressableCard,
  SegmentedControl,
  StatusPill,
  toneForStatus,
} from '../components/primitives'
import { useToastActions } from '../components/primitives'
import { cn } from '../utils/cn'
import type { PNR } from '../types'

type Filter = 'upcoming' | 'past' | 'all'

const formatDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return s
  }
}

const isUpcoming = (s: string) => {
  try {
    return new Date(s).getTime() >= new Date().setHours(0, 0, 0, 0)
  } catch {
    return true
  }
}

export const TrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToastActions()
  const { pnrs } = usePNRStore()
  const [filter, setFilter] = useState<Filter>('upcoming')

  const sorted = useMemo(() => {
    const list = [...pnrs].sort(
      (a, b) => new Date(a.dateOfJourney).getTime() - new Date(b.dateOfJourney).getTime(),
    )
    if (filter === 'all') return list
    if (filter === 'upcoming') return list.filter((p) => isUpcoming(p.dateOfJourney))
    return list.filter((p) => !isUpcoming(p.dateOfJourney))
  }, [pnrs, filter])

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['pnr-status'] })
    toast.info('Refreshing', 'Updating all tracked PNRs.')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppBar
        title="Trips"
        leading={
          <IconButton aria-label="Back" size="sm" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </IconButton>
        }
        trailing={
          pnrs.length > 0 ? (
            <IconButton aria-label="Refresh all" size="sm" onClick={handleRefreshAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
              </svg>
            </IconButton>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-32">
        <section className="pt-7 pb-5">
          <h1 className="text-[34px] font-semibold tracking-tight leading-[1.05]">
            {pnrs.length === 0 ? 'No trips yet.' : pnrs.length === 1 ? 'One trip.' : `${pnrs.length} trips.`}
          </h1>
          {pnrs.length > 0 && (
            <p className="mt-2 text-[15px] text-ink-2 tracking-tight">
              Refreshed every five minutes. Swipe a card to remove.
            </p>
          )}
        </section>

        {pnrs.length > 0 && (
          <div className="mb-5">
            <SegmentedControl<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { label: 'Upcoming', value: 'upcoming' },
                { label: 'Past', value: 'past' },
                { label: 'All', value: 'all' },
              ]}
            />
          </div>
        )}

        {pnrs.length === 0 ? (
          <PressableCard elevation="raised" className="p-6">
            <p className="text-[15px] text-ink-2 tracking-tight max-w-md mb-5">
              When you check a PNR and decide to keep an eye on it, it'll live here. Quiet, automatic, always current.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={() => navigate('/')}>Search a PNR</Button>
              <Link
                to="/status/0000000001"
                className="text-[14px] font-medium text-ink-2 hover:text-ink transition-colors"
              >
                See a sample trip →
              </Link>
            </div>
          </PressableCard>
        ) : sorted.length === 0 ? (
          <PressableCard elevation="raised" className="p-6">
            <p className="text-[15px] text-ink-2 tracking-tight">
              Nothing in this view.
              {filter === 'past' && ' All your trips are still upcoming.'}
              {filter === 'upcoming' && ' Try the Past tab to see completed journeys.'}
            </p>
          </PressableCard>
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {sorted.map((pnr, i) => (
                <PNRCardRow key={pnr.id} pnr={pnr} index={i} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>
    </motion.div>
  )
}

const PNRCardRow: React.FC<{ pnr: PNR; index: number }> = ({ pnr, index }) => {
  const navigate = useNavigate()
  const { removePNR } = usePNRStore()
  const toast = useToastActions()
  const reduced = useReducedMotion()
  const dragRef = useRef(0)
  const [committed, setCommitted] = useState(false)

  const status = pnr.status.currentStatus
  const head = status.split('/')[0]
  const muted = head === 'CAN' || head === 'FLUSHED'
  const { isFetching, lastUpdatedLabel } = usePNRAutoRefresh(pnr.id, pnr.number)

  const remove = () => {
    setCommitted(true)
    setTimeout(() => {
      removePNR(pnr.id)
      toast.info('Removed', `${pnr.number} no longer tracked.`)
    }, 180)
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: committed ? 0 : 1, y: 0, x: committed ? -120 : 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.3, delay: reduced ? 0 : index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Destructive backdrop revealed by drag */}
      <div className="absolute inset-0 rounded-card bg-danger flex items-center justify-end pr-5">
        <span className="text-[13px] font-semibold text-white tracking-tight">Remove</span>
      </div>

      <motion.div
        drag={reduced ? false : 'x'}
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDrag={(_, info) => { dragRef.current = info.offset.x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -64 || info.velocity.x < -300) {
            remove()
          }
        }}
        className="relative"
      >
        <PressableCard
          elevation="raised"
          className="p-4"
          onPress={() => navigate(`/status/${pnr.number}`)}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="font-mono text-[13px] tracking-wider text-ink-2">{pnr.number}</p>
              <p className={cn(
                'text-[17px] font-medium tracking-tight truncate mt-0.5',
                muted ? 'text-ink-3 line-through decoration-1' : 'text-ink',
              )}>
                {pnr.trainName}
              </p>
            </div>
            <StatusPill tone={toneForStatus(status)} size="sm">
              {head}
            </StatusPill>
          </div>

          <div className="flex items-center justify-between gap-3 text-[12px] text-ink-2 tracking-tight">
            <span className="truncate">
              {pnr.from} <span className="text-ink-3 mx-1">→</span> {pnr.to}
              <span className="text-ink-3 mx-2">·</span>
              {formatDate(pnr.dateOfJourney)}
            </span>
            {(isFetching || lastUpdatedLabel) && (
              <span className={cn('flex-shrink-0 text-[11px]', isFetching ? 'text-ink-2' : 'text-ink-3')}>
                {isFetching ? 'Updating…' : lastUpdatedLabel}
              </span>
            )}
          </div>
        </PressableCard>
      </motion.div>
    </motion.li>
  )
}
