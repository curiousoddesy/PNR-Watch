import { io, Socket } from 'socket.io-client'
import { ConnectionState, RealtimeEvent, UserPresence } from '../types'

export type WebSocketEventHandler = (event: RealtimeEvent) => void
export type ConnectionStateHandler = (state: ConnectionState) => void

class WebSocketService {
  private socket: Socket | null = null
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    connectionId: null,
    lastConnectedAt: null,
    reconnectAttempts: 0,
    error: null,
  }
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map()
  private connectionStateHandlers: Set<ConnectionStateHandler> = new Set()
  private reconnectTimer: NodeJS.Timeout | null = null
  private maxReconnectAttempts = 10
  private baseReconnectDelay = 1000 // 1 second
  private maxReconnectDelay = 30000 // 30 seconds

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  /**
   * Connect to the WebSocket server
   */
  connect(url: string = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001'): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected')
      return
    }

    this.updateConnectionState({ isConnecting: true, error: null })

    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: false, // We'll handle reconnection manually
        forceNew: true,
      })

      this.setupEventListeners()
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.updateConnectionState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      })
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.updateConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionId: null,
      reconnectAttempts: 0,
      error: null,
    })
  }

  /**
   * Send an event to the server
   */
  emit(eventType: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('Cannot emit event: WebSocket not connected')
      return
    }

    this.socket.emit(eventType, {
      ...data,
      timestamp: Date.now(),
    })
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    
    this.eventHandlers.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType)
        }
      }
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.connectionStateHandlers.add(handler)
    
    // Immediately call with current state
    handler(this.connectionState)

    // Return unsubscribe function
    return () => {
      this.connectionStateHandlers.delete(handler)
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  /**
   * Join a room for targeted messaging
   */
  joinRoom(roomId: string): void {
    this.emit('join_room', { roomId })
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.emit('leave_room', { roomId })
  }

  /**
   * Update user presence
   */
  updatePresence(presence: Partial<UserPresence>): void {
    this.emit('update_presence', presence)
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this))
    this.socket.on('disconnect', this.handleDisconnect.bind(this))
    this.socket.on('connect_error', this.handleConnectError.bind(this))

    // Custom events
    this.socket.on('realtime_event', this.handleRealtimeEvent.bind(this))
    this.socket.on('pnr_status_update', (data) => {
      this.handleRealtimeEvent({
        type: 'pnr_status_update',
        data,
        timestamp: Date.now(),
      })
    })
    this.socket.on('user_presence', (data) => {
      this.handleRealtimeEvent({
        type: 'user_presence',
        data,
        timestamp: Date.now(),
      })
    })
    this.socket.on('notification', (data) => {
      this.handleRealtimeEvent({
        type: 'notification',
        data,
        timestamp: Date.now(),
      })
    })
  }

  private handleConnect(): void {
    console.log('WebSocket connected')
    
    this.updateConnectionState({
      isConnected: true,
      isConnecting: false,
      connectionId: this.socket?.id || null,
      lastConnectedAt: Date.now(),
      reconnectAttempts: 0,
      error: null,
    })
  }

  private handleDisconnect(reason: string): void {
    console.log('WebSocket disconnected:', reason)
    
    this.updateConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionId: null,
      error: reason,
    })

    // Attempt reconnection if not manually disconnected
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect()
    }
  }

  private handleConnectError(error: Error): void {
    console.error('WebSocket connection error:', error)
    
    this.updateConnectionState({
      isConnected: false,
      isConnecting: false,
      error: error.message,
    })

    this.scheduleReconnect()
  }

  private handleRealtimeEvent(event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error(`Error handling realtime event ${event.type}:`, error)
        }
      })
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.connectionState.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts),
      this.maxReconnectDelay
    )

    console.log(`Scheduling reconnect attempt ${this.connectionState.reconnectAttempts + 1} in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.updateConnectionState({
        reconnectAttempts: this.connectionState.reconnectAttempts + 1,
      })
      
      if (navigator.onLine) {
        this.connect()
      }
    }, delay)
  }

  private handleOnline(): void {
    console.log('Network came online')
    if (!this.socket?.connected && this.connectionState.reconnectAttempts < this.maxReconnectAttempts) {
      this.connect()
    }
  }

  private handleOffline(): void {
    console.log('Network went offline')
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates }
    
    // Notify all connection state handlers
    this.connectionStateHandlers.forEach(handler => {
      try {
        handler(this.connectionState)
      } catch (error) {
        console.error('Error in connection state handler:', error)
      }
    })
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnect()
    this.eventHandlers.clear()
    this.connectionStateHandlers.clear()
    
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
  }
}

// Create singleton instance
export const websocketService = new WebSocketService()
export default websocketService