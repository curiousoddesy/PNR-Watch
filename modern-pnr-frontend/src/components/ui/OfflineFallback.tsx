// Offline fallback pages and content

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { offlineManager } from '../../services/offlineManager'
import { cn } from '../../utils/cn'

interface OfflineFallbackProps {
  title?: string
  message?: string
  showRetry?: boolean
  onRetry?: () => void
  className?: string
}

export function OfflineFallback({
  title = "You're offline",
  message = "Check your internet connection and try again.",
  showRetry = true,
  onRetry,
  className
}: OfflineFallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      if (onRetry) {
        await onRetry()
      } else {
        // Default retry behavior - force sync
        await offlineManager.forceSync()
        window.location.reload()
      }
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
        className
      )}
    >
      {/* Offline Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-12 h-12 text-gray-400"
        >
          <path d="M17.5 12c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c1.8 0 3.5.6 4.9 1.7" />
          <path d="M17.5 12c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c1.8 0 3.5.6 4.9 1.7" />
          <path d="M21 4L9 16l-5-5" />
          <line x1="17" y1="7" x2="21" y2="3" />
          <line x1="21" y1="7" x2="17" y2="3" />
        </svg>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-semibold text-gray-900 mb-2"
      >
        {title}
      </motion.h2>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-6 max-w-md"
      >
        {message}
      </motion.p>

      {/* Retry Button */}
      {showRetry && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleRetry}
          disabled={isRetrying}
          className={cn(
            'px-6 py-3 bg-blue-600 text-white rounded-lg font-medium',
            'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200'
          )}
        >
          {isRetrying ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4"
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
              <span>Retrying...</span>
            </div>
          ) : (
            'Try Again'
          )}
        </motion.button>
      )}
    </motion.div>
  )
}

// Offline page for full-page fallbacks
export function OfflinePage() {
  const [cachedPNRs, setCachedPNRs] = useState<any[]>([])

  useEffect(() => {
    // Load cached PNR data
    const loadCachedData = async () => {
      try {
        // This would typically load from your offline store
        const cached = await offlineManager.getOfflineData('pnr', 'all')
        if (cached) {
          setCachedPNRs(Array.isArray(cached) ? cached : [cached])
        }
      } catch (error) {
        console.error('Failed to load cached data:', error)
      }
    }

    loadCachedData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              PNR Tracker (Offline)
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span>Offline Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cachedPNRs.length > 0 ? (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Cached PNRs ({cachedPNRs.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cachedPNRs.map((pnr, index) => (
                <motion.div
                  key={pnr.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {pnr.pnrNumber || 'Unknown PNR'}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Cached
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {pnr.status || 'Status unavailable'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(pnr.timestamp || Date.now()).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <OfflineFallback
            title="No cached data available"
            message="Connect to the internet to load your PNRs. Any changes you make will be synced when you're back online."
            showRetry={false}
          />
        )}

        {/* Offline Features */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Available Offline Features
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-3 h-3 text-white"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">View Cached PNRs</h4>
                <p className="text-sm text-blue-700">
                  Access previously loaded PNR information
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-3 h-3 text-white"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Queue Actions</h4>
                <p className="text-sm text-blue-700">
                  Add or update PNRs - changes will sync when online
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Offline banner for partial connectivity
export function OfflineBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const cleanup = offlineManager.onStateChange((state) => {
      setIsVisible(!state.isConnected)
    })
    return cleanup
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-orange-500 text-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-sm font-medium">
                  You're currently offline. Some features may be limited.
                </span>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white hover:text-orange-200 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}