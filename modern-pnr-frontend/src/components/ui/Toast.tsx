import React, { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

export interface Toast {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const toastStyles: Record<string, { icon: React.ReactNode; tint: string; iconColor: string }> = {
  success: {
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    tint: 'bg-[#34C759]/8 dark:bg-[#30D158]/8',
    iconColor: 'text-[#34C759] dark:text-[#30D158]',
  },
  error: {
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    tint: 'bg-[#FF3B30]/8 dark:bg-[#FF453A]/8',
    iconColor: 'text-[#FF3B30] dark:text-[#FF453A]',
  },
  warning: {
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    tint: 'bg-[#FF9F0A]/8 dark:bg-[#FFD60A]/8',
    iconColor: 'text-[#FF9F0A] dark:text-[#FFD60A]',
  },
  info: {
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tint: 'bg-[#007AFF]/8 dark:bg-[#0A84FF]/8',
    iconColor: 'text-[#007AFF] dark:text-[#0A84FF]',
  },
}

const ToastComponent: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast, onRemove
}) => {
  const style = toastStyles[toast.type || 'info']

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass-heavy rounded-2xl max-w-sm w-full overflow-hidden"
    >
      {/* Top specular edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/8 pointer-events-none" />

      <div className="flex items-start gap-3 p-4">
        {/* Icon with tinted glass circle */}
        <div className={cn('flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center', style.tint)}>
          <div className={style.iconColor}>
            {style.icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {toast.title && (
            <p className="text-[14px] font-semibold text-ink leading-tight">
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p className={cn('text-[13px] text-ink-muted/60 leading-snug', toast.title && 'mt-0.5')}>
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-[13px] font-semibold text-brand hover:text-brand/80 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-ink/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-ink-muted/30 hover:text-ink-muted/60 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const clearToasts = useCallback(() => setToasts([]), [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      {createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[60] flex flex-col items-center sm:items-end gap-2 pointer-events-none w-full sm:w-auto px-4 sm:px-0">
          <AnimatePresence mode="popLayout">
            {toasts.map(toast => (
              <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
                <ToastComponent toast={toast} onRemove={removeToast} />
              </div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export const useToastActions = () => {
  const { addToast } = useToast()
  return {
    success: (title: string, description?: string) => addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) => addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) => addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) => addToast({ type: 'info', title, description }),
  }
}
