import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pushNotificationService } from '../services/pushNotificationService'

// Mock browser APIs
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: vi.fn(),
    subscribe: vi.fn(),
  },
  showNotification: vi.fn(),
  getNotifications: vi.fn(),
}

const mockServiceWorker = {
  ready: Promise.resolve(mockServiceWorkerRegistration),
  addEventListener: vi.fn(),
}

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
})

Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn(),
  },
  writable: true,
})

Object.defineProperty(window, 'PushManager', {
  value: {},
  writable: true,
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Push Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Permission Management', () => {
    it('should request notification permission', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValue('granted')
      
      const permission = await pushNotificationService.requestPermission()
      
      expect(permission).toBe('granted')
      expect(window.Notification.requestPermission).toHaveBeenCalled()
    })

    it('should handle denied permission', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValue('denied')
      
      const permission = await pushNotificationService.requestPermission()
      
      expect(permission).toBe('denied')
    })

    it('should return existing granted permission', async () => {
      window.Notification.permission = 'granted'
      
      const permission = await pushNotificationService.requestPermission()
      
      expect(permission).toBe('granted')
    })
  })

  describe('Subscription Management', () => {
    it('should subscribe to push notifications', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValue('granted')
      const mockSubscription = { endpoint: 'test-endpoint' }
      mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription)
      
      // Mock VAPID key
      vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-vapid-key')
      
      const subscription = await pushNotificationService.subscribe()
      
      expect(subscription).toBe(mockSubscription)
      expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalled()
    })

    it('should handle subscription failure', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValue('denied')
      
      const subscription = await pushNotificationService.subscribe()
      
      expect(subscription).toBeNull()
    })

    it('should unsubscribe from push notifications', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockResolvedValue(true)
      }
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription)
      
      const result = await pushNotificationService.unsubscribe()
      
      expect(result).toBe(true)
      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Notification Display', () => {
    it('should show basic notification', async () => {
      const payload = {
        title: 'Test Notification',
        body: 'This is a test notification'
      }

      await pushNotificationService.showNotification(payload)
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        payload.title,
        expect.objectContaining({
          body: payload.body
        })
      )
    })

    it('should show rich notification', async () => {
      const payload = {
        title: 'Rich Notification',
        body: 'Rich notification with image',
        image: '/test-image.jpg',
        vibrate: [200, 100, 200],
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      }

      await pushNotificationService.showRichNotification(payload)
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        payload.title,
        expect.objectContaining({
          body: payload.body,
          image: payload.image,
          vibrate: payload.vibrate,
          actions: payload.actions
        })
      )
    })

    it('should respect quiet hours', async () => {
      // Mock current time to be in quiet hours
      const mockDate = new Date('2023-01-01T23:30:00')
      vi.setSystemTime(mockDate)

      await pushNotificationService.updatePreferences({
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          allowUrgent: false
        }
      })

      const payload = {
        title: 'Test Notification',
        body: 'Should be blocked by quiet hours'
      }

      await pushNotificationService.showNotification(payload)
      
      // Should not show notification during quiet hours
      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled()
    })
  })

  describe('Batch Notifications', () => {
    it('should schedule notification batch', async () => {
      const notifications = [
        { title: 'Batch 1', body: 'First notification' },
        { title: 'Batch 2', body: 'Second notification' }
      ]

      const batchId = await pushNotificationService.scheduleNotificationBatch(
        notifications,
        1000, // 1 second delay
        { batchSize: 2, priority: 'normal' }
      )

      expect(batchId).toBeDefined()
      expect(typeof batchId).toBe('string')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('A/B Testing', () => {
    it('should create A/B test', async () => {
      const test = {
        id: 'test-ab',
        name: 'Test A/B',
        isActive: true,
        startDate: Date.now(),
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A',
            title: 'Title A',
            message: 'Message A',
            weight: 50
          },
          {
            id: 'variant-b',
            name: 'Variant B',
            title: 'Title B',
            message: 'Message B',
            weight: 50
          }
        ]
      }

      const testId = await pushNotificationService.createABTest(test)
      
      expect(testId).toBe(test.id)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should send A/B test notification', async () => {
      const test = {
        id: 'test-ab-send',
        name: 'Test A/B Send',
        isActive: true,
        startDate: Date.now(),
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A',
            title: 'Title A',
            message: 'Message A',
            weight: 100 // 100% weight for predictable testing
          }
        ]
      }

      await pushNotificationService.createABTest(test)
      
      await pushNotificationService.sendNotificationWithABTest(
        test.id,
        { icon: '/test-icon.png' },
        'test-user'
      )

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Title A',
        expect.objectContaining({
          body: 'Message A'
        })
      )
    })

    it('should get A/B test results', async () => {
      const test = {
        id: 'test-results',
        name: 'Test Results',
        isActive: true,
        startDate: Date.now(),
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A',
            title: 'Title A',
            message: 'Message A',
            weight: 50
          }
        ]
      }

      await pushNotificationService.createABTest(test)
      
      const results = pushNotificationService.getABTestResults(test.id)
      
      expect(results).toBeDefined()
      expect(results?.id).toBe(test.id)
      expect(results?.metrics).toBeDefined()
    })
  })

  describe('Notification Timing Optimization', () => {
    it('should optimize notification timing', async () => {
      const payload = {
        title: 'Optimized Notification',
        body: 'This notification timing is optimized'
      }

      const delay = await pushNotificationService.optimizeNotificationTiming(payload, 'test-user')
      
      expect(typeof delay).toBe('number')
      expect(delay).toBeGreaterThanOrEqual(0)
    })

    it('should avoid late night hours', async () => {
      // Mock current time to be late night
      const mockDate = new Date('2023-01-01T02:00:00')
      vi.setSystemTime(mockDate)

      const payload = {
        title: 'Late Night Notification',
        body: 'Should be delayed until morning'
      }

      const delay = await pushNotificationService.optimizeNotificationTiming(payload)
      
      // Should delay until morning (9 AM)
      expect(delay).toBeGreaterThan(0)
    })
  })

  describe('Subscription Status', () => {
    it('should get subscription status', () => {
      const status = pushNotificationService.getSubscriptionStatus()
      
      expect(status).toBeDefined()
      expect(typeof status.supported).toBe('boolean')
      expect(typeof status.subscribed).toBe('boolean')
      expect(status.permission).toBeDefined()
    })

    it('should check if subscribed', () => {
      const isSubscribed = pushNotificationService.isSubscribed()
      
      expect(typeof isSubscribed).toBe('boolean')
    })
  })

  describe('Preferences', () => {
    it('should get preferences', () => {
      const preferences = pushNotificationService.getPreferences()
      
      expect(preferences).toBeDefined()
      expect(typeof preferences.enabled).toBe('boolean')
      expect(preferences.quietHours).toBeDefined()
    })

    it('should update preferences', async () => {
      const updates = {
        enabled: true,
        pnrUpdates: false,
        systemAlerts: true
      }

      await pushNotificationService.updatePreferences(updates)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('Test Notification', () => {
    it('should send test notification', async () => {
      await pushNotificationService.testNotification()
      
      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          body: 'This is a test notification from PNR Tracker'
        })
      )
    })
  })
})