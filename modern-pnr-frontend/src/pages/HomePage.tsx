import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { DEMO_PNRS } from '../services/demoData'
import { cn } from '../utils/cn'

export const HomePage: React.FC = () => {
  const [pnr, setPnr] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { recentQueries } = usePNRStore()

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

  const handleDemo = () => navigate(`/status/0000000001`)

  return (
    <div className="pt-16 sm:pt-24 pb-32 fade-up">
      {/* The headline — one phrase, room to breathe. */}
      <section className="mb-14">
        <p className="type-eyebrow mb-5">Live train status</p>
        <h1
          className="type-display text-ink"
          style={{ fontSize: 'clamp(44px, 9vw, 88px)' }}
        >
          Your journey,<br />
          <span className="text-ink-3">at a glance.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-snug text-ink-2 max-w-md tracking-tight">
          Enter a 10-digit PNR. We'll watch it for you and tell you the moment anything changes.
        </p>
      </section>

      {/* The input — tactile, with an inline action. */}
      <form onSubmit={handleSubmit} className="mb-7">
        <label htmlFor="pnr" className="type-eyebrow block mb-3">PNR</label>
        <div
          className={cn(
            'relative flex items-center gap-2 border-b transition-colors duration-300',
            isFocused ? 'border-ink' : 'border-rule-strong'
          )}
        >
          <input
            ref={inputRef}
            id="pnr"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pnr}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="0000000000"
            autoComplete="off"
            aria-describedby="pnr-hint"
            className={cn(
              'flex-1 bg-transparent type-mono text-ink',
              'border-0 rounded-none pl-0 py-4 focus:outline-none focus:ring-0',
              'placeholder:text-ink-3/50'
            )}
            style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', letterSpacing: '0.04em' }}
          />

          <AnimatePresence>
            {pnr.length > 0 && pnr.length < 10 && (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={() => { setPnr(''); inputRef.current?.focus() }}
                className="btn-icon"
                aria-label="Clear"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Submit — circular, slides in when valid. */}
          <AnimatePresence>
            {isValid && (
              <motion.button
                key="submit"
                initial={{ opacity: 0, scale: 0.6, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6, x: 8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                type="submit"
                aria-label="Check status"
                className="flex items-center justify-center w-11 h-11 rounded-full bg-ink text-paper transition-transform active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Live progress + helper hints, replacing static text. */}
        <div id="pnr-hint" className="flex items-center justify-between mt-3 h-5">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-[3px] w-3 rounded-full transition-colors duration-200',
                  i < pnr.length ? 'bg-ink' : 'bg-rule'
                )}
              />
            ))}
          </div>
          <p className="text-[12px] text-ink-3 tracking-tight">
            {pnr.length === 0
              ? '10 digits'
              : pnr.length < 10
                ? `${10 - pnr.length} more`
                : 'Press ↵ to check'}
          </p>
        </div>
      </form>

      {/* Secondary actions — quiet, equal weight. */}
      <div className="flex items-center gap-6 text-[14px] font-medium text-ink-2">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="link inline-flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 12h10" />
          </svg>
          Scan ticket
        </button>
        <button
          type="button"
          onClick={handleDemo}
          className="link inline-flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          See a demo
        </button>
      </div>

      {/* Recent — quiet hairline list. */}
      <AnimatePresence>
        {recentQueries.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-24"
          >
            <p className="type-eyebrow mb-4">Recent</p>
            <ul className="border-t border-rule">
              {recentQueries.slice(0, 5).map((recent) => (
                <li key={recent} className="border-b border-rule">
                  <button
                    onClick={() => handleRecentClick(recent)}
                    className="group w-full flex items-center justify-between py-5 text-left transition-opacity hover:opacity-60"
                  >
                    <span className="type-mono text-[18px] text-ink tracking-wider">
                      {recent}
                    </span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      className="text-ink-3 transition-transform duration-200 group-hover:translate-x-1"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Demo gallery — only visible if no recents, to avoid noise. */}
      {recentQueries.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-28"
        >
          <p className="type-eyebrow mb-4">Try one</p>
          <ul className="border-t border-rule">
            {Object.values(DEMO_PNRS).map((sample) => (
              <li key={sample.id} className="border-b border-rule">
                <button
                  onClick={() => navigate(`/status/${sample.number}`)}
                  className="group w-full flex items-center justify-between py-5 text-left transition-opacity hover:opacity-60"
                >
                  <div>
                    <p className="text-[16px] text-ink tracking-tight">
                      {sample.trainName}
                      <span className="text-ink-3 font-normal"> · {sample.from} → {sample.to}</span>
                    </p>
                    <p className="text-[12px] text-ink-3 mt-0.5 tracking-tight">
                      Sample · {sample.status.currentStatus.startsWith('WL') ? 'Waitlist' : sample.status.currentStatus.startsWith('RAC') ? 'RAC' : 'Confirmed'}
                    </p>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    className="text-ink-3 transition-transform duration-200 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-paper/95 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-paper border border-rule rounded-3xl p-8 mx-4 mb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="type-eyebrow mb-1">Scan</p>
            <h2 className="type-headline text-[22px] text-ink">QR code from your ticket</h2>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div id="qr-reader" ref={scannerRef} className="w-full rounded-2xl overflow-hidden" />
      </motion.div>
    </motion.div>
  )
}
