import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  InAppNotification, 
  NotificationFilter, 
  NotificationSort, 
  NotificationPreferencesDetailed,
  NotificationAnalytics
} from '../types'
import { notificationCenterService } from '../services/notificationCenterService'

interface UseNotificationCenterOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  defaultFilter?: NotificationFilter
  defaultSort?: NotificationSort
}

export function useNotificationCenter(options: UseNotificationCenterOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    defaultFilter,
    defaultSort = { field: 'timestamp', direction: 'desc' }
  } = options

  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [filter, setFilter] = useState<NotificationFilter | undefined>(defaultFilter)
  const [sort, setSort] = useState<NotificationSort>(defaultSort)
  const [preferences, setPreferences] = useState<NotificationPreferencesDetailed>(
    notificationCenterService.getPreferences()
  )
  const [analytics, setAnalytics] = useState<NotificationAnalytics>(
    notificationCenterService.getAnalytics()
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get filtered and sorted notifications
  const filteredNotifications = useMemo(() => {
    return notificationCenterService.getNotifications(filter, sort)
  }, [notifications, filter, sort])

  // Get statistics
  const statistics = useMemo(() => {
    return notificationCenterService.getStatistics()
  }, [notifications])

  // Get unread count
  const unreadCount = useMemo(() => {
    return statistics.unread
  }, [statistics])

  // Get notifications by category
  const notificationsByCategory = useMemo(() => {
    const categories: Record<string, InAppNotification[]> = {}
    filteredNotifications.forEach(notification => {
      if (!categories[notification.category]) {
        categories[notification.category] = []
      }
      categories[notification.category].push(notification)
    })
    return categories
  }, [filteredNotifications])

  // Subscribe to notification changes
  useEffect(() => {
    const unsubscribe = notificationCenterService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications)
      setError(null)
    })

    // Initial load
    setNotifications(notificationCenterService.getNotifications())

    return unsubscribe
  }, [])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setPreferences(notificationCenterService.getPreferences())
      setAnalytics(notificationCenterService.getAnalytics())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Add notification
  const addNotification = useCallback(async (
    notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read' | 'archived' | 'starred' | 'engagement'>
  ) => {
    try {
      setLoading(true)
      setError(null)
      const id = await notificationCenterService.addNotification(notification)
      return id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add notification'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      setError(null)
      await notificationCenterService.markAsRead(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as read'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Mark multiple as read
  const markMultipleAsRead = useCallback(async (ids: string[]) => {
    try {
      setError(null)
      await notificationCenterService.markMultipleAsRead(ids)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notifications as read'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      await notificationCenterService.markAllAsRead()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all as read'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Archive notification
  const archiveNotification = useCallback(async (id: string) => {
    try {
      setError(null)
      await notificationCenterService.archiveNotification(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive notification'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Toggle star
  const toggleStar = useCallback(async (id: string) => {
    try {
      setError(null)
      await notificationCenterService.toggleStar(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle star'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      setError(null)
      await notificationCenterService.deleteNotification(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Snooze notification
  const snoozeNotification = useCallback(async (id: string, snoozeUntil: number) => {
    try {
      setError(null)
      await notificationCenterService.snoozeNotification(id, snoozeUntil)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to snooze notification'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Execute action
  const executeAction = useCallback(async (notificationId: string, actionId: string) => {
    try {
      setError(null)
      await notificationCenterService.executeAction(notificationId, actionId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferencesDetailed>) => {
    try {
      setLoading(true)
      setError(null)
      await notificationCenterService.updatePreferences(updates)
      setPreferences(notificationCenterService.getPreferences())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Cleanup old notifications
  const cleanup = useCallback(async (olderThanDays: number = 30) => {
    try {
      setLoading(true)
      setError(null)
      const removedCount = await notificationCenterService.cleanup(olderThanDays)
      return removedCount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup notifications'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Bulk operations
  const bulkOperations = useMemo(() => ({
    markAsRead: async (ids: string[]) => {
      await markMultipleAsRead(ids)
    },
    archive: async (ids: string[]) => {
      await Promise.all(ids.map(id => archiveNotification(id)))
    },
    delete: async (ids: string[]) => {
      await Promise.all(ids.map(id => deleteNotification(id)))
    },
    star: async (ids: string[]) => {
      await Promise.all(ids.map(id => toggleStar(id)))
    }
  }), [markMultipleAsRead, archiveNotification, deleteNotification, toggleStar])

  // Filter helpers
  const filterHelpers = useMemo(() => ({
    showUnread: () => setFilter({ ...filter, read: false }),
    showStarred: () => setFilter({ ...filter, starred: true }),
    showArchived: () => setFilter({ ...filter, archived: true }),
    showByType: (type: InAppNotification['type']) => setFilter({ ...filter, type: [type] }),
    showByCategory: (category: InAppNotification['category']) => setFilter({ ...filter, category: [category] }),
    clearFilters: () => setFilter(undefined),
    search: (query: string) => setFilter({ ...filter, search: query })
  }), [filter])

  // Sort helpers
  const sortHelpers = useMemo(() => ({
    byTimestamp: (direction: 'asc' | 'desc' = 'desc') => setSort({ field: 'timestamp', direction }),
    byPriority: (direction: 'asc' | 'desc' = 'desc') => setSort({ field: 'priority', direction }),
    byCategory: (direction: 'asc' | 'desc' = 'asc') => setSort({ field: 'category', direction }),
    byReadStatus: (direction: 'asc' | 'desc' = 'asc') => setSort({ field: 'read', direction })
  }), [])

  return {
    // Data
    notifications: filteredNotifications,
    allNotifications: notifications,
    statistics,
    unreadCount,
    notificationsByCategory,
    preferences,
    analytics,
    
    // State
    loading,
    error,
    filter,
    sort,
    
    // Actions
    addNotification,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    archiveNotification,
    toggleStar,
    deleteNotification,
    snoozeNotification,
    executeAction,
    updatePreferences,
    cleanup,
    
    // Bulk operations
    bulkOperations,
    
    // Filter and sort
    setFilter,
    setSort,
    filterHelpers,
    sortHelpers,
    
    // Utilities
    refresh: () => {
      setNotifications(notificationCenterService.getNotifications())
      setPreferences(notificationCenterService.getPreferences())
      setAnalytics(notificationCenterService.getAnalytics())
    }
  }
}

export default useNotificationCenter