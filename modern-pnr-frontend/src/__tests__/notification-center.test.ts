import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { notificationCenterService } from '../services/notificationCenterService'
import { InAppNotification, NotificationPreferencesDetailed } from '../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Notification Center Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Notification Management', () => {
    it('should add a new notification', async () => {
      const notification = {
        type: 'pnr_update' as const,
        category: 'important' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        actionable: false,
        source: 'system' as const,
        priority: 5
      }

      const id = await notificationCenterService.addNotification(notification)
      
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should get notifications with filtering', () => {
      const notifications = notificationCenterService.getNotifications()
      expect(Array.isArray(notifications)).toBe(true)
    })

    it('should filter notifications by type', () => {
      const filter = { type: ['pnr_update' as const] }
      const notifications = notificationCenterService.getNotifications(filter)
      
      notifications.forEach(notification => {
        expect(notification.type).toBe('pnr_update')
      })
    })

    it('should filter notifications by read status', () => {
      const filter = { read: false }
      const notifications = notificationCenterService.getNotifications(filter)
      
      notifications.forEach(notification => {
        expect(notification.read).toBe(false)
      })
    })

    it('should sort notifications by timestamp', () => {
      const sort = { field: 'timestamp' as const, direction: 'desc' as const }
      const notifications = notificationCenterService.getNotifications(undefined, sort)
      
      for (let i = 1; i < notifications.length; i++) {
        expect(notifications[i - 1].timestamp).toBeGreaterThanOrEqual(notifications[i].timestamp)
      }
    })
  })

  describe('Notification Actions', () => {
    it('should mark notification as read', async () => {
      const notification = {
        type: 'pnr_update' as const,
        category: 'normal' as const,
        title: 'Test',
        message: 'Test message',
        actionable: false,
        source: 'system' as const,
        priority: 5
      }

      const id = await notificationCenterService.addNotification(notification)
      await notificationCenterService.markAsRead(id)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should archive notification', async () => {
      const notification = {
        type: 'system_alert' as const,
        category: 'urgent' as const,
        title: 'Alert',
        message: 'System alert',
        actionable: false,
        source: 'system' as const,
        priority: 9
      }

      const id = await notificationCenterService.addNotification(notification)
      await notificationCenterService.archiveNotification(id)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should toggle star status', async () => {
      const notification = {
        type: 'reminder' as const,
        category: 'normal' as const,
        title: 'Reminder',
        message: 'Don\'t forget',
        actionable: false,
        source: 'user' as const,
        priority: 3
      }

      const id = await notificationCenterService.addNotification(notification)
      await notificationCenterService.toggleStar(id)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should delete notification', async () => {
      const notification = {
        type: 'promotion' as const,
        category: 'low' as const,
        title: 'Offer',
        message: 'Special offer',
        actionable: false,
        source: 'external' as const,
        priority: 2
      }

      const id = await notificationCenterService.addNotification(notification)
      await notificationCenterService.deleteNotification(id)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('Preferences Management', () => {
    it('should get default preferences', () => {
      const preferences = notificationCenterService.getPreferences()
      
      expect(preferences).toBeDefined()
      expect(preferences.enabled).toBe(true)
      expect(preferences.categories).toBeDefined()
    })

    it('should update preferences', async () => {
      const updates = {
        enabled: false,
        quietHours: {
          enabled: true,
          start: '23:00',
          end: '07:00',
          allowUrgent: false
        }
      }

      await notificationCenterService.updatePreferences(updates)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('Statistics', () => {
    it('should provide notification statistics', () => {
      const stats = notificationCenterService.getStatistics()
      
      expect(stats).toBeDefined()
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.unread).toBe('number')
      expect(typeof stats.starred).toBe('number')
      expect(typeof stats.archived).toBe('number')
      expect(stats.byType).toBeDefined()
      expect(stats.byCategory).toBeDefined()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup old notifications', async () => {
      const removedCount = await notificationCenterService.cleanup(30)
      
      expect(typeof removedCount).toBe('number')
      expect(removedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Subscription Management', () => {
    it('should handle subscription to changes', () => {
      const mockListener = vi.fn()
      const unsubscribe = notificationCenterService.subscribe(mockListener)
      
      expect(typeof unsubscribe).toBe('function')
      
      // Test unsubscribe
      unsubscribe()
    })
  })
})