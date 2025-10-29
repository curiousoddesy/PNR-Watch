import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { websocketService } from '../websocketService'
import { ConnectionState, RealtimeEvent } from '../../types'

// Mock Socket.IO
const mockSocket = {
  connected: false,
  id: 'test-socket-id',
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_WEBSOCKET_URL: 'http://localhost:3001',
}))

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket.connected = false
    mockSocket.id = 'test-socket-id'
    
    // Reset the service state
    websocketService.disconnect()
  })

  afterEach(() => {
    websocketService.destroy()
  })

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const { io } = await import('socket.io-client')
      
      websocketService.connect('http://localhost:3001')

      expect(io).toHaveBeenCalledWith('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: false,
        forceNew: true,
      })
    })

    it('should use default URL when none provided', async () => {
      const { io } = await import('socket.io-client')
      
      websocketService.connect()

      expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.any(Object))
    })

    it('should not connect if already connected', async () => {
      mockSocket.connected = true
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      websocketService.connect()

      const { io } = await import('socket.io-client')
      expect(io).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket already connected')

      consoleSpy.mockRestore()
    })

    it('should disconnect from WebSocket server', () => {
      websocketService.connect()
      websocketService.disconnect()

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should update connection state on connect', () => {
      const stateHandler = vi.fn()
      websocketService.onConnectionStateChange(stateHandler)
      
      websocketService.connect()
      
      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      
      if (connectHandler) {
        connectHandler()
      }

      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: true,
          isConnecting: false,
          connectionId: 'test-socket-id',
          reconnectAttempts: 0,
          error: null,
        })
      )
    })

    it('should update connection state on disconnect', () => {
      const stateHandler = vi.fn()
      websocketService.onConnectionStateChange(stateHandler)
      
      websocketService.connect()
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      if (disconnectHandler) {
        disconnectHandler('transport close')
      }

      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: false,
          isConnecting: false,
          connectionId: null,
          error: 'transport close',
        })
      )
    })

    it('should handle connection errors', () => {
      const stateHandler = vi.fn()
      websocketService.onConnectionStateChange(stateHandler)
      
      websocketService.connect()
      
      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1]
      
      if (errorHandler) {
        errorHandler(new Error('Connection failed'))
      }

      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: false,
          isConnecting: false,
          error: 'Connection failed',
        })
      )
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      websocketService.connect()
      mockSocket.connected = true
    })

    it('should emit events to server', () => {
      const eventData = { message: 'test' }
      
      websocketService.emit('test_event', eventData)

      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', {
        ...eventData,
        timestamp: expect.any(Number),
      })
    })

    it('should not emit events when disconnected', () => {
      mockSocket.connected = false
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      websocketService.emit('test_event', { message: 'test' })

      expect(mockSocket.emit).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Cannot emit event: WebSocket not connected')

      consoleSpy.mockRestore()
    })

    it('should subscribe to events', () => {
      const handler = vi.fn()
      
      const unsubscribe = websocketService.on('test_event', handler)

      expect(typeof unsubscribe).toBe('function')
      
      // Simulate receiving an event
      const realtimeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'realtime_event'
      )?.[1]
      
      if (realtimeHandler) {
        realtimeHandler({
          type: 'test_event',
          data: { message: 'test' },
          timestamp: Date.now(),
        })
      }

      expect(handler).toHaveBeenCalledWith({
        type: 'test_event',
        data: { message: 'test' },
        timestamp: expect.any(Number),
      })
    })

    it('should unsubscribe from events', () => {
      const handler = vi.fn()
      
      const unsubscribe = websocketService.on('test_event', handler)
      unsubscribe()

      // Simulate receiving an event after unsubscribe
      const realtimeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'realtime_event'
      )?.[1]
      
      if (realtimeHandler) {
        realtimeHandler({
          type: 'test_event',
          data: { message: 'test' },
          timestamp: Date.now(),
        })
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle PNR status updates', () => {
      const handler = vi.fn()
      websocketService.on('pnr_status_update', handler)

      // Simulate PNR status update
      const pnrHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pnr_status_update'
      )?.[1]
      
      if (pnrHandler) {
        pnrHandler({
          pnrNumber: '1234567890',
          status: 'Confirmed',
          passengerName: 'John Doe',
        })
      }

      expect(handler).toHaveBeenCalledWith({
        type: 'pnr_status_update',
        data: {
          pnrNumber: '1234567890',
          status: 'Confirmed',
          passengerName: 'John Doe',
        },
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Room Management', () => {
    beforeEach(() => {
      websocketService.connect()
      mockSocket.connected = true
    })

    it('should join rooms', () => {
      websocketService.joinRoom('pnr-123')

      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
        roomId: 'pnr-123',
        timestamp: expect.any(Number),
      })
    })

    it('should leave rooms', () => {
      websocketService.leaveRoom('pnr-123')

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', {
        roomId: 'pnr-123',
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Presence Management', () => {
    beforeEach(() => {
      websocketService.connect()
      mockSocket.connected = true
    })

    it('should update user presence', () => {
      const presence = {
        status: 'online' as const,
        lastSeen: Date.now(),
        currentPage: '/dashboard',
      }

      websocketService.updatePresence(presence)

      expect(mockSocket.emit).toHaveBeenCalledWith('update_presence', {
        ...presence,
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Reconnection Logic', () => {
    it('should schedule reconnection on disconnect', async () => {
      vi.useFakeTimers()
      const stateHandler = vi.fn()
      websocketService.onConnectionStateChange(stateHandler)
      
      websocketService.connect()
      
      // Simulate disconnect that should trigger reconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      if (disconnectHandler) {
        disconnectHandler('transport close')
      }

      // Fast-forward time to trigger reconnection
      vi.advanceTimersByTime(1000)

      const { io } = await import('socket.io-client')
      expect(io).toHaveBeenCalledTimes(2) // Initial connect + reconnect

      vi.useRealTimers()
    })

    it('should not reconnect on manual disconnect', async () => {
      vi.useFakeTimers()
      
      websocketService.connect()
      
      // Simulate manual disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      if (disconnectHandler) {
        disconnectHandler('io client disconnect')
      }

      // Fast-forward time
      vi.advanceTimersByTime(5000)

      const { io } = await import('socket.io-client')
      expect(io).toHaveBeenCalledTimes(1) // Only initial connect

      vi.useRealTimers()
    })

    it('should use exponential backoff for reconnection', () => {
      vi.useFakeTimers()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      websocketService.connect()
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1]

      // Simulate multiple failed reconnection attempts
      for (let i = 0; i < 3; i++) {
        if (disconnectHandler) {
          disconnectHandler('transport close')
        }
        
        vi.advanceTimersByTime(1000 * Math.pow(2, i))
        
        if (errorHandler) {
          errorHandler(new Error('Connection failed'))
        }
      }

      // Check that delays increase exponentially
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling reconnect attempt 1 in 1000ms')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling reconnect attempt 2 in 2000ms')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling reconnect attempt 3 in 4000ms')
      )

      consoleSpy.mockRestore()
      vi.useRealTimers()
    })
  })

  describe('Network State Handling', () => {
    it('should reconnect when network comes online', async () => {
      websocketService.connect()
      
      // Simulate network going offline then online
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)

      const { io } = await import('socket.io-client')
      expect(io).toHaveBeenCalledTimes(2) // Initial + online reconnect
    })

    it('should handle network going offline', () => {
      vi.useFakeTimers()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      websocketService.connect()
      
      // Start a reconnection attempt
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      if (disconnectHandler) {
        disconnectHandler('transport close')
      }

      // Simulate network going offline before reconnection
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)

      // Fast-forward time - reconnection should not happen
      vi.advanceTimersByTime(5000)

      expect(consoleSpy).toHaveBeenCalledWith('Network went offline')

      consoleSpy.mockRestore()
      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should handle event handler errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      
      websocketService.on('test_event', faultyHandler)
      
      // Simulate receiving an event
      const realtimeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'realtime_event'
      )?.[1]
      
      if (realtimeHandler) {
        realtimeHandler({
          type: 'test_event',
          data: { message: 'test' },
          timestamp: Date.now(),
        })
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error handling realtime event test_event:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle connection state handler errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const faultyHandler = vi.fn(() => {
        throw new Error('State handler error')
      })
      
      websocketService.onConnectionStateChange(faultyHandler)
      websocketService.connect()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in connection state handler:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const handler = vi.fn()
      const stateHandler = vi.fn()
      
      websocketService.on('test_event', handler)
      websocketService.onConnectionStateChange(stateHandler)
      websocketService.connect()
      
      websocketService.destroy()

      expect(mockSocket.disconnect).toHaveBeenCalled()
      
      // Verify event listeners are removed
      expect(websocketService.getConnectionState().isConnected).toBe(false)
    })
  })
})