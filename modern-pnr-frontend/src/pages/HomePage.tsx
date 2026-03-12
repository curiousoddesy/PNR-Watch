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
    <div className="min-h-screen bg-ground bg-vivid flex flex-col relative overflow-hidden">

      {/* Header — floating glass bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center justify-between px-6 pt-7 pb-2"
      >
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight leading-none">
            <span className="text-brand">PNR</span>
            <span className="text-ink/10 mx-0.5">/</span>
            <span className="text-ink">Watch</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-[6px] h-[6px] rounded-full bg-green-500 animate-signal-pulse" />
            <span className="text-[11px] font-medium text-ink-muted/60 tracking-wide">Live Status</span>
          </div>
        </div>

        <button
          onClick={() => setThemeMode(currentMode === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 rounded-2xl glass-button flex items-center justify-center text-ink-muted hover:text-brand transition-colors"
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

      {/* Main content — centered and focused */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg text-center"
        >
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand">Secure Tracking</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight text-ink mb-4">
              Track your journey <br />
              <span className="text-brand">with clarity.</span>
            </h2>
            <p className="text-ink-muted/60 text-base max-w-[280px] mx-auto leading-relaxed">
              Enter your 10-digit PNR for real-time status and automatic updates.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="relative group max-w-md mx-auto w-full">
            {/* PNR input — premium glass field */}
            <div className="relative z-10">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formatPNR(pnr)}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="000 000 0000"
                autoComplete="off"
                className={cn(
                  'w-full h-[84px] px-8 font-mono text-[32px] tracking-[0.16em] font-bold text-center',
                  'rounded-[32px] text-ink bg-transparent',
                  'placeholder:font-sans placeholder:text-[20px] placeholder:tracking-normal',
                  'placeholder:font-medium placeholder:text-ink-muted/20',
                  'focus:outline-none transition-all duration-500',
                  'glass-heavy border-2',
                  isFocused ? 'border-brand/40 shadow-[0_0_40px_rgba(0,122,255,0.15)] scale-[1.02]' : 'border-transparent'
                )}
              />

              <AnimatePresence>
                {pnr.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    type="button"
                    onClick={() => { setPnr(''); inputRef.current?.focus() }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/5 flex items-center justify-center text-ink-muted/40 hover:bg-ink/10 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Submit button — floating below */}
            <motion.div
              animate={{
                opacity: isValid ? 1 : 0,
                y: isValid ? 24 : 10,
                scale: isValid ? 1 : 0.95
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="absolute left-0 right-0 pointer-events-none"
            >
              <button
                type="submit"
                disabled={!isValid}
                className={cn(
                  'mx-auto px-10 h-14 rounded-full font-display font-bold text-[15px] pointer-events-auto',
                  'bg-brand text-white flex items-center justify-center gap-3',
                  'shadow-[0_20px_40px_rgba(0,122,255,0.3)] hover:shadow-[0_25px_50px_rgba(0,122,255,0.4)]',
                  'hover:scale-105 active:scale-95 transition-all duration-300'
                )}
              >
                <span>Check Live Status</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </motion.div>
          </form>

          {/* Recent PNRs — refined cards */}
          <AnimatePresence>
            {recentQueries.length > 0 && pnr.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mt-28"
              >
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="h-px w-8 bg-ink/[0.08]" />
                  <p className="text-[10px] text-ink-muted/30 font-bold tracking-[0.25em] uppercase">
                    Recent Searches
                  </p>
                  <div className="h-px w-8 bg-ink/[0.08]" />
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {recentQueries.slice(0, 3).map((recent, idx) => {
                    const status = getRecentStatus(recent)
                    return (
                      <motion.button
                        key={recent}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + (idx * 0.1) }}
                        onClick={() => handleRecentClick(recent)}
                        className="group relative flex items-center gap-4 pl-5 pr-6 py-4 rounded-[24px] glass-button overflow-hidden"
                      >
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          STATUS_DOT[status ?? ''] ?? 'bg-ink-muted/20'
                        )} />
                        <div className="text-left">
                          <p className="font-mono text-[15px] font-bold text-ink tracking-widest group-hover:text-brand transition-colors">
                            {recent}
                          </p>
                          <p className="text-[10px] font-bold text-ink-muted/40 uppercase tracking-wider">
                            {status || 'View Status'}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Action Footer — Floating Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, type: 'spring', damping: 25 }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="px-2 py-2 rounded-full glass-heavy flex items-center gap-1 shadow-2xl">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-ink/5 transition-all text-ink/70 hover:text-brand"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a3 3 0 013-3h3M3 15v3a3 3 0 003 3h3M15 3h3a3 3 0 013 3v3M15 21h3a3 3 0 003-3v-3M9 9h6v6H9z" />
            </svg>
            <span className="text-[13px] font-bold">Scan Ticket</span>
          </button>
          <div className="w-px h-6 bg-ink/[0.08]" />
          <button
            onClick={() => navigate('/tracking')}
            className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-ink/5 transition-all text-ink/70 hover:text-brand"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-[13px] font-bold">My Trips</span>
          </button>
        </div>
      </motion.div>

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md glass-heavy rounded-t-3xl sm:rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-ink">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ink/[0.06] flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div id="qr-reader" ref={scannerRef} className="w-full rounded-2xl overflow-hidden bg-black/5" />
        <p className="text-[13px] text-ink-muted/40 text-center mt-4">
          Position the QR code from your booking within the frame
        </p>
      </motion.div>
    </motion.div>
  )
}
