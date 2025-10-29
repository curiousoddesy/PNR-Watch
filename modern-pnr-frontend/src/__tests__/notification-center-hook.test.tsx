import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationCenter } from '../hooks/useNotificationCenter'

// Mock the notification center service
vi.mock('../services/notificationCenterService', () => ({
  notificationCenterService: {
    getNotifications: vi.fn(() => []),
    getStatistics: vi.fn(() => ({
      total: 0,
      unread: 0,
      starred: 0,
      archived: 0,
      byType: {},
      byCategory: {}
    })),
    getPreferences: vi.fn(() => ({
      enabled: true,
      categories: {
        pnr_update: { enabled: true, sound: true, vibration: true, desktop: true },
        system_alert: { enabled: true, sound: true, vibration: true, desktop: true },
        promotion: { enabled: false, sound: false, desktop: false },
        reminder: { enabled: true, sound: true, vibration: true, desktop: true },
        achievement: { enabled: true, sound: true, desktop: true },
        social: { enabled: true, sound: false, desktop: true }
      },
      quietHours: { enabled: false, start: '22:00', end: '08:00', allowUrgent: true },
      batchNotifications: { enabled: false, interval: 15, maxBatchSize: 5 },
      smartTiming: { enabled: true, learnFromBehavior: true, respectDeviceUsage: true },
      doNotDisturb: { enabled: false }
    })),
    getAnalytics: vi.fn(() => ({
      totalSent: 0,
      totalViewed: 0,
      totalClicked: 0,
      totalDismissed: 0,
      averageTimeToView: 0,
      averageTimeToAction: 0,
      engagementRate: 0,
      clickThroughRate: 0,
      dismissalRate: 0,
      categoryBreakdown: {},
      timeBasedMetrics: { hourly: {}, daily: {}, weekly: {} },
      deviceMetrics: { desktop: 0, mobile: 0, tablet: 0 }
    })),
    addNotification: vi.fn(() => Promise.resolve('test-id')),
    markAsRead: vi.fn(() => Promise.resolve()),
    markMultipleAsRead: vi.fn(() => Promise.resolve()),
    markAllAsRead: vi.fn(() => Promise.resolve()),
    archiveNotification: vi.fn(() => Promise.resolve()),
    toggleStar: vi.fn(() => Promise.resolve()),
    deleteNotification: vi.fn(() => Promise.resolve()),
    snoozeNotification: vi.fn(() => Promise.resolve()),
    executeAction: vi.fn(() => Promise.resolve()),
    updatePreferences: vi.fn(() => Promise.resolve()),
    cleanup: vi.fn(() => Promise.resolve(5)),
    subscribe: vi.fn(() => vi.fn())
  }
}))

