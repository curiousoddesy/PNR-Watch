import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

export interface Toast {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export const useToastActions = () => {
  const { addToast } = useToast()
  return {
    success: (title: string, description?: string) => addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) => addToast({ type: 'error', title, description }),
    info: (title: string, description?: string) => addToast({ type: 'info', title, description }),
    warning: (title: string, description?: string) => addToast({ type: 'warning', title, description }),
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((curr) => curr.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const next: Toast = { id, duration: 3000, ...toast }
    setToasts((curr) => [...curr, next])
    if (next.duration && next.duration > 0) {
      setTimeout(() => removeToast(id), next.duration)
    }
    return id
  }, [removeToast])

  const clearToasts = useCallback(() => setToasts([]), [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

const TONE_BY_TYPE: Record<NonNullable<Toast['type']>, string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
}

const ToastViewport: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex flex-col items-center gap-2 pt-safe px-4 pointer-events-none"
      aria-live="polite"
      aria-atomic
    >
      <div className="w-full max-w-sm flex flex-col gap-2 mt-3">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  )
}

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const reduced = useReducedMotion()
  return (
    <motion.div
      role="status"
      initial={reduced ? { opacity: 0 } : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { y: -16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      drag={reduced ? false : 'y'}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.3, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -40 || info.velocity.y < -300) onDismiss()
      }}
      className={cn(
        'pointer-events-auto bg-surface text-ink rounded-card shadow-card border-l-4 px-4 py-3',
        TONE_BY_TYPE[toast.type ?? 'info'],
      )}
    >
      {toast.title && (
        <p className="text-[14px] font-semibold tracking-tight">{toast.title}</p>
      )}
      {toast.description && (
        <p className="text-[13px] text-ink-2 tracking-tight mt-0.5">{toast.description}</p>
      )}
    </motion.div>
  )
}
