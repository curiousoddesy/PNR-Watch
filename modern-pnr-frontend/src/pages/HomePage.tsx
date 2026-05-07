import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePNRStore } from '../stores/pnrStore'
import { cn } from '../utils/cn'

export const HomePage: React.FC = () => {
  const [pnr, setPnr] = useState('')
  const [showScanner, setShowScanner] = useState(false)
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

  return (
    <div className="pt-20 pb-32">
      {/* The headline — the entire purpose of the page in one phrase. */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-16"
      >
        <p className="type-eyebrow mb-6">Live train status</p>
        <h1
          className="type-display text-ink"
          style={{ fontSize: 'clamp(48px, 9vw, 84px)' }}
        >
          Your journey,<br />
          <span className="text-ink-3">at a glance.</span>
        </h1>
        <p className="mt-6 text-[17px] leading-snug text-ink-2 max-w-md tracking-tight">
          Enter a 10-digit PNR. We'll keep watch and tell you the moment anything changes.
        </p>
      </motion.section>

      {/* The input — the only thing on this page that matters. */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <label htmlFor="pnr" className="type-eyebrow block mb-3">PNR</label>
        <div className="relative">
          <input
            ref={inputRef}
            id="pnr"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pnr}
            onChange={handleInputChange}
            placeholder="0000000000"
            autoComplete="off"
            className={cn(
              'w-full bg-transparent type-mono text-ink',
              'border-0 border-b border-rule-strong rounded-none',
              'pl-0 pr-16 py-4 focus:outline-none focus:ring-0',
              'placeholder:text-ink-3/60 focus:border-ink',
              'transition-colors duration-300'
            )}
            style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', letterSpacing: '0.04em' }}
          />

          <AnimatePresence>
            {pnr.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={() => { setPnr(''); inputRef.current?.focus() }}
                className="absolute right-0 top-1/2 -translate-y-1/2 btn-icon"
                aria-label="Clear"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="link inline-flex items-center gap-2 text-[14px] font-medium text-ink-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <path d="M7 12h10" />
            </svg>
            Scan ticket
          </button>

          <motion.button
            type="submit"
            disabled={!isValid}
            animate={{ opacity: isValid ? 1 : 0.25 }}
            className="btn-primary"
          >
            <span>Check status</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </motion.form>

      {/* Recent — a quiet list, not a row of buttons. */}
      <AnimatePresence>
        {recentQueries.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
                      className="text-ink-3 transition-transform group-hover:translate-x-1"
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
