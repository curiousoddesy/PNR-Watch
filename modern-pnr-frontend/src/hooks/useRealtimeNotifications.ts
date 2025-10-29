import { useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import { useToast } from '../components/ui/Toast'
import { RealtimeEvent } from '../types'

interface NotificationConfig {
  enablePNRUpdates?: boolean
  enableSystemMessages?: boolean
  enableUserPresence?: boolean
  soundEnabled?: boolean
  vibrationEnabled?: boolean
}

interface UseRealtimeNotificationsOptions {
  config?: NotificationConfig
  onPNRUpdate?: (data: any) => void
  onUserPresence?: (data: any) => void
  onSystemMessage?: (data: any) => void
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    config = {
      enablePNRUpdates: true,
      enableSystemMessages: true,
      enableUserPresence: false,
      soundEnabled: true,
      vibrationEnabled: true,
    },
    onPNRUpdate,
    onUserPresence,
    onSystemMessage,
  } = options

  const { subscribe } = useWebSocket({ autoConnect: false })
  const { addToast } = useToast()

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!config.soundEnabled) return
    
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }, [config.soundEnabled])

  // Trigger vibration
  const triggerVibration = useCallback((pattern: number[] = [200]) => {
    if (!config.vibrationEnabled || !navigator.vibrate) return
    
    try {
      navigator.vibrate(pattern)
    } catch (error) {
      console.warn('Could not trigger vibration:', error)
    }
  }, [config.vibrationEnabled])

  // Handle PNR status updates
  const handlePNRUpdate = useCallback((event: RealtimeEvent) => {
    if (!config.enablePNRUpdates) return

    const { pnrNumber, status, passengerName } = event.data

    // Show toast notification
    addToast({
      type: 'info',
      title: 'PNR Status Updated',
      description: `${pnrNumber} - ${status}${passengerName ? ` for ${passengerName}` : ''}`,
      duration: 8000,
      action: {
        label: 'View Details',
        onClick: () => {
          // This would navigate to PNR details
          console.log('Navigate to PNR details:', pnrNumber)
        }
      }
    })

    // Play sound and vibrate
    playNotificationSound()
    triggerVibration([200, 100, 200])

    // Call custom handler if provided
    onPNRUpdate?.(event.data)
  }, [config.enablePNRUpdates, addToast, playNotificationSound, triggerVibration, onPNRUpdate])

  // Handle user presence updates
  const handleUserPresence = useCallback((event: RealtimeEvent) => {
    if (!config.enableUserPresence) return

    const { userId, status, userName } = event.data

    // Only show notifications for users coming online
    if (status === 'online' && userName) {
      addToast({
        type: 'info',
        title: 'User Online',
        description: `${userName} is now online`,
        duration: 3000,
      })
    }

    // Call custom handler if provided
    onUserPresence?.(event.data)
  }, [config.enableUserPresence, addToast, onUserPresence])

  // Handle system messages
  const handleSystemMessage = useCallback((event: RealtimeEvent) => {
    if (!config.enableSystemMessages) return

    const { message, type, title } = event.data

    addToast({
      type: type || 'info',
      title: title || 'System Message',
      description: message,
      duration: type === 'error' ? 10000 : 6000,
    })

    // Play different sounds for different message types
    if (type === 'error') {
      triggerVibration([300, 100, 300, 100, 300])
    } else {
      playNotificationSound()
      triggerVibration([200])
    }

    // Call custom handler if provided
    onSystemMessage?.(event.data)
  }, [config.enableSystemMessages, addToast, playNotificationSound, triggerVibration, onSystemMessage])

  // Handle general notifications
  const handleNotification = useCallback((event: RealtimeEvent) => {
    const { title, message, type, action, duration } = event.data

    addToast({
      type: type || 'info',
      title: title || 'Notification',
      description: message,
      duration: duration || 5000,
      action: action ? {
        label: action.label,
        onClick: () => {
          // Handle action click
          if (action.url) {
            window.open(action.url, '_blank')
          } else if (action.callback) {
            action.callback()
          }
        }
      } : undefined,
    })

    playNotificationSound()
    triggerVibration([200])
  }, [addToast, playNotificationSound, triggerVibration])

  // Set up event subscriptions
  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    if (config.enablePNRUpdates) {
      unsubscribers.push(subscribe('pnr_status_update', handlePNRUpdate))
    }

    if (config.enableUserPresence) {
      unsubscribers.push(subscribe('user_presence', handleUserPresence))
    }

    if (config.enableSystemMessages) {
      unsubscribers.push(subscribe('system_message', handleSystemMessage))
    }

    // Always subscribe to general notifications
    unsubscribers.push(subscribe('notification', handleNotification))

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [
    config.enablePNRUpdates,
    config.enableUserPresence,
    config.enableSystemMessages,
    subscribe,
    handlePNRUpdate,
    handleUserPresence,
    handleSystemMessage,
    handleNotification,
  ])

  return {
    playNotificationSound,
    triggerVibration,
  }
}

export default useRealtimeNotifications