import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { useThemeContext } from '../contexts/ThemeContext'
import { cn } from '../utils/cn'

const STATUS_DOT: Record<string, string> = {
  CNF: 'bg-green-500',
  RAC: 'bg-amber-500',
  WL: 'bg-orange-500',
  PQWL: 'bg-orange-500',
  CAN: 'bg-red-500',
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

  // Format: 123 456 7890
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
    <div className="min-h-screen bg-ground bg-dotgrid flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8">
        <div>
          <h1 className="font-display font-bold text-xl text-ink tracking-tight leading-none">
            PNR<span className="text-brand">·</span>WATCH
          </h1>
          <div className="h-px w-12 bg-edge mt-1.5" />
        </div>

        <button
          onClick={() => setThemeMode(currentMode === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-full bg-surface border border-edge flex items-center justify-center text-ink-muted hover:text-ink hover:border-ink/20 transition-all"
          aria-label="Toggle dark mode"
        >
          {currentMode === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="5" />
              <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* Main — vertically centered */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm -mt-12">

          {/* Eyebrow */}
          <p className="text-center text-xs font-medium tracking-[0.25em] uppercase text-ink-muted/40 mb-6">
            Indian Railways
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* PNR input */}
            <div className="relative">
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
                  'w-full h-16 px-5 font-mono text-2xl tracking-[0.15em] font-medium',
                  'bg-surface border-2 rounded-2xl',
                  'text-ink placeholder:font-sans placeholder:text-base placeholder:tracking-normal',
                  'placeholder:font-normal placeholder:text-ink-muted/30',
                  'focus:outline-none transition-all duration-200',
                  isFocused || isValid
                    ? 'border-brand shadow-[0_0_0_4px_rgba(26,86,219,0.08)]'
                    : 'border-edge'
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-ground flex items-center justify-center text-ink-muted hover:bg-edge transition-all"
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
                      ? isValid ? '#16a34a' : '#1a56db'
                      : '#e2e8f0',
                    scaleY: i === pnr.length - 1 ? [1, 1.6, 1] : 1,
                  }}
                  transition={{ duration: 0.12 }}
                  className="h-0.5 rounded-full flex-1 origin-center"
                />
              ))}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!isValid}
              animate={{
                backgroundColor: isValid ? '#1a56db' : '#e2e8f0',
                color: isValid ? '#ffffff' : '#94a3b8',
              }}
              whileTap={isValid ? { scale: 0.97 } : undefined}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'w-full h-14 rounded-xl font-display font-bold tracking-wide text-sm',
                'transition-shadow duration-300',
                isValid
                  ? 'shadow-[0_4px_24px_rgba(26,86,219,0.28)] hover:shadow-[0_6px_32px_rgba(26,86,219,0.38)]'
                  : ''
              )}
            >
              {isValid ? 'Check Status →' : 'Check Status'}
            </motion.button>
          </form>

          {/* Recent PNRs */}
          <AnimatePresence>
            {recentQueries.length > 0 && pnr.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-8"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-edge" />
                  <span className="text-xs text-ink-muted/40 font-medium tracking-[0.2em] uppercase">Recent</span>
                  <div className="flex-1 h-px bg-edge" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {recentQueries.map((recent) => {
                    const status = getRecentStatus(recent)
                    return (
                      <button
                        key={recent}
                        onClick={() => handleRecentClick(recent)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-xl',
                          'bg-surface border border-edge',
                          'hover:border-brand/40 hover:bg-brand/5 hover:shadow-sm',
                          'transition-all duration-150'
                        )}
                      >
                        {status && (
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[status] ?? 'bg-edge')} />
                        )}
                        <span className="font-mono text-sm text-ink tracking-wider">{recent}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {recentQueries.length === 0 && pnr.length === 0 && (
            <p className="text-center text-xs text-ink-muted/30 mt-8 tracking-wide">
              Found on your booking confirmation
            </p>
          )}
        </div>
      </div>

      {/* QR scan FAB */}
      <div className="fixed bottom-8 right-6">
        <button
          onClick={() => setShowScanner(true)}
          className={cn(
            'w-12 h-12 rounded-full bg-surface border border-edge shadow-md',
            'flex items-center justify-center',
            'hover:shadow-lg hover:border-brand/40 hover:scale-105 transition-all duration-200'
          )}
          aria-label="Scan QR code"
        >
          <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-ink">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ground flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div id="qr-reader" ref={scannerRef} className="w-full rounded-2xl overflow-hidden bg-ground" />
        <p className="text-xs text-ink-muted/50 text-center mt-4">
          Position the QR code from your booking within the frame
        </p>
      </motion.div>
    </motion.div>
  )
}
