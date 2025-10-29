import { useState, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'
import { useToast } from '../components/ui/Toast'

interface OptimisticUpdate<T> {
  id: string
  originalData: T
  optimisticData: T
  timestamp: number
  retryCount: number
  maxRetries: number
}

interface UseOptimisticUpdatesOptions {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export function useOptimisticUpdates<T extends { id: string }>(
  options: UseOptimisticUpdatesOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 10000,
  } = options

  const { emit, isConnected } = useWebSocket({ autoConnect: false })
  const { addToast } = useToast()
  
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((
    originalData: T,
    optimisticData: T,
    eventType: string,
    eventData?: any
  ): string => {
    const updateId = `${originalData.id}-${Date.now()}`
    
    const update: OptimisticUpdate<T> = {
      id: updateId,
      originalData,
      optimisticData,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    }

    // Store the optimistic update
    setOptimisticUpdates(prev => new Map(prev).set(updateId, update))

    // Emit the event to server if connected
    if (isConnected) {
      emit(eventType, {
        updateId,
        ...eventData,
        data: optimisticData,
      })
    }

    // Set timeout for automatic rollback
    const timeoutId = setTimeout(() => {
      rollbackUpdate(updateId, 'Timeout: Server did not respond')
    }, timeout)
    
    timeoutsRef.current.set(updateId, timeoutId)

    return updateId
  }, [emit, isConnected, maxRetries, timeout])

  // Confirm optimistic update (called when server confirms)
  const confirmUpdate = useCallback((updateId: string) => {
    // Clear timeout
    const timeoutId = timeoutsRef.current.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(updateId)
    }

    // Clear retry timeout
    const retryTimeoutId = retryTimeoutsRef.current.get(updateId)
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId)
      retryTimeoutsRef.current.delete(updateId)
    }

    // Remove from optimistic updates
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })
  }, [])

  // Rollback optimistic update
  const rollbackUpdate = useCallback((updateId: string, reason?: string) => {
    const update = optimisticUpdates.get(updateId)
    if (!update) return

    // Clear timeouts
    const timeoutId = timeoutsRef.current.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(updateId)
    }

    const retryTimeoutId = retryTimeoutsRef.current.get(updateId)
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId)
      retryTimeoutsRef.current.delete(updateId)
    }

    // Check if we should retry
    if (update.retryCount < update.maxRetries && isConnected) {
      const updatedUpdate = {
        ...update,
        retryCount: update.retryCount + 1,
        timestamp: Date.now(),
      }

      setOptimisticUpdates(prev => new Map(prev).set(updateId, updatedUpdate))

      // Schedule retry
      const retryTimeout = setTimeout(() => {
        // Re-emit the event
        emit('retry_update', {
          updateId,
          retryCount: updatedUpdate.retryCount,
          data: update.optimisticData,
        })

        // Set new timeout
        const newTimeoutId = setTimeout(() => {
          rollbackUpdate(updateId, `Retry ${updatedUpdate.retryCount} failed`)
        }, timeout)
        
        timeoutsRef.current.set(updateId, newTimeoutId)
      }, retryDelay * Math.pow(2, update.retryCount)) // Exponential backoff

      retryTimeoutsRef.current.set(updateId, retryTimeout)

      // Show retry notification
      addToast({
        type: 'warning',
        title: 'Update Failed',
        description: `Retrying... (${update.retryCount + 1}/${update.maxRetries})`,
        duration: 3000,
      })

      return
    }

    // Final rollback
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })

    // Show rollback notification
    addToast({
      type: 'error',
      title: 'Update Failed',
      description: reason || 'Changes have been reverted',
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => {
          // Allow manual retry by re-applying the optimistic update
          applyOptimisticUpdate(
            update.originalData,
            update.optimisticData,
            'manual_retry',
            { originalUpdateId: updateId }
          )
        }
      }
    })
  }, [optimisticUpdates, isConnected, retryDelay, timeout, emit, addToast, applyOptimisticUpdate])

  // Get data with optimistic updates applied
  const getOptimisticData = useCallback((data: T[]): T[] => {
    return data.map(item => {
      // Find any optimistic updates for this item
      const updates = Array.from(optimisticUpdates.values()).filter(
        update => update.originalData.id === item.id
      )

      if (updates.length === 0) return item

      // Apply the most recent optimistic update
      const latestUpdate = updates.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      )

      return latestUpdate.optimisticData
    })
  }, [optimisticUpdates])

  // Check if item has pending optimistic updates
  const hasPendingUpdates = useCallback((itemId: string): boolean => {
    return Array.from(optimisticUpdates.values()).some(
      update => update.originalData.id === itemId
    )
  }, [optimisticUpdates])

  // Get pending update count for item
  const getPendingUpdateCount = useCallback((itemId: string): number => {
    return Array.from(optimisticUpdates.values()).filter(
      update => update.originalData.id === itemId
    ).length
  }, [optimisticUpdates])

  // Clear all optimistic updates (useful for cleanup)
  const clearAllUpdates = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    
    timeoutsRef.current.clear()
    retryTimeoutsRef.current.clear()
    setOptimisticUpdates(new Map())
  }, [])

  return {
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    getOptimisticData,
    hasPendingUpdates,
    getPendingUpdateCount,
    clearAllUpdates,
    pendingUpdatesCount: optimisticUpdates.size,
  }
}

export default useOptimisticUpdates