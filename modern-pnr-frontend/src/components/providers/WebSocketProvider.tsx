import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { websocketService } from '../../services/websocketService'
import { useAppStore } from '../../stores/appStore'

interface WebSocketContextValue {
  isConnected: boolean
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  emit: (eventType: string, data: any) => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
  url?: string
  autoConnect?: boolean
}

export function WebSocketProvider({ 
  children, 
  url, 
  autoConnect = true 
}: WebSocketProviderProps) {
  const { connectivity } = useAppStore()
  
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    emit,
    joinRoom,
    leaveRoom,
  } = useWebSocket({
    autoConnect,
    url,
    events: [
      'pnr_status_update',
      'user_presence',
      'notification',
      'system_message',
    ],
  })

  // Handle network connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && !isConnecting) {
        connect()
      }
    }

    const handleOffline = () => {
      // WebSocket service will handle this internally
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isConnected, isConnecting, connect])

  // Update user presence when connected
  useEffect(() => {
    if (isConnected) {
      websocketService.updatePresence({
        status: 'online',
        lastSeen: Date.now(),
        currentPage: window.location.pathname,
      })

      // Update presence on page visibility change
      const handleVisibilityChange = () => {
        websocketService.updatePresence({
          status: document.hidden ? 'away' : 'online',
          lastSeen: Date.now(),
          currentPage: window.location.pathname,
        })
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        websocketService.updatePresence({
          status: 'offline',
          lastSeen: Date.now(),
        })
      }
    }
  }, [isConnected])

  const contextValue: WebSocketContextValue = {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    emit,
    joinRoom,
    leaveRoom,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

export default WebSocketProvider