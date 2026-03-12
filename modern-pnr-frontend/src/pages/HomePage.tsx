import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { useThemeContext } from '../contexts/ThemeContext'
import { cn } from '../utils/cn'

const STATUS_DOT: Record<string, string> = {
  CNF: 'bg-emerald-400',
  RAC: 'bg-amber-400',
  WL: 'bg-orange-400',
  PQWL: 'bg-orange-400',
  CAN: 'bg-red-400',
}

export const HomePage: React.FC = () => {
  const [pnr, setPnr] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { recentQueries } = usePNRStore()
  const { currentMode, setThemeMode } = useThemeContext()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const isValid = /^\d{10}$/.test(pnr)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      usePNRStore.getState().addToRecent(pnr)
      navigate(`/status/${pnr}`)
    }
  }

  const handleRecentClick = (pnrNumber: string) => {
    usePNRStore.getState().addToRecent(pnrNumber)
    navigate(`/status/${pnrNumber}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPnr(value)
  }

  const formatPNR = (value: string) => {
    if (value.length <= 3) return value
    if (value.length <= 6) return `${value.slice(0, 3)} ${value.slice(3)}`
    return `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`
  }

  const getRecentStatus = (pnrNumber: string) => {
    const { pnrs } = usePNRStore.getState()
    return pnrs.find(p => p.number === pnrNumber)?.status.currentStatus
  }

  return (
    <div className="min-h-screen bg-ground bg-mesh bg-dots flex flex-col relative overflow-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center justify-between px-6 pt-8"
      >
        <div>
          <h1 className="font-display font-extrabold text-[22px] tracking-tight leading-none">
            <span className="text-brand">PNR</span>
            <span className="text-ink/15 mx-0.5">/</span>
            <span className="text-ink">WATCH</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-signal-pulse" />
            <span className="text-[10px] font-mono text-ink-muted/50 tracking-[0.2em] uppercase">Live Status</span>
          </div>
        </div>

        <button
          onClick={() => setThemeMode(currentMode === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-ink-muted hover:text-brand transition-colors"
          aria-label="Toggle dark mode"
        >
          {currentMode === 'dark' ? (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="5" />
              <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
            </svg>
          )}
        </button>
      </motion.div>

      {/* Main — vertically centered */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm -mt-8"
        >

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-edge/60 to-transparent" />
            <div className="flex items-center gap-2 px-3">
              <svg className="w-3.5 h-3.5 text-brand/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 17l.01-.011M7 17l.01-.011M11 17l.01-.011M3 13V7a2 2 0 012-2h14a2 2 0 012 2v6M3 13h18M3 13l-1 4h20l-1-4"
                />
              </svg>
              <p className="text-[10px] font-mono font-medium tracking-[0.2em] uppercase text-ink-muted/40">
                Indian Railways
              </p>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-edge/60 to-transparent" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* PNR input */}
            <div className="relative group">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formatPNR(pnr)}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter PNR number"
                autoComplete="off"
                className={cn(
                  'w-full h-16 px-5 font-mono text-2xl tracking-[0.15em] font-semibold',
                  'bg-surface border rounded-2xl text-ink',
                  'placeholder:font-sans placeholder:text-base placeholder:tracking-normal',
                  'placeholder:font-normal placeholder:text-ink-muted/30',
                  'focus:outline-none transition-all duration-300',
                  (isFocused || isValid)
                    ? 'border-brand/60 glow-signal'
                    : 'border-edge hover:border-edge/80'
                )}
              />

              <AnimatePresence>
                {pnr.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    type="button"
                    onClick={() => { setPnr(''); inputRef.current?.focus() }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-edge/40 flex items-center justify-center text-ink-muted hover:bg-brand/15 hover:text-brand transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Digit progress — 10 segments */}
            <div className="flex gap-1 px-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    backgroundColor: i < pnr.length
                      ? isValid ? 'var(--color-brand)' : 'var(--color-ink-muted)'
                      : 'var(--color-edge)',
                    opacity: i < pnr.length ? 1 : 0.5,
                    scaleY: i === pnr.length - 1 ? [1, 2, 1] : 1,
                  }}
                  transition={{ duration: 0.12 }}
                  className="h-1 rounded-full flex-1 origin-center"
                />
              ))}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!isValid}
              whileTap={isValid ? { scale: 0.97 } : undefined}
              className={cn(
                'w-full h-[52px] rounded-xl font-display font-bold tracking-wide text-sm',
                'transition-all duration-300 flex items-center justify-center gap-2',
                isValid
                  ? 'bg-brand text-ground border-2 border-brand glow-signal-strong hover:brightness-110'
                  : 'bg-surface text-ink-muted/40 border-2 border-edge cursor-not-allowed'
              )}
            >
              <span>Check Status</span>
              {isValid && (
                <motion.svg
                  initial={{ x: -4, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
              )}
            </motion.button>
          </form>

          {/* Recent PNRs */}
          <AnimatePresence>
            {recentQueries.length > 0 && pnr.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-10"
              >
                <p className="text-[10px] text-ink-muted/30 font-mono font-medium tracking-[0.2em] uppercase mb-3 text-center">
                  Recent
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  {recentQueries.map((recent) => {
                    const status = getRecentStatus(recent)
                    return (
                      <button
                        key={recent}
                        onClick={() => handleRecentClick(recent)}
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2 rounded-xl',
                          'glass hover:border-brand/30',
                          'transition-all duration-200 group'
                        )}
                      >
                        {status && (
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[status] ?? 'bg-edge')} />
                        )}
                        <span className="font-mono text-[13px] text-ink/70 tracking-wider group-hover:text-brand transition-colors">{recent}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {recentQueries.length === 0 && pnr.length === 0 && (
            <div className="text-center mt-10">
              <p className="text-xs text-ink-muted/25 tracking-wide font-mono">
                10-digit number from your booking confirmation
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* QR scan FAB */}
      <div className="fixed bottom-24 right-6 z-20">
        <button
          onClick={() => setShowScanner(true)}
          className={cn(
            'w-11 h-11 rounded-xl glass shadow-lg',
            'flex items-center justify-center',
            'hover:border-brand/40 hover:text-brand hover:glow-signal hover:scale-105 transition-all duration-200'
          )}
          aria-label="Scan QR code"
        >
          <svg className="w-[18px] h-[18px] text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 9V6a3 3 0 013-3h3M3 15v3a3 3 0 003 3h3M15 3h3a3 3 0 013 3v3M15 21h3a3 3 0 003-3v-3M9 9h6v6H9z"
            />
          </svg>
        </button>
      </div>

      {showScanner && (
        <QRScannerModal
          onScan={(result) => {
            setShowScanner(false)
            const digits = result.replace(/\D/g, '').slice(0, 10)
            if (digits.length === 10) {
              usePNRStore.getState().addToRecent(digits)
              navigate(`/status/${digits}`)
            } else {
              setPnr(digits)
              inputRef.current?.focus()
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

const QRScannerModal: React.FC<{
  onScan: (result: string) => void
  onClose: () => void
}> = ({ onScan, onClose }) => {
  const scannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let scanner: any = null

    const init = async () => {
      try {
        const { Html5QrcodeScanner, Html5QrcodeScanType } = await import('html5-qrcode')
        scanner = new Html5QrcodeScanner('qr-reader', {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        }, false)
        scanner.render(
          (text: string) => { scanner?.clear().catch(() => {}); onScan(text) },
          () => {}
        )
      } catch {
        // Camera unavailable
      }
    }

    init()
    return () => { scanner?.clear().catch(() => {}) }
  }, [onScan])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-edge"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-ink">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-ground flex items-center justify-center text-ink-muted hover:text-brand transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div id="qr-reader" ref={scannerRef} className="w-full rounded-xl overflow-hidden bg-ground" />
        <p className="text-xs text-ink-muted/40 text-center mt-4 font-mono">
          Position the QR code from your booking within the frame
        </p>
      </motion.div>
    </motion.div>
  )
}
