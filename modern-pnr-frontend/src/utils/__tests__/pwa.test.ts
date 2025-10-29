// Tests for PWA utilities

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pwaManager } from '../pwa'

// Mock service worker
const serviceWorkerMock = {
  register: vi.fn(),
  ready: Promise.resolve({
    pushManager: {
      subscribe: vi.fn(),
      getSubscription: vi.fn(),
    },
    showNotification: vi.fn(),
  }),
  addEventListener: vi.fn(),
  controller: null,
}

// Mock push manager
const pushManagerMock = {
  subscribe: vi.fn(),
  getSubscription: vi.fn(),
}

// Mock notification
const notificationMock = {
  requestPermission: vi.fn(),
  permission: 'default',
}

// Mock beforeinstallprompt event
class MockBeforeInstallPromptEvent extends Event {
  platforms = ['web']
  userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
  prompt = vi.fn().mockResolvedValue(undefined)
}

describe('PWAManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerMock,
      writable: true,
    })
    
    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: notificationMock,
      writable: true,
    })
    
    // Mock PushManager
    Object.defineProperty(window, 'PushManager', {
      value: pushManagerMock,
      writable: true,
    })
    
    // Reset notification permission
    notificationMock.permission = 'default'
    
    // Mock environment variables
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-vapid-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('installApp', () => {
    it('should install app when prompt is available', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      
      // Simulate deferred prompt
      const manager = pwaManager as any
      manager.deferredPrompt = mockEvent
      
      const result = await pwaManager.installApp()
      
      expect(result).toBe(true)
      expect(mockEvent.prompt).toHaveBeenCalled()
    })

    it('should return false when no prompt is available', async () => {
      const manager = pwaManager as any
      manager.deferredPrompt = null
      
      const result = await pwaManager.installApp()
      
      expect(result).toBe(false)
    })

    it('should handle installation rejection', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' })
      
      const manager = pwaManager as any
      manager.deferredPrompt = mockEvent
      
      const result = await pwaManager.installApp()
      
      expect(result).toBe(false)
    })

    it('should handle installation errors', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      mockEvent.prompt = vi.fn().mockRejectedValue(new Error('Installation failed'))
      
      const manager = pwaManager as any
      manager.deferredPrompt = mockEvent
      
      const result = await pwaManager.installApp()
      
      expect(result).toBe(false)
    })
  })

  describe('updateApp', () => {
    it('should update app when waiting worker is available', async () => {
      const mockRegistration = {
        waiting: {
          postMessage: vi.fn(),
        },
      }
      
      const manager = pwaManager as any
      manager.registration = mockRegistration
      
      // Mock controller change event
      const controllerChangePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          // Simulate controller change
          const event = new Event('controllerchange')
          navigator.serviceWorker.dispatchEvent(event)
          resolve()
        }, 10)
      })
      
      vi.spyOn(navigator.serviceWorker, 'addEventListener').mockImplementation((type, listener) => {
        if (type === 'controllerchange') {
          controllerChangePromise.then(() => listener(new Event('controllerchange')))
        }
      })
      
      const result = await pwaManager.updateApp()
      
      expect(result).toBe(true)
      expect(mockRegistration.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    })

    it('should return false when no waiting worker is available', async () => {
      const manager = pwaManager as any
      manager.registration = { waiting: null }
      
      const result = await pwaManager.updateApp()
      
      expect(result).toBe(false)
    })

    it('should return false when no registration is available', async () => {
      const manager = pwaManager as any
      manager.registration = null
      
      const result = await pwaManager.updateApp()
      
      expect(result).toBe(false)
    })
  })

  describe('requestNotificationPermission', () => {
    it('should request permission when default', async () => {
      notificationMock.permission = 'default'
      notificationMock.requestPermission.mockResolvedValue('granted')
      
      const result = await pwaManager.requestNotificationPermission()
      
      expect(result).toBe('granted')
      expect(notificationMock.requestPermission).toHaveBeenCalled()
    })

    it('should return current permission when already set', async () => {
      notificationMock.permission = 'granted'
      
      const result = await pwaManager.requestNotificationPermission()
      
      expect(result).toBe('granted')
      expect(notificationMock.requestPermission).not.toHaveBeenCalled()
    })

    it('should return denied when notifications not supported', async () => {
      // Mock unsupported environment
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true,
      })
      
      const result = await pwaManager.requestNotificationPermission()
      
      expect(result).toBe('denied')
    })
  })

  describe('subscribeToPushNotifications', () => {
    it('should create new subscription when none exists', async () => {
      const mockSubscription = { endpoint: 'test-endpoint' }
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      
      serviceWorkerMock.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.subscribeToPushNotifications()
      
      expect(result).toEqual(mockSubscription)
      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(ArrayBuffer),
      })
    })

    it('should return existing subscription when available', async () => {
      const mockSubscription = { endpoint: 'existing-endpoint' }
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      
      serviceWorkerMock.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.subscribeToPushNotifications()
      
      expect(result).toEqual(mockSubscription)
    })

    it('should return null when push notifications not supported', async () => {
      // Mock unsupported environment
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
      })
      
      const result = await pwaManager.subscribeToPushNotifications()
      
      expect(result).toBeNull()
    })

    it('should handle subscription errors', async () => {
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockRejectedValue(new Error('Subscription failed')),
        },
      }
      
      serviceWorkerMock.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.subscribeToPushNotifications()
      
      expect(result).toBeNull()
    })
  })

  describe('unsubscribeFromPushNotifications', () => {
    it('should unsubscribe from existing subscription', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockResolvedValue(true),
      }
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      
      serviceWorkerMock.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.unsubscribeFromPushNotifications()
      
      expect(result).toBe(true)
      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    })

    it('should return true when no subscription exists', async () => {
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
        },
      }
      
      serviceWorkerMock.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.unsubscribeFromPushNotifications()
      
      expect(result).toBe(true)
    })

    it('should handle unsubscription errors', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockRejectedValue(new Error('Unsubscribe failed')),
      }
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      
      serviceWorkerMock.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.unsubscribeFromPushNotifications()
      
      expect(result).toBe(false)
    })
  })

  describe('getInstallInfo', () => {
    it('should return install information', () => {
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      const manager = pwaManager as any
      manager.deferredPrompt = mockEvent
      manager.isInstalled = false
      
      const info = pwaManager.getInstallInfo()
      
      expect(info.canInstall).toBe(true)
      expect(info.isInstalled).toBe(false)
      expect(info.platform).toBe('web')
    })

    it('should detect standalone display mode as installed', () => {
      // Mock standalone display mode
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockReturnValue({ matches: true }),
        writable: true,
      })
      
      const info = pwaManager.getInstallInfo()
      
      expect(info.isInstalled).toBe(true)
    })
  })

  describe('getUpdateInfo', () => {
    it('should return update information', () => {
      const manager = pwaManager as any
      manager.updateAvailable = true
      
      const info = pwaManager.getUpdateInfo()
      
      expect(info.available).toBe(true)
    })
  })

  describe('onUpdateAvailable', () => {
    it('should register and call update callbacks', () => {
      const callback = vi.fn()
      const cleanup = pwaManager.onUpdateAvailable(callback)
      
      // Simulate update available
      const manager = pwaManager as any
      manager.notifyUpdate({ available: true })
      
      expect(callback).toHaveBeenCalledWith({ available: true })
      
      // Test cleanup
      cleanup()
      manager.notifyUpdate({ available: false })
      
      // Should not be called after cleanup
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})