import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  ariaLabel?: string
  /** Show drag handle on mobile. Default true. */
  showHandle?: boolean
  /** Disable drag-to-dismiss. Default false. */
  dragDisabled?: boolean
  /** ESC closes the sheet. Default true. */
  dismissible?: boolean
  className?: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  children,
  ariaLabel,
  showHandle = true,
  dragDisabled = false,
  dismissible = true,
  className,
}) => {
  const reduced = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // Focus management + ESC + body scroll lock
  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement as HTMLElement | null

    // Lock background scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') {
        const root = sheetRef.current
        if (!root) return
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)

    // Move focus into sheet
    const moveFocus = () => {
      const root = sheetRef.current
      if (!root) return
      const focusable = root.querySelector<HTMLElement>(FOCUSABLE)
      ;(focusable ?? root).focus({ preventScroll: true })
    }
    const focusTimer = setTimeout(moveFocus, 50)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
      clearTimeout(focusTimer)
      restoreFocusRef.current?.focus({ preventScroll: true })
    }
  }, [open, onClose, dismissible])

  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 120) {
      onClose()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-label={ariaLabel}
        >
          {/* Scrim */}
          <motion.div
            onClick={dismissible ? onClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={reduced ? { opacity: 0 } : { y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: '100%', opacity: 1 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 380, damping: 38 }
            }
            tabIndex={-1}
            className={cn(
              'relative bg-paper text-ink',
              // Mobile: bottom sheet, full-width
              'w-full max-h-[92vh] rounded-t-sheet',
              // Desktop: centered modal
              'sm:max-w-[460px] sm:max-h-[88vh] sm:rounded-sheet sm:my-8',
              'shadow-sheet sm:shadow-card',
              'flex flex-col overflow-hidden',
              className,
            )}
          >
            {/* Drag handle — drag is constrained here, not on the body */}
            {showHandle && (
              <motion.div
                drag={dragDisabled || reduced ? false : 'y'}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.2 }}
                onDragEnd={onDragEnd}
                className="flex-shrink-0 pt-2.5 pb-1.5 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden"
                aria-hidden
              >
                <span className="block w-9 h-1 rounded-full bg-rule-strong" />
              </motion.div>
            )}

            {/* Body — scrolls freely */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
