// PWA installation prompt component

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '../../utils/pwa'
import { cn } from '../../utils/cn'

interface PWAInstallPromptProps {
  className?: string
  variant?: 'banner' | 'modal' | 'card'
  autoShow?: boolean
  showDelay?: number
}

export function PWAInstallPrompt({
  className,
  variant = 'banner',
  autoShow = true,
  showDelay = 3000
}: PWAInstallPromptProps) {
  const { canInstall, isInstalled, install } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Show prompt after delay if conditions are met
    if (autoShow && canInstall && !isInstalled && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, showDelay)

      return () => clearTimeout(timer)
    }
  }, [canInstall, isInstalled, autoShow, showDelay, isDismissed])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await install()
      if (success) {
        setIsVisible(false)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (!canInstall || isInstalled || isDismissed) {
    return null
  }

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={cn(
              'fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg',
              className
            )}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Install PNR Tracker</div>
                    <div className="text-sm text-blue-100">
                      Get quick access from your home screen
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className={cn(
                      'px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm',
                      'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-200'
                    )}
                  >
                    {isInstalling ? 'Installing...' : 'Install'}
                  </button>
                  
                  <button
                    onClick={handleDismiss}
                    className="p-2 text-blue-100 hover:text-white transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  if (variant === 'modal') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                'bg-white rounded-xl shadow-xl max-w-md w-full p-6',
                className
              )}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-8 h-8 text-blue-600"
                  >
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <polyline points="7.5,4.21 12,6.81 16.5,4.21" />
                    <polyline points="7.5,19.79 7.5,14.6 3,12" />
                    <polyline points="21,12 16.5,14.6 16.5,19.79" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Install PNR Tracker
                </h3>
                
                <p className="text-gray-600 mb-6">
                  Install our app for quick access, offline support, and a native app experience.
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-green-500"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>Works offline</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-green-500"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>Push notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-green-500"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>Fast loading</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-green-500"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>Home screen access</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className={cn(
                      'flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium',
                      'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-200'
                    )}
                  >
                    {isInstalling ? (
                      <div className="flex items-center justify-center gap-2">
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
                        <span>Installing...</span>
                      </div>
                    ) : (
                      'Install App'
                    )}
                  </button>
                  
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // Card variant
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white',
            className
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                Install PNR Tracker
              </h3>
              <p className="text-blue-100 text-sm mb-4">
                Get the full app experience with offline support and notifications.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className={cn(
                    'px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm',
                    'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-200'
                  )}
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-blue-100 hover:text-white transition-colors text-sm"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-1 text-blue-100 hover:text-white transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Manual install button component
export function PWAInstallButton({ 
  className, 
  children = 'Install App',
  variant = 'primary'
}: {
  className?: string
  children?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
}) {
  const { canInstall, isInstalled, install } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await install()
    } finally {
      setIsInstalling(false)
    }
  }

  if (!canInstall || isInstalled) {
    return null
  }

  const baseClasses = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {isInstalling ? (
        <>
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
          <span>Installing...</span>
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{children}</span>
        </>
      )}
    </button>
  )
}