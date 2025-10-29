import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAppStore } from '../../stores/appStore'
import { UserPresence as UserPresenceType, RealtimeEvent } from '../../types'
import { cn } from '../../utils/cn'

interface UserPresenceProps {
  className?: string
  maxVisible?: number
  showDetails?: boolean
}

interface OnlineUser extends UserPresenceType {
  id: string
  name: string
  avatar?: string
  isTyping?: boolean
}

export function UserPresence({ 
  className, 
  maxVisible = 5, 
  showDetails = false 
}: UserPresenceProps) {
  const { subscribe, isConnected } = useWebSocket({ autoConnect: false })
  const { realtime } = useAppStore()
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  // Handle user presence updates
  const handlePresenceUpdate = useCallback((event: RealtimeEvent) => {
    const { userId, status, userName, avatar, currentPage, lastSeen } = event.data

    setOnlineUsers(prev => {
      const existingIndex = prev.findIndex(user => user.id === userId)
      
      if (status === 'offline') {
        // Remove user from online list
        return prev.filter(user => user.id !== userId)
      }

      const updatedUser: OnlineUser = {
        id: userId,
        userId,
        name: userName || `User ${userId.slice(0, 8)}`,
        avatar,
        status,
        lastSeen: lastSeen || Date.now(),
        currentPage,
      }

      if (existingIndex >= 0) {
        // Update existing user
        const newUsers = [...prev]
        newUsers[existingIndex] = updatedUser
        return newUsers
      } else {
        // Add new user
        return [...prev, updatedUser]
      }
    })
  }, [])

  // Handle typing indicators
  const handleTypingUpdate = useCallback((event: RealtimeEvent) => {
    const { userId, isTyping } = event.data

    setTypingUsers(prev => {
      const newSet = new Set(prev)
      if (isTyping) {
        newSet.add(userId)
      } else {
        newSet.delete(userId)
      }
      return newSet
    })

    // Clear typing indicator after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      }, 3000)
    }
  }, [])

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribePresence = subscribe('user_presence', handlePresenceUpdate)
    const unsubscribeTyping = subscribe('user_typing', handleTypingUpdate)

    return () => {
      unsubscribePresence()
      unsubscribeTyping()
    }
  }, [subscribe, handlePresenceUpdate, handleTypingUpdate])

  // Clean up offline users periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setOnlineUsers(prev => 
        prev.filter(user => 
          user.status === 'online' || (now - user.lastSeen < 300000) // 5 minutes
        )
      )
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const visibleUsers = onlineUsers.slice(0, maxVisible)
  const hiddenCount = Math.max(0, onlineUsers.length - maxVisible)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = (user: OnlineUser) => {
    if (typingUsers.has(user.id)) return 'typing...'
    if (user.status === 'away') return 'away'
    if (user.currentPage) return `viewing ${user.currentPage.replace('/', '')}`
    return 'online'
  }

  if (!isConnected || onlineUsers.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* User avatars */}
      <div className="flex -space-x-2">
        <AnimatePresence>
          {visibleUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0, x: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                x: 0,
                zIndex: visibleUsers.length - index 
              }}
              exit={{ opacity: 0, scale: 0, x: -20 }}
              transition={{ 
                type: 'spring', 
                stiffness: 500, 
                damping: 30,
                delay: index * 0.1 
              }}
              className="relative group"
            >
              {/* Avatar */}
              <div className={cn(
                'w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium shadow-sm',
                user.avatar ? 'bg-gray-200' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
              )}>
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Status indicator */}
              <motion.div
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800',
                  getStatusColor(user.status)
                )}
                animate={typingUsers.has(user.id) ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6, repeat: typingUsers.has(user.id) ? Infinity : 0 }}
              />

              {/* Tooltip */}
              {showDetails && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-gray-300">{getStatusText(user)}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Hidden users count */}
        {hiddenCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm"
          >
            +{hiddenCount}
          </motion.div>
        )}
      </div>

      {/* Online count and status */}
      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
        <motion.div
          className="w-2 h-2 bg-green-500 rounded-full"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span>
          {onlineUsers.length} online
        </span>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500"
          >
            <motion.div
              className="flex gap-1"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </motion.div>
            <span>
              {typingUsers.size === 1 ? 'Someone is' : `${typingUsers.size} people are`} typing
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserPresence