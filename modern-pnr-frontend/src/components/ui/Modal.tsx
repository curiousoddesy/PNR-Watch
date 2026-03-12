import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import { useFocusTrap, useReducedMotion, useScreenReader } from '../../hooks/useAccessibility'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  children: React.ReactNode
  className?: string
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className,
}) => {
  const modalRef = useFocusTrap(isOpen)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const { announce } = useScreenReader()

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      const modalTitle = title || 'Dialog opened'
      announce(`${modalTitle}. Press Escape to close.`)
      const timer = setTimeout(() => { modalRef.current?.focus() }, 100)
      return () => clearTimeout(timer)
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      announce('Dialog closed')
    }
  }, [isOpen, title, announce])

  useEffect(() => {
    if (!closeOnEscape) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  useEffect(() => {
    if (!isOpen) return
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const modal = modalRef.current
      if (!modal) return
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      if (event.shiftKey) {
        if (document.activeElement === firstElement) { lastElement?.focus(); event.preventDefault() }
      } else {
        if (document.activeElement === lastElement) { firstElement?.focus(); event.preventDefault() }
      }
    }
    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          {/* iOS-style dimmed backdrop with blur */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(20px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            }}
          />

          {/* Glass modal panel */}
          <motion.div
            ref={modalRef}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={prefersReducedMotion ? {} : {
              type: 'spring',
              stiffness: 350,
              damping: 30
            }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            className={cn(
              'relative w-full glass-heavy rounded-3xl sm:rounded-3xl focus:outline-none overflow-hidden',
              // On mobile: sheet-style from bottom
              'rounded-t-3xl sm:rounded-3xl',
              modalSizes[size],
              className
            )}
          >
            {/* Specular highlight — top edge light refraction */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10 pointer-events-none" />

            {/* Close button — iOS style circle */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-ink/[0.06] dark:bg-white/[0.08] flex items-center justify-center text-ink-muted/50 hover:text-ink hover:bg-ink/[0.1] dark:hover:bg-white/[0.12] transition-all focus:outline-none focus:ring-2 focus:ring-brand/50"
              aria-label="Close modal"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            {(title || description) && (
              <div className="px-6 pt-6 pb-2">
                {title && (
                  <h2 id="modal-title" className="text-[18px] font-display font-bold text-ink pr-8">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="mt-1 text-[14px] text-ink-muted/60">
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className
}) => (
  <div className={cn('px-6 pt-6 pb-2', className)}>
    {children}
  </div>
)

export const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className
}) => (
  <div className={cn('px-6 py-4', className)}>
    {children}
  </div>
)

export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className
}) => (
  <div className={cn(
    'px-6 py-4 flex justify-end gap-2',
    // Subtle top separator
    'border-t border-ink/[0.04] dark:border-white/[0.04]',
    className
  )}>
    {children}
  </div>
)
