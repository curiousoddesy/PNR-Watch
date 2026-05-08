import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { DEMO_PNRS } from '../services/demoData'
import { useThemeContext } from '../contexts/ThemeContext'
import {
  AppBar,
  Button,
  IconButton,
  ListRow,
  PressableCard,
  Sheet,
  StatusPill,
  toneForStatus,
} from '../components/primitives'
import { cn } from '../utils/cn'

const QRScanner = lazy(() => import('../components/qr/QRScanner'))

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

export const HomePage: React.FC = () => {
  const [pnr, setPnr] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { recentQueries, pnrs } = usePNRStore()
  const { currentMode, setThemeMode } = useThemeContext()

  useEffect(() => {
    if (isDesktop()) inputRef.current?.focus()
  }, [])

  const isValid = /^\d{10}$/.test(pnr)

  const submit = () => {
    if (!isValid) return
    usePNRStore.getState().addToRecent(pnr)
    navigate(`/status/${pnr}`)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPnr(v)
  }

  const onScan = (text: string) => {
    setScanOpen(false)
    const digits = text.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 10) {
      usePNRStore.getState().addToRecent(digits)
      navigate(`/status/${digits}`)
    } else {
      setPnr(digits)
      inputRef.current?.focus()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppBar
        title="PNR Watch"
        trailing={
          <IconButton
            aria-label={`Switch to ${currentMode === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setThemeMode(currentMode === 'dark' ? 'light' : 'dark')}
            size="sm"
          >
            {currentMode === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </IconButton>
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-32">
        {/* Hero */}
        <section className="pt-10 pb-7">
          <h1 className="text-[40px] sm:text-[48px] leading-[1.05] font-semibold tracking-tight">
            Track your PNR.
          </h1>
          <p className="mt-3 text-[16px] text-ink-2 tracking-tight max-w-md">
            Enter a 10-digit number. We'll keep watch and tell you the moment anything changes.
          </p>
        </section>

        {/* Input card */}
        <PressableCard elevation="raised" className="p-1.5">
          <div
            className={cn(
              'flex items-center gap-2 px-4 rounded-[14px] transition-colors duration-150',
              isFocused ? 'bg-surface-2' : 'bg-transparent',
            )}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pnr}
              onChange={handleInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="0000000000"
              autoComplete="off"
              aria-label="PNR number"
              className="flex-1 bg-transparent border-0 outline-none focus:ring-0 py-4 font-mono text-[26px] sm:text-[28px] tracking-[0.06em] text-ink placeholder:text-ink-3/60"
            />
            <AnimatePresence>
              {pnr.length > 0 && pnr.length < 10 && (
                <motion.div key="clear" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.12 }}>
                  <IconButton
                    aria-label="Clear"
                    size="sm"
                    onClick={() => { setPnr(''); inputRef.current?.focus() }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </IconButton>
                </motion.div>
              )}
              {isValid && (
                <motion.button
                  key="go"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={submit}
                  aria-label="Check status"
                  className="flex items-center justify-center w-9 h-9 rounded-pill bg-ink text-paper"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </PressableCard>

        {/* Progress + hint row */}
        <div className="flex items-center justify-between mt-3 px-1.5 h-5">
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-[3px] w-3 rounded-pill transition-colors duration-200',
                  i < pnr.length ? 'bg-ink' : 'bg-rule-strong',
                )}
              />
            ))}
          </div>
          <p className="text-[12px] text-ink-2 tracking-tight" aria-live="polite">
            {pnr.length === 0 ? '10 digits' : pnr.length < 10 ? `${10 - pnr.length} to go` : 'Ready'}
          </p>
        </div>

        {/* Secondary actions */}
        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setScanOpen(true)}
            leading={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M7 12h10" />
              </svg>
            }
          >
            Scan ticket
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/tracking')}
            leading={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4M21 7l-9 4M12 11v10" />
              </svg>
            }
          >
            Trips{pnrs.length > 0 ? ` · ${pnrs.length}` : ''}
          </Button>
        </div>

        {/* Recent */}
        {recentQueries.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-3 mb-3 px-2">
              Recent
            </h2>
            <PressableCard elevation="raised">
              {recentQueries.slice(0, 5).map((recent) => (
                <ListRow
                  key={recent}
                  title={<span className="font-mono tracking-wider text-[16px]">{recent}</span>}
                  trailing={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  }
                  onPress={() => {
                    usePNRStore.getState().addToRecent(recent)
                    navigate(`/status/${recent}`)
                  }}
                />
              ))}
            </PressableCard>
          </section>
        )}

        {/* Demo gallery — when no recents */}
        {recentQueries.length === 0 && (
          <section className="mt-12">
            <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-3 mb-3 px-2">
              Try a sample
            </h2>
            <PressableCard elevation="raised">
              {Object.values(DEMO_PNRS).map((sample) => (
                <ListRow
                  key={sample.id}
                  title={
                    <span className="text-[15px]">
                      {sample.trainName}
                      <span className="text-ink-3 font-normal"> · {sample.from} → {sample.to}</span>
                    </span>
                  }
                  subtitle={`Sample · ${sample.dateOfJourney.slice(0, 10)}`}
                  trailing={<StatusPill tone={toneForStatus(sample.status.currentStatus)} size="sm">{sample.status.currentStatus.split('/')[0]}</StatusPill>}
                  onPress={() => navigate(`/status/${sample.number}`)}
                />
              ))}
            </PressableCard>
          </section>
        )}
      </main>

      {/* Scan sheet */}
      <Sheet open={scanOpen} onClose={() => setScanOpen(false)} ariaLabel="Scan QR code from your ticket">
        <div className="px-5 pt-2 pb-6">
          <h2 className="text-[20px] font-semibold tracking-tight">Scan a ticket QR</h2>
          <p className="text-[13px] text-ink-2 tracking-tight mt-1">
            Position the QR code from your booking inside the frame.
          </p>
          <div className="mt-5">
            <Suspense fallback={<div className="h-64 rounded-card bg-surface-2" />}>
              {scanOpen && <QRScanner onScan={onScan} />}
            </Suspense>
          </div>
        </div>
      </Sheet>
    </motion.div>
  )
}
