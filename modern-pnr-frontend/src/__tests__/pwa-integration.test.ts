// Integration tests for PWA functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pwaManager } from '../utils/pwa'
import { cacheService } from '../services/cacheService'
import { backgroundSyncService } from '../services/backgroundSyncService'
import { offlineManager } from '../services/offlineManager'

// Mock DOM APIs
const mockServiceWorker = {
  register: vi.fn(),
  ready: Promise.resolve({
    pushManager: {
      subscribe: vi.fn(),
      getSubscription: vi.fn(),
    },
    showNotification: vi.fn(),
    sync: {
      register: vi.fn(),
    },
  }),
  addEventListener: vi.fn(),
  controller: null,
}

const mockCaches = {
  open: vi.fn(),
  keys: vi.fn(),
  delete: vi.fn(),
}

const mockCache = {
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
}

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

const mockFetch = vi.fn()

// Mock beforeinstallprompt event
class MockBeforeInstallPromptEvent extends Event {
  platforms = ['web']
  userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
  prompt = vi.fn().mockResolvedValue(undefined)
}

describe('PWA Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup global mocks
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
    })
    
    Object.defineProperty(global, 'caches', {
      value: mockCaches,
      writable: true,
    })
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    
    Object.defineProperty(global, 'fetch', {
      value: mockFetch,
      writable: true,
    })
    
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    })
    
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })
    
    // Setup default mock implementations
    mockCaches.open.mockResolvedValue(mockCache)
    mockCaches.keys.mockResolvedValue(['api-cache-v1'])
    mockCache.match.mockResolvedValue(null)
    mockCache.keys.mockResolvedValue([])
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-vapid-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('PWA Installation Flow', () => {
    it('should complete full installation flow', async () => {
      // Simulate beforeinstallprompt event
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      
      // Trigger the event
      window.dispatchEvent(mockEvent)
      
      // Check that PWA can be installed
      const installInfo = pwaManager.getInstallInfo()
      expect(installInfo.canInstall).toBe(true)
      
      // Install the app
      const installResult = await pwaManager.installApp()
      expect(installResult).toBe(true)
      expect(mockEvent.prompt).toHaveBeenCalled()
      
      // Check that app is now considered installed
      const updatedInfo = pwaManager.getInstallInfo()
      expect(updatedInfo.isInstalled).toBe(true)
    })

    it('should handle installation rejection gracefully', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' })
      
      window.dispatchEvent(mockEvent)
      
      const installResult = await pwaManager.installApp()
      expect(installResult).toBe(false)
    })

    it('should not show install prompt when already dismissed', async () => {
      mockLocalStorage.getItem.mockReturnValue('1234567890') // Dismissed timestamp
      
      const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt')
      window.dispatchEvent(mockEvent)
      
      const installInfo = pwaManager.getInstallInfo()
      expect(installInfo.canInstall).toBe(false)
    })
  })

  describe('Offline Functionality Integration', () => {
    it('should handle offline-to-online transition with sync', async () => {
      // Start offline
      navigator.onLine = false
      
      // Store some offline data
      await offlineManager.storeOfflineData('pnr', 'ABC123', {
        pnrNumber: 'ABC123',
        status: 'confirmed',
      })
      
      // Queue an offline action
      await backgroundSyncService.addTask('pnr-update', {
        id: 'ABC123',
        status: 'confirmed',
      })
      
      // Verify data is stored
      const offlineData = await offlineManager.getOfflineData('pnr', 'ABC123')
      expect(offlineData).toEqual({
        pnrNumber: 'ABC123',
        status: 'confirmed',
      })
      
      // Go back online
      navigator.onLine = true
      
      // Simulate successful sync
      mockFetch.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      // Trigger sync
      const syncResult = await offlineManager.synchronizeData()
      expect(syncResult.synced).toBeGreaterThan(0)
      
      // Process background sync queue
      const queueResult = await backgroundSyncService.processSyncQueue()
      expect(queueResult.processed).toBeGreaterThan(0)
    })

    it('should handle data conflicts during sync', async () => {
      // Store offline data with older timestamp
      const offlineData = {
        pnrNumber: 'ABC123',
        status: 'confirmed',
        updatedAt: '2023-01-01T00:00:00Z',
      }
      
      await offlineManager.storeOfflineData('pnr', 'ABC123', offlineData)
      
      // Mock server response with newer data
      const serverData = {
        pnrNumber: 'ABC123',
        status: 'cancelled',
        updatedAt: '2023-01-02T00:00:00Z', // Newer
      }
      
      mockFetch.mockResolvedValue(new Response(JSON.stringify(serverData), { status: 200 }))
      
      // Trigger sync
      const syncResult = await offlineManager.synchronizeData()
      
      // Should detect conflict
      expect(syncResult.conflicts).toBe(1)
      expect(syncResult.synced).toBe(0)
      
      // Resolve conflict with server-wins strategy
      const resolveResult = await offlineManager.resolveConflict('ABC123', 'pnr', 'server-wins')
      expect(resolveResult).toBe(true)
    })

    it('should cache API responses and serve from cache when offline', async () => {
      const testData = { id: 1, name: 'Test PNR' }
      const testUrl = '/api/pnr/ABC123'
      
      // Cache some data
      await cacheService.cacheData(testUrl, testData)
      
      // Mock cache hit
      const mockResponse = new Response(JSON.stringify(testData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Timestamp': Date.now().toString(),
        },
      })
      mockCache.match.mockResolvedValue(mockResponse)
      
      // Retrieve cached data
      const cachedData = await cacheService.getCachedData(testUrl)
      expect(cachedData).toEqual(testData)
    })
  })

  describe('Push Notifications Integration', () => {
    it('should complete push notification subscription flow', async () => {
      const mockSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth',
        },
      }
      
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      
      mockServiceWorker.ready = Promise.resolve(mockRegistration)
      
      // Request notification permission
      const permission = await pwaManager.requestNotificationPermission()
      expect(permission).toBe('granted')
      
      // Subscribe to push notifications
      const subscription = await pwaManager.subscribeToPushNotifications()
      expect(subscription).toEqual(mockSubscription)
      
      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(ArrayBuffer),
      })
    })

    it('should handle existing push subscription', async () => {
      const existingSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/existing',
      }
      
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(existingSubscription),
        },
      }
      
      mockServiceWorker.ready = Promise.resolve(mockRegistration)
      
      const subscription = await pwaManager.subscribeToPushNotifications()
      expect(subscription).toEqual(existingSubscription)
    })

    it('should unsubscribe from push notifications', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockResolvedValue(true),
      }
      
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      
      mockServiceWorker.ready = Promise.resolve(mockRegistration)
      
      const result = await pwaManager.unsubscribeFromPushNotifications()
      expect(result).toBe(true)
      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Service Worker Integration', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue({
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        addEventListener: vi.fn(),
      })
      
      // Service worker should be registered during PWA manager initialization
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
    })

    it('should handle service worker update', async () => {
      const mockRegistration = {
        waiting: {
          postMessage: vi.fn(),
        },
        addEventListener: vi.fn(),
      }
      
      // Simulate update available
      const manager = pwaManager as any
      manager.registration = mockRegistration
      
      const updateResult = await pwaManager.updateApp()
      expect(updateResult).toBe(true)
      expect(mockRegistration.waiting.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      })
    })
  })

  describe('Cache Management Integration', () => {
    it('should manage cache lifecycle', async () => {
      // Get initial cache stats
      const initialStats = await cacheService.getCacheStats()
      expect(initialStats).toHaveProperty('api-cache')
      
      // Cache some data
      await cacheService.cacheData('/api/test', { test: 'data' })
      
      // Process offline queue
      await cacheService.queueOfflineAction({
        url: '/api/test',
        method: 'POST',
        body: { data: 'test' },
      })
      
      const queueResult = await cacheService.processOfflineQueue()
      expect(queueResult.success).toBeGreaterThanOrEqual(0)
      
      // Clear all caches
      await cacheService.clearAllCaches()
      expect(mockCaches.delete).toHaveBeenCalled()
    })

    it('should handle cache quota management', async () => {
      // Mock quota exceeded error
      mockCache.put.mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'))
      
      // Should handle gracefully
      await expect(cacheService.cacheData('/api/large-data', { large: 'data' }))
        .resolves.toBeUndefined()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      // Queue an action
      await backgroundSyncService.addTask('pnr-add', { pnrNumber: 'ABC123' })
      
      // Process queue - should handle error
      const result = await backgroundSyncService.processSyncQueue()
      expect(result.failed).toBe(0) // Should be queued for retry, not failed
    })

    it('should handle service worker registration failure', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'))
      
      // Should not throw and continue working
      expect(() => {
        // Re-initialize PWA manager
        const manager = pwaManager as any
        manager.registerServiceWorker()
      }).not.toThrow()
    })

    it('should handle storage errors', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      // Should handle gracefully
      await expect(offlineManager.storeOfflineData('pnr', 'ABC123', { test: 'data' }))
        .resolves.toBeUndefined()
    })
  })

  describe('Performance Integration', () => {
    it('should not block main thread during large operations', async () => {
      const startTime = performance.now()
      
      // Perform multiple operations
      await Promise.all([
        cacheService.cacheData('/api/test1', { data: 'test1' }),
        cacheService.cacheData('/api/test2', { data: 'test2' }),
        cacheService.cacheData('/api/test3', { data: 'test3' }),
        backgroundSyncService.addTask('pnr-add', { pnrNumber: 'ABC123' }),
        backgroundSyncService.addTask('pnr-update', { id: 'DEF456' }),
        offlineManager.storeOfflineData('pnr', 'GHI789', { test: 'data' }),
      ])
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete reasonably quickly (less than 100ms)
      expect(duration).toBeLessThan(100)
    })

    it('should handle concurrent sync operations', async () => {
      // Start multiple sync operations
      const syncPromises = [
        backgroundSyncService.processSyncQueue(),
        backgroundSyncService.processSyncQueue(),
        backgroundSyncService.processSyncQueue(),
      ]
      
      const results = await Promise.all(syncPromises)
      
      // Only one should actually process, others should return immediately
      const processedCounts = results.map(r => r.processed)
      const totalProcessed = processedCounts.reduce((sum, count) => sum + count, 0)
      
      // Should not process the same items multiple times
      expect(totalProcessed).toBeLessThanOrEqual(1)
    })
  })
})