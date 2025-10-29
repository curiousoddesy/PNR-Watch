// Offline status indicator component

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { offlineManager, OfflineState } from '../../services/offlineManager'
import { cn } from '../../utils/cn'

interface OfflineIndicatorProps {
  className?: string
  showWhenOnline?: boolean
  position?: 'top' | 'bottom'
}

export function OfflineIndicator({ 
  className, 
  showWhenOnline = false,
  position = 'top'
}: OfflineIndicatorProps) {
  const [state, setState] = useState<OfflineState>(offlineManager.getState())
  const [showSync, setShowSync] = useState(false)

  useEffect(() => {
    const cleanup = offlineManager.onStateChange(setState)
    return cleanup
  }, [])

  const handleSync = async () => {
    setShowSync(true)
    try {
      await offlineManager.forceSync()
    } finally {
      setShowSync(false)
    }
  }

  const shouldShow = !state.isConnected || (showWhenOnline && state.isConnected)

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
          className={cn(
            'fixed left-1/2 transform -translate-x-1/2 z-50',
            position === 'top' ? 'top-4' : 'bottom-4',
            className
          )}
        >
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm',
              'border text-sm font-medium',
              state.isConnected
                ? 'bg-green-50/90 border-green-200 text-green-800'
                : 'bg-orange-50/90 border-orange-200 text-orange-800'
            )}
          >
            {/* Status Icon */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  state.isConnected ? 'bg-green-500' : 'bg-orange-500'
                )}
              />
              <span>
                {state.isConnected ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Pending Actions */}
            {state.pendingActions > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-75">•</span>
                <span className="text-xs">
                  {state.pendingActions} pending
                </span>
              </div>
            )}

            {/* Sync Status */}
            {state.syncInProgress && (
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-full h-full"
                  >
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                </motion.div>
                <span className="text-xs">Syncing...</span>
              </div>
            )}

            {/* Sync Button */}
            {state.isConnected && state.pendingActions > 0 && !state.syncInProgress && (
              <button
                onClick={handleSync}
                disabled={showSync}
                className={cn(
                  'px-2 py-1 text-xs rounded border transition-colors',
                  'hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-1',
                  state.isConnected
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-orange-300 focus:ring-orange-500'
                )}
              >
                {showSync ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Compact version for status bars
export function OfflineStatusBadge({ className }: { className?: string }) {
  const [state, setState] = useState<OfflineState>(offlineManager.getState())

  useEffect(() => {
    const cleanup = offlineManager.onStateChange(setState)
    return cleanup
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        state.isConnected
          ? 'bg-green-100 text-green-700'
          : 'bg-orange-100 text-orange-700',
        className
      )}
    >
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          state.isConnected ? 'bg-green-500' : 'bg-orange-500'
        )}
      />
      <span>{state.isConnected ? 'Online' : 'Offline'}</span>
      {state.pendingActions > 0 && (
        <span className="ml-1 px-1 bg-white/50 rounded">
          {state.pendingActions}
        </span>
      )}
    </div>
  )
}

// Hook for offline state
export function useOfflineState() {
  const [state, setState] = useState<OfflineState>(offlineManager.getState())

  useEffect(() => {
    const cleanup = offlineManager.onStateChange(setState)
    return cleanup
  }, [])

  return {
    ...state,
    forceSync: () => offlineManager.forceSync(),
    clearOfflineData: () => offlineManager.clearOfflineData(),
  }
}