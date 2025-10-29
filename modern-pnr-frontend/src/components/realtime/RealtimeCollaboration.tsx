import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useOptimisticUpdates } from '../../hooks/useOptimisticUpdates'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { UserPresence } from './UserPresence'
import { PNR, RealtimeEvent } from '../../types'
import { cn } from '../../utils/cn'

interface RealtimeCollaborationProps {
  pnrId: string
  pnr: PNR
  onPNRUpdate?: (updatedPNR: PNR) => void
  className?: string
}

interface CollaborativeAction {
  id: string
  userId: string
  userName: string
  action: 'viewing' | 'editing' | 'commenting'
  timestamp: number
  data?: any
}

export function RealtimeCollaboration({
  pnrId,
  pnr,
  onPNRUpdate,
  className
}: RealtimeCollaborationProps) {
  const { emit, subscribe, joinRoom, leaveRoom, isConnected } = useWebSocket({ autoConnect: false })
  const {
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    getOptimisticData,
    hasPendingUpdates,
    getPendingUpdateCount
  } = useOptimisticUpdates<PNR>()
  
  useRealtimeNotifications({
    config: {
      enablePNRUpdates: true,
      enableUserPresence: true,
      soundEnabled: true,
    },
    onPNRUpdate: (data) => {
      if (data.pnrId === pnrId) {
        // Confirm optimistic update if it matches
        if (data.updateId) {
          confirmUpdate(data.updateId)
        }
        onPNRUpdate?.(data.pnr)
      }
    }
  })

  const [collaborativeActions, setCollaborativeActions] = useState<CollaborativeAction[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)

  // Join PNR-specific room for collaboration
  useEffect(() => {
    if (isConnected && pnrId) {
      joinRoom(`pnr-${pnrId}`)
      
      // Announce viewing
      emit('user_action', {
        pnrId,
        action: 'viewing',
        timestamp: Date.now(),
      })

      return () => {
        leaveRoom(`pnr-${pnrId}`)
      }
    }
  }, [isConnected, pnrId, joinRoom, leaveRoom, emit])

  // Handle collaborative actions from other users
  const handleCollaborativeAction = useCallback((event: RealtimeEvent) => {
    const { userId, userName, action, pnrId: eventPnrId, data } = event.data
    
    if (eventPnrId !== pnrId) return

    const collaborativeAction: CollaborativeAction = {
      id: `${userId}-${Date.now()}`,
      userId,
      userName: userName || `User ${userId.slice(0, 8)}`,
      action,
      timestamp: Date.now(),
      data,
    }

    setCollaborativeActions(prev => [
      ...prev.slice(-9), // Keep last 10 actions
      collaborativeAction
    ])

    // Remove action after 30 seconds
    setTimeout(() => {
      setCollaborativeActions(prev => 
        prev.filter(a => a.id !== collaborativeAction.id)
      )
    }, 30000)
  }, [pnrId])

  // Handle PNR update confirmations
  const handleUpdateConfirmation = useCallback((event: RealtimeEvent) => {
    const { updateId, success, pnrId: eventPnrId } = event.data
    
    if (eventPnrId !== pnrId) return

    if (success) {
      confirmUpdate(updateId)
    } else {
      rollbackUpdate(updateId, 'Server rejected the update')
    }
  }, [pnrId, confirmUpdate, rollbackUpdate])

  // Subscribe to collaborative events
  useEffect(() => {
    const unsubscribeActions = subscribe('collaborative_action', handleCollaborativeAction)
    const unsubscribeConfirmation = subscribe('update_confirmation', handleUpdateConfirmation)

    return () => {
      unsubscribeActions()
      unsubscribeConfirmation()
    }
  }, [subscribe, handleCollaborativeAction, handleUpdateConfirmation])

  // Handle optimistic PNR updates
  const handleOptimisticUpdate = useCallback((field: string, value: any) => {
    const updatedPNR = { ...pnr, [field]: value, updatedAt: new Date().toISOString() }
    
    const updateId = applyOptimisticUpdate(
      pnr,
      updatedPNR,
      'pnr_update',
      {
        pnrId,
        field,
        value,
      }
    )

    // Announce editing action
    emit('user_action', {
      pnrId,
      action: 'editing',
      field,
      timestamp: Date.now(),
    })

    return updateId
  }, [pnr, pnrId, applyOptimisticUpdate, emit])

  // Start editing a field
  const startEditing = useCallback((field: string) => {
    setIsEditing(true)
    setEditingField(field)
    
    emit('user_action', {
      pnrId,
      action: 'editing',
      field,
      timestamp: Date.now(),
    })
  }, [pnrId, emit])

  // Stop editing
  const stopEditing = useCallback(() => {
    setIsEditing(false)
    setEditingField(null)
    
    emit('user_action', {
      pnrId,
      action: 'viewing',
      timestamp: Date.now(),
    })
  }, [pnrId, emit])

  // Get optimistic PNR data
  const optimisticPNR = getOptimisticData([pnr])[0] || pnr
  const pendingCount = getPendingUpdateCount(pnr.id)

  // Get current collaborative actions
  const currentActions = collaborativeActions.filter(
    action => Date.now() - action.timestamp < 30000 // Last 30 seconds
  )

  const editingUsers = currentActions.filter(action => action.action === 'editing')
  const viewingUsers = currentActions.filter(action => action.action === 'viewing')

  return (
    <div className={cn('space-y-4', className)}>
      {/* Collaboration header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
          <UserPresence maxVisible={3} showDetails />
          
          {/* Pending updates indicator */}
          {pendingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"
              />
              {pendingCount} pending
            </motion.div>
          )}
        </div>

        {/* Connection status */}
        <div className={cn(
          'flex items-center gap-2 text-sm',
          isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* PNR Details with collaborative editing */}
      <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">PNR: {optimisticPNR.number}</h2>
          
          {/* Optimistic update indicator */}
          {hasPendingUpdates(pnr.id) && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-sm text-blue-600 dark:text-blue-400"
            >
              Syncing...
            </motion.div>
          )}
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Passenger Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Passenger Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={optimisticPNR.passengerName}
                onChange={(e) => handleOptimisticUpdate('passengerName', e.target.value)}
                onFocus={() => startEditing('passengerName')}
                onBlur={stopEditing}
                className={cn(
                  'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  editingField === 'passengerName' && 'ring-2 ring-blue-500 border-blue-500',
                  hasPendingUpdates(pnr.id) && 'bg-blue-50 dark:bg-blue-900/10'
                )}
              />
              
              {/* Show who else is editing this field */}
              {editingUsers.some(user => user.data?.field === 'passengerName') && (
                <div className="absolute -top-6 left-0 text-xs text-orange-600 dark:text-orange-400">
                  {editingUsers
                    .filter(user => user.data?.field === 'passengerName')
                    .map(user => user.userName)
                    .join(', ')} editing
                </div>
              )}
            </div>
          </div>

          {/* Train Number */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Train Number
            </label>
            <input
              type="text"
              value={optimisticPNR.trainNumber}
              onChange={(e) => handleOptimisticUpdate('trainNumber', e.target.value)}
              onFocus={() => startEditing('trainNumber')}
              onBlur={stopEditing}
              className={cn(
                'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                editingField === 'trainNumber' && 'ring-2 ring-blue-500 border-blue-500',
                hasPendingUpdates(pnr.id) && 'bg-blue-50 dark:bg-blue-900/10'
              )}
            />
          </div>
        </div>

        {/* Status with real-time updates */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Status
          </label>
          <motion.div
            key={optimisticPNR.status.currentStatus}
            initial={{ scale: 1.05, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'px-4 py-2 rounded-lg font-medium',
              optimisticPNR.status.currentStatus.toLowerCase().includes('confirmed') && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
              optimisticPNR.status.currentStatus.toLowerCase().includes('waiting') && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
              optimisticPNR.status.currentStatus.toLowerCase().includes('cancelled') && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            )}
          >
            {optimisticPNR.status.currentStatus}
          </motion.div>
        </div>

        {/* Last updated */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date(optimisticPNR.updatedAt).toLocaleString()}
          {hasPendingUpdates(pnr.id) && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              (Pending sync)
            </span>
          )}
        </div>
      </div>

      {/* Live activity feed */}
      <AnimatePresence>
        {currentActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Live Activity
            </h4>
            <div className="space-y-1">
              {currentActions.slice(-3).map(action => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2"
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    action.action === 'editing' && 'bg-orange-500',
                    action.action === 'viewing' && 'bg-green-500',
                    action.action === 'commenting' && 'bg-blue-500'
                  )} />
                  <span>
                    {action.userName} is {action.action}
                    {action.data?.field && ` ${action.data.field}`}
                  </span>
                  <span className="text-gray-500">
                    {Math.round((Date.now() - action.timestamp) / 1000)}s ago
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RealtimeCollaboration