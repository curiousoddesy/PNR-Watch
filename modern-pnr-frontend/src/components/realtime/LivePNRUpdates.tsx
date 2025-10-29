import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAppStore } from '../../stores/appStore'
import { PNR, RealtimeEvent } from '../../types'
import { cn } from '../../utils/cn'

interface LivePNRUpdatesProps {
  pnrList: PNR[]
  onPNRUpdate?: (updatedPNR: PNR) => void
  className?: string
}

interface PNRUpdateAnimation {
  pnrId: string
  type: 'status_change' | 'new_info' | 'chart_prepared'
  timestamp: number
}

export function LivePNRUpdates({ 
  pnrList, 
  onPNRUpdate, 
  className 
}: LivePNRUpdatesProps) {
  const { subscribe, isConnected } = useWebSocket({ autoConnect: false })
  const { realtime } = useAppStore()
  const [recentUpdates, setRecentUpdates] = useState<PNRUpdateAnimation[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<PNR>>>(new Map())

  // Handle PNR status updates from WebSocket
  const handlePNRUpdate = useCallback((event: RealtimeEvent) => {
    const { pnrNumber, updates, type } = event.data

    // Find the PNR in the current list
    const existingPNR = pnrList.find(pnr => pnr.number === pnrNumber)
    if (!existingPNR) return

    // Create optimistic update
    const optimisticUpdate = {
      ...existingPNR,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Store optimistic update
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.set(existingPNR.id, updates)
      return newMap
    })

    // Add animation indicator
    setRecentUpdates(prev => [
      ...prev.slice(-4), // Keep last 5 updates
      {
        pnrId: existingPNR.id,
        type: type || 'status_change',
        timestamp: Date.now(),
      }
    ])

    // Call the update handler
    onPNRUpdate?.(optimisticUpdate)

    // Clear optimistic update after a delay (assuming server will send confirmation)
    setTimeout(() => {
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(existingPNR.id)
        return newMap
      })
    }, 5000)
  }, [pnrList, onPNRUpdate])

  // Subscribe to PNR updates
  useEffect(() => {
    const unsubscribe = subscribe('pnr_status_update', handlePNRUpdate)
    return unsubscribe
  }, [subscribe, handlePNRUpdate])

  // Clean up old update animations
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentUpdates(prev => 
        prev.filter(update => Date.now() - update.timestamp < 10000) // Remove after 10 seconds
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Get PNR with optimistic updates applied
  const getPNRWithUpdates = useCallback((pnr: PNR) => {
    const optimisticUpdate = optimisticUpdates.get(pnr.id)
    return optimisticUpdate ? { ...pnr, ...optimisticUpdate } : pnr
  }, [optimisticUpdates])

  // Check if PNR has recent updates
  const hasRecentUpdate = useCallback((pnrId: string) => {
    return recentUpdates.some(update => 
      update.pnrId === pnrId && Date.now() - update.timestamp < 3000
    )
  }, [recentUpdates])

  // Get update type for PNR
  const getUpdateType = useCallback((pnrId: string) => {
    const update = recentUpdates.find(update => update.pnrId === pnrId)
    return update?.type || 'status_change'
  }, [recentUpdates])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Connection status indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span>
          {isConnected ? 'Live updates enabled' : 'Live updates disconnected'}
        </span>
        {realtime.connection.reconnectAttempts > 0 && (
          <span className="text-yellow-600 dark:text-yellow-400">
            (Reconnecting... {realtime.connection.reconnectAttempts})
          </span>
        )}
      </div>

      {/* PNR List with live updates */}
      <div className="space-y-3">
        <AnimatePresence>
          {pnrList.map(pnr => {
            const updatedPNR = getPNRWithUpdates(pnr)
            const hasUpdate = hasRecentUpdate(pnr.id)
            const updateType = getUpdateType(pnr.id)
            const isOptimistic = optimisticUpdates.has(pnr.id)

            return (
              <motion.div
                key={pnr.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: hasUpdate ? 1.02 : 1,
                }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 500, 
                  damping: 30,
                  scale: { duration: 0.3 }
                }}
                className={cn(
                  'relative p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm transition-all duration-300',
                  hasUpdate && 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg',
                  isOptimistic && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                {/* Update indicator */}
                {hasUpdate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                    />
                  </motion.div>
                )}

                {/* Update type badge */}
                {hasUpdate && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      'absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full',
                      updateType === 'chart_prepared' && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                      updateType === 'status_change' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                      updateType === 'new_info' && 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    )}
                  >
                    {updateType === 'chart_prepared' && 'Chart Ready'}
                    {updateType === 'status_change' && 'Status Updated'}
                    {updateType === 'new_info' && 'New Info'}
                  </motion.div>
                )}

                {/* PNR Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      {updatedPNR.number}
                    </h3>
                    <motion.div
                      key={updatedPNR.status.currentStatus}
                      initial={hasUpdate ? { scale: 1.2, opacity: 0.7 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        'px-3 py-1 text-sm font-medium rounded-full',
                        updatedPNR.status.currentStatus.toLowerCase().includes('confirmed') && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                        updatedPNR.status.currentStatus.toLowerCase().includes('waiting') && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                        updatedPNR.status.currentStatus.toLowerCase().includes('cancelled') && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      )}
                    >
                      {updatedPNR.status.currentStatus}
                    </motion.div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>{updatedPNR.passengerName}</p>
                    <p>{updatedPNR.trainNumber} - {updatedPNR.trainName}</p>
                    <p>{updatedPNR.from} → {updatedPNR.to}</p>
                  </div>

                  {/* Chart prepared indicator */}
                  {updatedPNR.status.chartPrepared && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Chart Prepared
                    </motion.div>
                  )}

                  {/* Last updated timestamp */}
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Last updated: {new Date(updatedPNR.updatedAt).toLocaleTimeString()}
                    {isOptimistic && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">
                        (Updating...)
                      </span>
                    )}
                  </div>
                </div>

                {/* Pulse animation for updates */}
                {hasUpdate && (
                  <motion.div
                    className="absolute inset-0 bg-blue-500 rounded-lg opacity-10"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Recent updates summary */}
      {recentUpdates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Recent Updates
          </h4>
          <div className="space-y-1">
            {recentUpdates.slice(-3).map((update, index) => {
              const pnr = pnrList.find(p => p.id === update.pnrId)
              return (
                <div key={`${update.pnrId}-${update.timestamp}`} className="text-xs text-blue-600 dark:text-blue-400">
                  {pnr?.number} - {update.type.replace('_', ' ')} 
                  <span className="ml-2 text-blue-500 dark:text-blue-500">
                    {Math.round((Date.now() - update.timestamp) / 1000)}s ago
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default LivePNRUpdates