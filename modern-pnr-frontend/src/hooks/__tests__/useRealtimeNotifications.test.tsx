import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeNotifications } from '../useRealtimeNotifications'

// Mock the WebSocket hook
const mockWebSocket = {
  subscribe: vi.fn(() => vi.fn()), // Return unsubscribe function
}

vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(() => mockWebSocket),
}))

// Mock the Toast hook
const mockToast = {
  addToast: vi.fn(),
}

vi.mock('../../components/ui/Toast', () => ({
  useToast: vi.fn(() => mockToast),
}))

// Mock Web Audio API
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
    },
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  })),
  destination: {},
  currentTime: 0,
}

// Mock navigator.vibrate
const mockVibrate = vi.fn()

beforeEach(() => {
  // @ts-ignore
  global.AudioContext = vi.fn(() => mockAudioContext)
  // @ts-ignore
  global.webkitAudioContext = vi.fn(() => mockAudioContext)
  
  Object.defineProperty(navigator, 'vibrate', {
    value: mockVibrate,
    writable: true,
  })
})

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should return notification functions', () => {
      const { result } = renderHook(() => useRealtimeNotifications())

      expect(result.current).toEqual({
        playNotificationSound: expect.any(Function),
        triggerVibration: expect.any(Function),
      })
    })

    it('should subscribe to events based on config', () => {
      renderHook(() => useRealtimeNotifications({
        config: {
          enablePNRUpdates: true,
          enableSystemMessages: true,
          enableUserPresence: false,
        }
      }))

      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('pnr_status_update', expect.any(Function))
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('system_message', expect.any(Function))
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('notification', expect.any(Function))
      expect(mockWebSocket.subscribe).not.toHaveBeenCalledWith('user_presence', expect.any(Function))
    })

    it('should always subscribe to general notifications', () => {
      renderHook(() => useRealtimeNotifications({
        config: {
          enablePNRUpdates: false,
          enableSystemMessages: false,
          enableUserPresence: false,
        }
      }))

      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('notification', expect.any(Function))
    })
  })

  describe('PNR Status Updates', () => {
    it('should handle PNR status updates', () => {
      const onPNRUpdate = vi.fn()
      renderHook(() => useRealtimeNotifications({
        config: { enablePNRUpdates: true },
        onPNRUpdate,
      }))

      const pnrHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'pnr_status_update'
      )?.[1]

      const testEvent = {
        type: 'pnr_status_update',
        data: {
          pnrNumber: '1234567890',
          status: 'Confirmed',
          passengerName: 'John Doe',
        },
        timestamp: Date.now(),
      }

      act(() => {
        pnrHandler?.(testEvent)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'PNR Status Updated',
        description: '1234567890 - Confirmed for John Doe',
        duration: 8000,
        action: {
          label: 'View Details',
          onClick: expect.any(Function),
        },
      })

      expect(onPNRUpdate).toHaveBeenCalledWith(testEvent.data)
      expect(mockVibrate).toHaveBeenCalledWith([200, 100, 200])
    })

    it('should handle PNR updates without passenger name', () => {
      renderHook(() => useRealtimeNotifications({
        config: { enablePNRUpdates: true },
      }))

      const pnrHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'pnr_status_update'
      )?.[1]

      const testEvent = {
        type: 'pnr_status_update',
        data: {
          pnrNumber: '1234567890',
          status: 'Waiting List',
        },
        timestamp: Date.now(),
      }

      act(() => {
        pnrHandler?.(testEvent)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'PNR Status Updated',
        description: '1234567890 - Waiting List',
        duration: 8000,
        action: {
          label: 'View Details',
          onClick: expect.any(Function),
        },
      })
    })

    it('should not handle PNR updates when disabled', () => {
      renderHook(() => useRealtimeNotifications({
        config: { enablePNRUpdates: false },
      }))

      const pnrHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'pnr_status_update'
      )?.[1]

      if (pnrHandler) {
        const testEvent = {
          type: 'pnr_status_update',
          data: { pnrNumber: '1234567890', status: 'Confirmed' },
          timestamp: Date.now(),
        }

        act(() => {
          pnrHandler(testEvent)
        })

        expect(mockToast.addToast).not.toHaveBeenCalled()
      }
    })
  })

  describe('User Presence Updates', () => {
    it('should handle user coming online', () => {
      const onUserPresence = vi.fn()
      renderHook(() => useRealtimeNotifications({
        config: { enableUserPresence: true },
        onUserPresence,
      }))

      const presenceHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'user_presence'
      )?.[1]

      const testEvent = {
        type: 'user_presence',
        data: {
          userId: 'user-123',
          status: 'online',
          userName: 'John Doe',
        },
        timestamp: Date.now(),
      }

      act(() => {
        presenceHandler?.(testEvent)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'User Online',
        description: 'John Doe is now online',
        duration: 3000,
      })

      expect(onUserPresence).toHaveBeenCalledWith(testEvent.data)
    })

    it('should not show notification for users going offline', () => {
      renderHook(() => useRealtimeNotifications({
        config: { enableUserPresence: true },
      }))

      const presenceHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'user_presence'
      )?.[1]

      const testEvent = {
        type: 'user_presence',
        data: {
          userId: 'user-123',
          status: 'offline',
          userName: 'John Doe',
        },
        timestamp: Date.now(),
      }

      act(() => {
        presenceHandler?.(testEvent)
      })

      expect(mockToast.addToast).not.toHaveBeenCalled()
    })
  })

  describe('System Messages', () => {
    it('should handle system messages', () => {
      const onSystemMessage = vi.fn()
      renderHook(() => useRealtimeNotifications({
        config: { enableSystemMessages: true },
        onSystemMessage,
      }))

      const systemHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'system_message'
      )?.[1]

      const testEvent = {
        type: 'system_message',
        data: {
          message: 'System maintenance scheduled',
          type: 'warning',
          title: 'Maintenance Alert',
        },
        timestamp: Date.now(),
      }

      act(() => {
        systemHandler?.(testEvent)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Maintenance Alert',
        description: 'System maintenance scheduled',
        duration: 6000,
      })

      expect(onSystemMessage).toHaveBeenCalledWith(testEvent.data)
    })

    it('should handle error system messages with longer duration', () => {
      renderHook(() => useRealtimeNotifications({
        config: { enableSystemMessages: true },
      }))

      const systemHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'system_message'
      )?.[1]

      const testEvent = {
        type: 'system_message',
        data: {
          message: 'Critical system error',
          type: 'error',
        },
        timestamp: Date.now(),
      }

      act(() => {
        systemHandler?.(testEvent)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'System Message',
        description: 'Critical system error',
        duration: 10000,
      })

      expect(mockVibrate).toHaveBeenCalledWith([300, 100, 300, 100, 300])
    })
  })

  describe('General Notifications', () => {
    it('should handle general notifications', () => {
      renderHook(() => useRealtimeNotifications())

      const notificationHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1]

      const testEvent = {
        type: 'notification',
        data: {
          title: 'New Feature',
          message: 'Check out our new feature!',
          type: 'info',
          duration: 7000,
        },
        timestamp: Date.now(),
      }

      act(() => {
        notificationHandler?.(testEvent)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'New Feature',
        description: 'Check out our new feature!',
        duration: 7000,
        action: undefined,
      })
    })

    it('should handle notifications with actions', () => {
      renderHook(() => useRealtimeNotifications())

      const notificationHandler = mockWebSocket.subscribe.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1]

      const testEvent = {
        type: 'notification',
        data: {
          title: 'Update Available',
          message: 'A new version is available',
          action: {
            label: 'Update Now',
            url: 'https://example.com/update',
          },
        },
        timestamp: Date.now(),
      }

      act(() => {
        notificationHandler?.(testEvent)
      })

      const toastCall = mockToast.addToast.mock.calls[0][0]
      expect(toastCall.action).toBeDefined()
      expect(toastCall.action.label).toBe('Update Now')
    })
  })

  describe('Audio and Vibration', () => {
    it('should play notification sound when enabled', () => {
      const { result } = renderHook(() => useRealtimeNotifications({
        config: { soundEnabled: true },
      }))

      act(() => {
        result.current.playNotificationSound()
      })

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('should not play sound when disabled', () => {
      const { result } = renderHook(() => useRealtimeNotifications({
        config: { soundEnabled: false },
      }))

      act(() => {
        result.current.playNotificationSound()
      })

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })

    it('should handle audio context errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // @ts-ignore
      global.AudioContext = vi.fn(() => {
        throw new Error('Audio not supported')
      })

      const { result } = renderHook(() => useRealtimeNotifications({
        config: { soundEnabled: true },
      }))

      act(() => {
        result.current.playNotificationSound()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Could not play notification sound:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should trigger vibration when enabled', () => {
      const { result } = renderHook(() => useRealtimeNotifications({
        config: { vibrationEnabled: true },
      }))

      act(() => {
        result.current.triggerVibration([200, 100, 200])
      })

      expect(mockVibrate).toHaveBeenCalledWith([200, 100, 200])
    })

    it('should not vibrate when disabled', () => {
      const { result } = renderHook(() => useRealtimeNotifications({
        config: { vibrationEnabled: false },
      }))

      act(() => {
        result.current.triggerVibration([200])
      })

      expect(mockVibrate).not.toHaveBeenCalled()
    })

    it('should handle vibration errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration not supported')
      })

      const { result } = renderHook(() => useRealtimeNotifications({
        config: { vibrationEnabled: true },
      }))

      act(() => {
        result.current.triggerVibration([200])
      })

      expect(consoleSpy).toHaveBeenCalledWith('Could not trigger vibration:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from events on unmount', () => {
      const unsubscribe = vi.fn()
      mockWebSocket.subscribe.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useRealtimeNotifications({
        config: {
          enablePNRUpdates: true,
          enableSystemMessages: true,
          enableUserPresence: true,
        }
      }))

      unmount()

      // Should unsubscribe from all subscribed events
      expect(unsubscribe).toHaveBeenCalledTimes(4) // 3 config events + 1 general notification
    })

    it('should update subscriptions when config changes', () => {
      const unsubscribe = vi.fn()
      mockWebSocket.subscribe.mockReturnValue(unsubscribe)

      const { rerender } = renderHook(
        ({ config }) => useRealtimeNotifications({ config }),
        {
          initialProps: {
            config: { enablePNRUpdates: true, enableSystemMessages: false }
          }
        }
      )

      // Change config
      rerender({
        config: { enablePNRUpdates: false, enableSystemMessages: true }
      })

      // Should unsubscribe from old events and subscribe to new ones
      expect(unsubscribe).toHaveBeenCalled()
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('system_message', expect.any(Function))
    })
  })
})