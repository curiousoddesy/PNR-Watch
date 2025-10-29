import { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { websocketService, WebSocketEventHandler } from '../services/websocketService'
import { RealtimeEvent, ConnectionState } from '../types'

interface UseWebSocketOptions {
  autoConnect?: boolean
  url?: string
  events?: string[]
}

interface UseWebSocketReturn {
  connectionState: ConnectionState
  isConnected: boolean
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  emit: (eventType: string, data: any) => void
  subscribe: (eventType: string, handler: WebSocketEventHandler) => () => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    url,
    events = [],
  } = options

  const {
    realtime,
    setConnectionState,
    addRealtimeEvent,
    updateUserPresence,
    setSubscriptionStatus,
  } = useAppStore()

  const eventHandlersRef = useRef<Map<string, () => void>>(new Map())

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state)
  }, [setConnectionState])

  // Handle realtime events
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    addRealtimeEvent(event)

    // Handle specific event types
    switch (event.type) {
      case 'user_presence':
        if (event.data.userId && event.data.presence) {
          updateUserPresence(event.data.userId, event.data.presence)
        }
        break
      case 'pnr_status_update':
        // This will be handled by PNR-specific components
        break
      case 'notification':
        // This will be handled by notification components
        break
    }
  }, [addRealtimeEvent, updateUserPresence])

  // Connect to WebSocket
  const connect = useCallback(() => {
    websocketService.connect(url)
  }, [url])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect()
  }, [])

  // Emit event to server
  const emit = useCallback((eventType: string, data: any) => {
    websocketService.emit(eventType, data)
  }, [])

  // Subscribe to specific event
  const subscribe = useCallback((eventType: string, handler: WebSocketEventHandler) => {
    return websocketService.on(eventType, handler)
  }, [])

  // Join room
  const joinRoom = useCallback((roomId: string) => {
    websocketService.joinRoom(roomId)
  }, [])

  // Leave room
  const leaveRoom = useCallback((roomId: string) => {
    websocketService.leaveRoom(roomId)
  }, [])

  // Setup WebSocket connection and event listeners
  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribeConnectionState = websocketService.onConnectionStateChange(
      handleConnectionStateChange
    )

    // Subscribe to specified events
    events.forEach(eventType => {
      const unsubscribe = websocketService.on(eventType, handleRealtimeEvent)
      eventHandlersRef.current.set(eventType, unsubscribe)
    })

    // Auto-connect if enabled
    if (autoConnect) {
      connect()
    }

    setSubscriptionStatus(true)

    // Cleanup function
    return () => {
      unsubscribeConnectionState()
      
      // Unsubscribe from all event handlers
      eventHandlersRef.current.forEach(unsubscribe => unsubscribe())
      eventHandlersRef.current.clear()
      
      setSubscriptionStatus(false)
    }
  }, [autoConnect, connect, handleConnectionStateChange, handleRealtimeEvent, events, setSubscriptionStatus])

  // Update event subscriptions when events array changes
  useEffect(() => {
    // Unsubscribe from old events
    eventHandlersRef.current.forEach(unsubscribe => unsubscribe())
    eventHandlersRef.current.clear()

    // Subscribe to new events
    events.forEach(eventType => {
      const unsubscribe = websocketService.on(eventType, handleRealtimeEvent)
      eventHandlersRef.current.set(eventType, unsubscribe)
    })
  }, [events, handleRealtimeEvent])

  return {
    connectionState: realtime.connection,
    isConnected: realtime.connection.isConnected,
    isConnecting: realtime.connection.isConnecting,
    connect,
    disconnect,
    emit,
    subscribe,
    joinRoom,
    leaveRoom,
  }
}

export default useWebSocket