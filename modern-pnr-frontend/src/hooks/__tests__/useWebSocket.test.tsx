import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'
import { useAppStore } from '../../stores/appStore'

// Mock the WebSocket service
const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()), // Return unsubscribe function
  onConnectionStateChange: vi.fn(() => vi.fn()), // Return unsubscribe function
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getConnectionState: vi.fn(() => ({
    isConnected: false,
    isConnecting: false,
    connectionId: null,
    lastConnectedAt: null,
    reconnectAttempts: 0,
    error: null,
  })),
}

vi.mock('../../services/websocketService', () => ({
  websocketService: mockWebSocketService,
}))

// Mock the app store
const mockAppStore = {
  realtime: {
    connection: {
      isConnected: false,
      isConnecting: false,
      connectionId: null,
      lastConnectedAt: null,
      reconnectAttempts: 0,
      error: null,
    },
    events: [],
    userPresence: new Map(),
    isSubscribed: false,
  },
  setConnectionState: vi.fn(),
  addRealtimeEvent: vi.fn(),
  updateUserPresence: vi.fn(),
  setSubscriptionStatus: vi.fn(),
}

vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn(() => mockAppStore),
}))

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should return WebSocket interface', () => {
      const { result } = renderHook(() => useWebSocket())

      expect(result.current).toEqual({
        connectionState: expect.any(Object),
        isConnected: false,
        isConnecting: false,
        connect: expect.any(Function),
        disconnect: expect.any(Function),
        emit: expect.any(Function),
        subscribe: expect.any(Function),
        joinRoom: expect.any(Function),
        leaveRoom: expect.any(Function),
      })
    })

    it('should auto-connect by default', () => {
      renderHook(() => useWebSocket())

      expect(mockWebSocketService.connect).toHaveBeenCalledWith(undefined)
    })

    it('should not auto-connect when disabled', () => {
      renderHook(() => useWebSocket({ autoConnect: false }))

      expect(mockWebSocketService.connect).not.toHaveBeenCalled()
    })

    it('should connect with custom URL', () => {
      const customUrl = 'ws://custom-server:3001'
      renderHook(() => useWebSocket({ url: customUrl }))

      expect(mockWebSocketService.connect).toHaveBeenCalledWith(customUrl)
    })
  })

  describe('Connection Management', () => {
    it('should connect when connect function is called', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }))

      act(() => {
        result.current.connect()
      })

      expect(mockWebSocketService.connect).toHaveBeenCalledWith(undefined)
    })

    it('should disconnect when disconnect function is called', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.disconnect()
      })

      expect(mockWebSocketService.disconnect).toHaveBeenCalled()
    })

    it('should subscribe to connection state changes', () => {
      renderHook(() => useWebSocket())

      expect(mockWebSocketService.onConnectionStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it('should update store when connection state changes', () => {
      const connectionStateHandler = mockWebSocketService.onConnectionStateChange.mock.calls[0]?.[0]
      
      renderHook(() => useWebSocket())

      const newState = {
        isConnected: true,
        isConnecting: false,
        connectionId: 'test-id',
        lastConnectedAt: Date.now(),
        reconnectAttempts: 0,
        error: null,
      }

      act(() => {
        connectionStateHandler?.(newState)
      })

      expect(mockAppStore.setConnectionState).toHaveBeenCalledWith(newState)
    })
  })

  describe('Event Handling', () => {
    it('should emit events', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.emit('test_event', { message: 'test' })
      })

      expect(mockWebSocketService.emit).toHaveBeenCalledWith('test_event', { message: 'test' })
    })

    it('should subscribe to events', () => {
      const { result } = renderHook(() => useWebSocket())
      const handler = vi.fn()

      act(() => {
        result.current.subscribe('test_event', handler)
      })

      expect(mockWebSocketService.on).toHaveBeenCalledWith('test_event', handler)
    })

    it('should subscribe to specified events on mount', () => {
      const events = ['pnr_status_update', 'user_presence']
      renderHook(() => useWebSocket({ events }))

      events.forEach(event => {
        expect(mockWebSocketService.on).toHaveBeenCalledWith(event, expect.any(Function))
      })
    })

    it('should handle realtime events and update store', () => {
      const events = ['pnr_status_update']
      renderHook(() => useWebSocket({ events }))

      const eventHandler = mockWebSocketService.on.mock.calls.find(
        call => call[0] === 'pnr_status_update'
      )?.[1]

      const testEvent = {
        type: 'pnr_status_update',
        data: { pnrNumber: '1234567890', status: 'Confirmed' },
        timestamp: Date.now(),
      }

      act(() => {
        eventHandler?.(testEvent)
      })

      expect(mockAppStore.addRealtimeEvent).toHaveBeenCalledWith(testEvent)
    })

    it('should handle user presence events', () => {
      const events = ['user_presence']
      renderHook(() => useWebSocket({ events }))

      const eventHandler = mockWebSocketService.on.mock.calls.find(
        call => call[0] === 'user_presence'
      )?.[1]

      const testEvent = {
        type: 'user_presence',
        data: {
          userId: 'user-123',
          presence: {
            userId: 'user-123',
            status: 'online',
            lastSeen: Date.now(),
          }
        },
        timestamp: Date.now(),
      }

      act(() => {
        eventHandler?.(testEvent)
      })

      expect(mockAppStore.addRealtimeEvent).toHaveBeenCalledWith(testEvent)
      expect(mockAppStore.updateUserPresence).toHaveBeenCalledWith(
        'user-123',
        testEvent.data.presence
      )
    })
  })

  describe('Room Management', () => {
    it('should join rooms', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.joinRoom('pnr-123')
      })

      expect(mockWebSocketService.joinRoom).toHaveBeenCalledWith('pnr-123')
    })

    it('should leave rooms', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.leaveRoom('pnr-123')
      })

      expect(mockWebSocketService.leaveRoom).toHaveBeenCalledWith('pnr-123')
    })
  })

  describe('Subscription Management', () => {
    it('should set subscription status on mount', () => {
      renderHook(() => useWebSocket())

      expect(mockAppStore.setSubscriptionStatus).toHaveBeenCalledWith(true)
    })

    it('should unset subscription status on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket())

      unmount()

      expect(mockAppStore.setSubscriptionStatus).toHaveBeenCalledWith(false)
    })

    it('should unsubscribe from events on unmount', () => {
      const unsubscribe = vi.fn()
      mockWebSocketService.on.mockReturnValue(unsubscribe)
      mockWebSocketService.onConnectionStateChange.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useWebSocket({ events: ['test_event'] }))

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should update event subscriptions when events array changes', () => {
      const unsubscribe = vi.fn()
      mockWebSocketService.on.mockReturnValue(unsubscribe)

      const { rerender } = renderHook(
        ({ events }) => useWebSocket({ events }),
        { initialProps: { events: ['event1'] } }
      )

      // Change events
      rerender({ events: ['event2'] })

      // Should unsubscribe from old events
      expect(unsubscribe).toHaveBeenCalled()
      
      // Should subscribe to new events
      expect(mockWebSocketService.on).toHaveBeenCalledWith('event2', expect.any(Function))
    })
  })

  describe('Connection State', () => {
    it('should return connection state from store', () => {
      mockAppStore.realtime.connection.isConnected = true
      mockAppStore.realtime.connection.isConnecting = false

      const { result } = renderHook(() => useWebSocket())

      expect(result.current.isConnected).toBe(true)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.connectionState).toEqual(mockAppStore.realtime.connection)
    })

    it('should update when store state changes', () => {
      const { result, rerender } = renderHook(() => useWebSocket())

      // Initially disconnected
      expect(result.current.isConnected).toBe(false)

      // Update store state
      mockAppStore.realtime.connection.isConnected = true
      rerender()

      expect(result.current.isConnected).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle event handler errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const events = ['test_event']
      
      renderHook(() => useWebSocket({ events }))

      const eventHandler = mockWebSocketService.on.mock.calls.find(
        call => call[0] === 'test_event'
      )?.[1]

      // Mock store method to throw error
      mockAppStore.addRealtimeEvent.mockImplementationOnce(() => {
        throw new Error('Store error')
      })

      const testEvent = {
        type: 'test_event',
        data: { message: 'test' },
        timestamp: Date.now(),
      }

      act(() => {
        eventHandler?.(testEvent)
      })

      // Should not crash and should log error
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})