describe('useNotificationCenter Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useNotificationCenter())

      expect(result.current.notifications).toEqual([])
      expect(result.current.statistics).toBeDefined()
      expect(result.current.unreadCount).toBe(0)
      expect(result.current.preferences).toBeDefined()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should initialize with custom options', () => {
      const options = {
        autoRefresh: false,
        refreshInterval: 60000,
        defaultSort: { field: 'priority' as const, direction: 'desc' as const }
      }

      const { result } = renderHook(() => useNotificationCenter(options))

      expect(result.current.sort).toEqual(options.defaultSort)
    })
  })

  describe('Notification Management', () => {
    it('should add notification', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      const notification = {
        type: 'pnr_update' as const,
        category: 'important' as const,
        title: 'Test Notification',
        message: 'Test message',
        actionable: false,
        source: 'system' as const,
        priority: 5
      }

      await act(async () => {
        const id = await result.current.addNotification(notification)
        expect(id).toBe('test-id')
      })
    })

    it('should mark notification as read', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.markAsRead('test-id')
      })

      expect(result.current.error).toBeNull()
    })

    it('should mark multiple notifications as read', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.markMultipleAsRead(['id1', 'id2', 'id3'])
      })

      expect(result.current.error).toBeNull()
    })

    it('should mark all notifications as read', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.markAllAsRead()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should archive notification', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.archiveNotification('test-id')
      })

      expect(result.current.error).toBeNull()
    })

    it('should toggle star', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.toggleStar('test-id')
      })

      expect(result.current.error).toBeNull()
    })

    it('should delete notification', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.deleteNotification('test-id')
      })

      expect(result.current.error).toBeNull()
    })

    it('should snooze notification', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.snoozeNotification('test-id', Date.now() + 900000) // 15 minutes
      })

      expect(result.current.error).toBeNull()
    })

    it('should execute action', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.executeAction('notification-id', 'action-id')
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Bulk Operations', () => {
    it('should perform bulk mark as read', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.bulkOperations.markAsRead(['id1', 'id2'])
      })

      expect(result.current.error).toBeNull()
    })

    it('should perform bulk archive', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.bulkOperations.archive(['id1', 'id2'])
      })

      expect(result.current.error).toBeNull()
    })

    it('should perform bulk delete', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.bulkOperations.delete(['id1', 'id2'])
      })

      expect(result.current.error).toBeNull()
    })

    it('should perform bulk star', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        await result.current.bulkOperations.star(['id1', 'id2'])
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Filtering and Sorting', () => {
    it('should set filter', () => {
      const { result } = renderHook(() => useNotificationCenter())

      const filter = { read: false, type: ['pnr_update' as const] }

      act(() => {
        result.current.setFilter(filter)
      })

      expect(result.current.filter).toEqual(filter)
    })

    it('should set sort', () => {
      const { result } = renderHook(() => useNotificationCenter())

      const sort = { field: 'priority' as const, direction: 'asc' as const }

      act(() => {
        result.current.setSort(sort)
      })

      expect(result.current.sort).toEqual(sort)
    })

    it('should use filter helpers', () => {
      const { result } = renderHook(() => useNotificationCenter())

      act(() => {
        result.current.filterHelpers.showUnread()
      })

      expect(result.current.filter?.read).toBe(false)

      act(() => {
        result.current.filterHelpers.showStarred()
      })

      expect(result.current.filter?.starred).toBe(true)

      act(() => {
        result.current.filterHelpers.clearFilters()
      })

      expect(result.current.filter).toBeUndefined()
    })

    it('should use sort helpers', () => {
      const { result } = renderHook(() => useNotificationCenter())

      act(() => {
        result.current.sortHelpers.byTimestamp('asc')
      })

      expect(result.current.sort).toEqual({ field: 'timestamp', direction: 'asc' })

      act(() => {
        result.current.sortHelpers.byPriority('desc')
      })

      expect(result.current.sort).toEqual({ field: 'priority', direction: 'desc' })
    })
  })

  describe('Preferences Management', () => {
    it('should update preferences', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      const updates = {
        enabled: false,
        quietHours: {
          enabled: true,
          start: '23:00',
          end: '07:00',
          allowUrgent: false
        }
      }

      await act(async () => {
        await result.current.updatePreferences(updates)
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup old notifications', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      await act(async () => {
        const removedCount = await result.current.cleanup(30)
        expect(removedCount).toBe(5)
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle errors in add notification', async () => {
      const { result } = renderHook(() => useNotificationCenter())

      // Mock service to throw error
      const mockService = await import('../services/notificationCenterService')
      vi.mocked(mockService.notificationCenterService.addNotification).mockRejectedValueOnce(
        new Error('Failed to add notification')
      )

      await act(async () => {
        try {
          await result.current.addNotification({
            type: 'pnr_update',
            category: 'normal',
            title: 'Test',
            message: 'Test',
            actionable: false,
            source: 'system',
            priority: 5
          })
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to add notification')
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh data', () => {
      const { result } = renderHook(() => useNotificationCenter())

      act(() => {
        result.current.refresh()
      })

      // Should not throw and should call service methods
      expect(result.current.error).toBeNull()
    })
  })
})