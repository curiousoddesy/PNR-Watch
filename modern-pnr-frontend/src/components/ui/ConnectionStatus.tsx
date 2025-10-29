import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../hooks/useWebSocket'
import { cn } from '../../utils/cn'

interface ConnectionStatusProps {
  className?: string
  showText?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function ConnectionStatus({ 
  className, 
  showText = true, 
  position = 'top-right' 
}: ConnectionStatusProps) {
  const { connectionState, isConnected, isConnecting } = useWebSocket({ autoConnect: false })

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500'
    if (isConnecting) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (isConnected) return 'Connected'
    if (isConnecting) return 'Connecting...'
    if (connectionState.reconnectAttempts > 0) {
      return `Reconnecting... (${connectionState.reconnectAttempts})`
    }
    return 'Disconnected'
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'fixed z-50 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg dark:bg-gray-800/90 dark:border-gray-700',
          positionClasses[position],
          className
        )}
      >
        {/* Status indicator dot */}
        <div className="relative">
          <motion.div
            className={cn('w-3 h-3 rounded-full', getStatusColor())}
            animate={isConnecting ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: isConnecting ? Infinity : 0 }}
          />
          
          {/* Pulse animation for connected state */}
          {isConnected && (
            <motion.div
              className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full opacity-75"
              animate={{ scale: [1, 2], opacity: [0.75, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Status text */}
        {showText && (
          <motion.span
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
            key={getStatusText()} // Re-animate when text changes
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {getStatusText()}
          </motion.span>
        )}

        {/* Error indicator */}
        {connectionState.error && !isConnecting && (
          <motion.div
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            className="text-red-500"
            title={connectionState.error}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default ConnectionStatus