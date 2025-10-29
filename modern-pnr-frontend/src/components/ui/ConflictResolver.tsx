// Conflict resolution component for offline sync

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { offlineManager, ConflictResolution } from '../../services/offlineManager'
import { cn } from '../../utils/cn'

interface ConflictResolverProps {
  className?: string
}

interface ConflictItem {
  id: string
  type: string
  conflict: ConflictResolution
  timestamp: number
}

export function ConflictResolver({ className }: ConflictResolverProps) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    loadConflicts()
    
    const cleanup = offlineManager.onConflict(() => {
      loadConflicts()
    })
    
    return cleanup
  }, [])

  const loadConflicts = async () => {
    try {
      const pendingConflicts = await offlineManager.getPendingConflicts()
      setConflicts(pendingConflicts)
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    }
  }

  const resolveConflict = async (
    conflict: ConflictItem,
    strategy: ConflictResolution['strategy'],
    resolvedData?: any
  ) => {
    setIsResolving(true)
    try {
      const success = await offlineManager.resolveConflict(
        conflict.id,
        conflict.type as any,
        strategy,
        resolvedData
      )
      
      if (success) {
        await loadConflicts()
        setSelectedConflict(null)
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setIsResolving(false)
    }
  }

  if (conflicts.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Conflicts List */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5 text-yellow-600"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="font-medium text-yellow-800">
            Data Conflicts Detected ({conflicts.length})
          </h3>
        </div>
        
        <p className="text-sm text-yellow-700 mb-4">
          Some of your offline changes conflict with server data. Please resolve these conflicts to continue syncing.
        </p>

        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div
              key={`${conflict.type}-${conflict.id}`}
              className="flex items-center justify-between p-3 bg-white rounded border"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {conflict.type.toUpperCase()} - {conflict.id}
                </div>
                <div className="text-sm text-gray-500">
                  Conflict detected on {new Date(conflict.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedConflict(conflict)}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Resolve
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {selectedConflict && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedConflict(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Resolve Data Conflict
                  </h2>
                  <button
                    onClick={() => setSelectedConflict(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-6 h-6"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedConflict.type.toUpperCase()} - {selectedConflict.id}
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Client Data */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">Your Changes</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        Local
                      </span>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedConflict.conflict.clientData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Server Data */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">Server Data</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        Remote
                      </span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedConflict.conflict.serverData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => resolveConflict(selectedConflict, 'client-wins')}
                    disabled={isResolving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Keep My Changes
                  </button>
                  
                  <button
                    onClick={() => resolveConflict(selectedConflict, 'server-wins')}
                    disabled={isResolving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Use Server Data
                  </button>
                  
                  <button
                    onClick={() => resolveConflict(selectedConflict, 'merge')}
                    disabled={isResolving}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    Merge Both
                  </button>
                  
                  <button
                    onClick={() => setSelectedConflict(null)}
                    disabled={isResolving}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
                {isResolving && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
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
                    <span>Resolving conflict...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Hook for conflict management
export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [hasConflicts, setHasConflicts] = useState(false)

  useEffect(() => {
    const loadConflicts = async () => {
      try {
        const pendingConflicts = await offlineManager.getPendingConflicts()
        setConflicts(pendingConflicts)
        setHasConflicts(pendingConflicts.length > 0)
      } catch (error) {
        console.error('Failed to load conflicts:', error)
      }
    }

    loadConflicts()
    
    const cleanup = offlineManager.onConflict(() => {
      loadConflicts()
    })
    
    return cleanup
  }, [])

  return {
    conflicts,
    hasConflicts,
    conflictCount: conflicts.length,
    resolveConflict: (id: string, type: string, strategy: ConflictResolution['strategy'], data?: any) =>
      offlineManager.resolveConflict(id, type as any, strategy, data),
  }
}