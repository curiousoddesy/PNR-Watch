import { 
  InAppNotification, 
  NotificationFilter, 
  NotificationSort, 
  NotificationPreferencesDetailed,
  NotificationTemplate,
  NotificationSchedule,
  NotificationAnalytics,
  NotificationEngagement
} from '../types'

class NotificationCenterService {
  private readonly STORAGE_KEY = 'notification-center'
  private readonly PREFERENCES_KEY = 'notification-preferences-detailed'
  private readonly TEMPLATES_KEY = 'notification-templates'
  private readonly ANALYTICS_KEY = 'notification-analytics'
  
  private notifications: InAppNotification[] = []
  private preferences: NotificationPreferencesDetailed = this.getDefaultPreferences()
  private templates: NotificationTemplate[] = this.getDefaultTemplates()
  private analytics: NotificationAnalytics = this.getDefaultAnalytics()
  private listeners: Set<(notifications: InAppNotification[]) => void> = new Set()
  private schedules: Map<string, NotificationSchedule> = new Map()

  constructor() {
    this.initialize()
  }

  /**
   * Initialize the notification center
   */
  private async initialize() {
    try {
      await this.loadNotifications()
      await this.loadPreferences()
      await this.loadTemplates()
      await this.loadAnalytics()
      this.startScheduleProcessor()
      this.startAnalyticsProcessor()
    } catch (error) {
      console.error('Failed to initialize notification center:', error)
    }
  }

  /**
   * Add a new notification
   */
  async addNotification(notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read' | 'archived' | 'starred' | 'engagement'>): Promise<string> {
    const id = this.generateId()
    const timestamp = Date.now()
    
    const newNotification: InAppNotification = {
      ...notification,
      id,
      timestamp,
      read: false,
      archived: false,
      starred: false,
      engagement: {
        viewed: false,
        clicked: false,
        dismissed: false
      }
    }

    // Check if notification should be shown based on preferences
    if (!this.shouldShowNotification(newNotification)) {
      console.log('Notification filtered by preferences:', newNotification.title)
      return id
    }

    // Check for duplicates and merge if necessary
    const existingIndex = this.notifications.findIndex(n => 
      n.type === newNotification.type && 
      n.relatedPNR === newNotification.relatedPNR &&
      n.title === newNotification.title &&
      !n.archived
    )

    if (existingIndex !== -1) {
      // Update existing notification instead of creating duplicate
      this.notifications[existingIndex] = {
        ...this.notifications[existingIndex],
        ...newNotification,
        id: this.notifications[existingIndex].id, // Keep original ID
        timestamp: Math.max(this.notifications[existingIndex].timestamp, timestamp)
      }
    } else {
      this.notifications.unshift(newNotification)
    }

    // Limit total notifications to prevent memory issues
    if (this.notifications.length > 1000) {
      this.notifications = this.notifications.slice(0, 1000)
    }

    await this.saveNotifications()
    this.notifyListeners()
    this.updateAnalytics('sent', newNotification)

    return id
  }

  /**
   * Get notifications with filtering and sorting
   */
  getNotifications(filter?: NotificationFilter, sort?: NotificationSort): InAppNotification[] {
    let filtered = [...this.notifications]

    // Apply filters
    if (filter) {
      if (filter.type?.length) {
        filtered = filtered.filter(n => filter.type!.includes(n.type))
      }
      
      if (filter.category?.length) {
        filtered = filtered.filter(n => filter.category!.includes(n.category))
      }
      
      if (filter.read !== undefined) {
        filtered = filtered.filter(n => n.read === filter.read)
      }
      
      if (filter.archived !== undefined) {
        filtered = filtered.filter(n => n.archived === filter.archived)
      }
      
      if (filter.starred !== undefined) {
        filtered = filtered.filter(n => n.starred === filter.starred)
      }
      
      if (filter.dateRange) {
        filtered = filtered.filter(n => 
          n.timestamp >= filter.dateRange!.start && 
          n.timestamp <= filter.dateRange!.end
        )
      }
      
      if (filter.tags?.length) {
        filtered = filtered.filter(n => 
          n.tags?.some(tag => filter.tags!.includes(tag))
        )
      }
      
      if (filter.source?.length) {
        filtered = filtered.filter(n => filter.source!.includes(n.source))
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filtered = filtered.filter(n => 
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower) ||
          n.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }
    }

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any
        
        switch (sort.field) {
          case 'timestamp':
            aValue = a.timestamp
            bValue = b.timestamp
            break
          case 'priority':
            aValue = a.priority
            bValue = b.priority
            break
          case 'category':
            aValue = a.category
            bValue = b.category
            break
          case 'read':
            aValue = a.read ? 1 : 0
            bValue = b.read ? 1 : 0
            break
          default:
            return 0
        }
        
        if (sort.direction === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
      })
    }

    return filtered
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === id)
    if (notification && !notification.read) {
      notification.read = true
      notification.engagement!.viewed = true
      notification.engagement!.viewedAt = Date.now()
      
      await this.saveNotifications()
      this.notifyListeners()
      this.updateAnalytics('viewed', notification)
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    let changed = false
    
    ids.forEach(id => {
      const notification = this.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        notification.read = true
        notification.engagement!.viewed = true
        notification.engagement!.viewedAt = Date.now()
        changed = true
        this.updateAnalytics('viewed', notification)
      }
    })
    
    if (changed) {
      await this.saveNotifications()
      this.notifyListeners()
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    let changed = false
    
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true
        notification.engagement!.viewed = true
        notification.engagement!.viewedAt = Date.now()
        changed = true
        this.updateAnalytics('viewed', notification)
      }
    })
    
    if (changed) {
      await this.saveNotifications()
      this.notifyListeners()
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(id: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.archived = true
      await this.saveNotifications()
      this.notifyListeners()
    }
  }

  /**
   * Star/unstar notification
   */
  async toggleStar(id: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.starred = !notification.starred
      await this.saveNotifications()
      this.notifyListeners()
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === id)
    if (index !== -1) {
      this.notifications.splice(index, 1)
      await this.saveNotifications()
      this.notifyListeners()
    }
  }

  /**
   * Snooze notification
   */
  async snoozeNotification(id: string, snoozeUntil: number): Promise<void> {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.snoozeUntil = snoozeUntil
      await this.saveNotifications()
      this.notifyListeners()
    }
  }

  /**
   * Execute notification action
   */
  async executeAction(notificationId: string, actionId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (!notification) return

    const action = notification.actions?.find(a => a.id === actionId)
    if (!action) return

    // Update engagement
    notification.engagement!.clicked = true
    notification.engagement!.clickedAt = Date.now()
    notification.engagement!.actionTaken = actionId
    notification.engagement!.actionTakenAt = Date.now()
    
    if (notification.engagement!.viewedAt) {
      notification.engagement!.timeToAction = Date.now() - notification.engagement!.viewedAt
    }

    // Execute action
    try {
      if (action.callback) {
        await action.callback()
      } else if (action.url) {
        window.open(action.url, '_blank')
      }
      
      this.updateAnalytics('clicked', notification)
    } catch (error) {
      console.error('Failed to execute notification action:', error)
    }

    await this.saveNotifications()
    this.notifyListeners()
  }

  /**
   * Get notification statistics
   */
  getStatistics(): {
    total: number
    unread: number
    starred: number
    archived: number
    byType: Record<string, number>
    byCategory: Record<string, number>
  } {
    const stats = {
      total: this.notifications.length,
      unread: 0,
      starred: 0,
      archived: 0,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    }

    this.notifications.forEach(notification => {
      if (!notification.read) stats.unread++
      if (notification.starred) stats.starred++
      if (notification.archived) stats.archived++
      
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
      stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1
    })

    return stats
  }

  /**
   * Clean up old notifications
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    const initialCount = this.notifications.length
    
    this.notifications = this.notifications.filter(notification => 
      notification.timestamp > cutoffTime || 
      notification.starred || 
      !notification.read
    )
    
    const removedCount = initialCount - this.notifications.length
    
    if (removedCount > 0) {
      await this.saveNotifications()
      this.notifyListeners()
    }
    
    return removedCount
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: InAppNotification[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Get preferences
   */
  getPreferences(): NotificationPreferencesDetailed {
    return { ...this.preferences }
  }

  /**
   * Update preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferencesDetailed>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates }
    await this.savePreferences()
  }

  /**
   * Get analytics
   */
  getAnalytics(): NotificationAnalytics {
    return { ...this.analytics }
  }

  /**
   * Private helper methods
   */
  private async loadNotifications(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.notifications = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notifications))
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.PREFERENCES_KEY)
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.TEMPLATES_KEY)
      if (stored) {
        this.templates = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  private async loadAnalytics(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.ANALYTICS_KEY)
      if (stored) {
        this.analytics = { ...this.analytics, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  private async saveAnalytics(): Promise<void> {
    try {
      localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(this.analytics))
    } catch (error) {
      console.error('Failed to save analytics:', error)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.notifications])
      } catch (error) {
        console.error('Error in notification listener:', error)
      }
    })
  }

  private shouldShowNotification(notification: InAppNotification): boolean {
    if (!this.preferences.enabled) return false

    const categoryPrefs = this.preferences.categories[notification.type]
    if (!categoryPrefs?.enabled) return false

    // Check quiet hours
    if (this.preferences.quietHours.enabled) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      const start = this.preferences.quietHours.start
      const end = this.preferences.quietHours.end
      
      const isInQuietHours = start > end 
        ? (currentTime >= start || currentTime <= end)
        : (currentTime >= start && currentTime <= end)
      
      if (isInQuietHours && !(this.preferences.quietHours.allowUrgent && notification.category === 'urgent')) {
        return false
      }
    }

    // Check do not disturb
    if (this.preferences.doNotDisturb.enabled && this.preferences.doNotDisturb.schedule) {
      const now = new Date()
      const currentDay = now.getDay()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      const schedule = this.preferences.doNotDisturb.schedule
      if (schedule.days.includes(currentDay)) {
        const start = schedule.start
        const end = schedule.end
        
        const isInDndHours = start > end 
          ? (currentTime >= start || currentTime <= end)
          : (currentTime >= start && currentTime <= end)
        
        if (isInDndHours) return false
      }
    }

    return true
  }

  private updateAnalytics(action: 'sent' | 'viewed' | 'clicked' | 'dismissed', notification: InAppNotification): void {
    this.analytics.totalSent = this.analytics.totalSent || 0
    this.analytics.totalViewed = this.analytics.totalViewed || 0
    this.analytics.totalClicked = this.analytics.totalClicked || 0
    this.analytics.totalDismissed = this.analytics.totalDismissed || 0

    switch (action) {
      case 'sent':
        this.analytics.totalSent++
        break
      case 'viewed':
        this.analytics.totalViewed++
        break
      case 'clicked':
        this.analytics.totalClicked++
        break
      case 'dismissed':
        this.analytics.totalDismissed++
        break
    }

    // Update category breakdown
    if (!this.analytics.categoryBreakdown[notification.type]) {
      this.analytics.categoryBreakdown[notification.type] = {
        sent: 0,
        viewed: 0,
        clicked: 0,
        dismissed: 0
      }
    }
    this.analytics.categoryBreakdown[notification.type][action]++

    // Calculate rates
    this.analytics.engagementRate = this.analytics.totalSent > 0 
      ? (this.analytics.totalViewed + this.analytics.totalClicked) / this.analytics.totalSent 
      : 0
    this.analytics.clickThroughRate = this.analytics.totalViewed > 0 
      ? this.analytics.totalClicked / this.analytics.totalViewed 
      : 0
    this.analytics.dismissalRate = this.analytics.totalSent > 0 
      ? this.analytics.totalDismissed / this.analytics.totalSent 
      : 0

    // Save analytics periodically
    this.saveAnalytics()
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startScheduleProcessor(): void {
    // Process scheduled notifications every minute
    setInterval(() => {
      const now = Date.now()
      this.schedules.forEach((schedule, id) => {
        if (schedule.status === 'pending' && schedule.scheduledFor <= now) {
          // Process scheduled notification
          console.log('Processing scheduled notification:', id)
          // Implementation would depend on how scheduled notifications are stored
        }
      })
    }, 60000)
  }

  private startAnalyticsProcessor(): void {
    // Save analytics every 5 minutes
    setInterval(() => {
      this.saveAnalytics()
    }, 300000)
  }

  private getDefaultPreferences(): NotificationPreferencesDetailed {
    return {
      enabled: true,
      categories: {
        pnr_update: {
          enabled: true,
          sound: true,
          vibration: true,
          desktop: true,
          email: false,
          sms: false
        },
        system_alert: {
          enabled: true,
          sound: true,
          vibration: true,
          desktop: true,
          email: false
        },
        promotion: {
          enabled: false,
          sound: false,
          desktop: false,
          email: false
        },
        reminder: {
          enabled: true,
          sound: true,
          vibration: true,
          desktop: true
        },
        achievement: {
          enabled: true,
          sound: true,
          desktop: true
        },
        social: {
          enabled: true,
          sound: false,
          desktop: true
        }
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        allowUrgent: true
      },
      batchNotifications: {
        enabled: false,
        interval: 15,
        maxBatchSize: 5
      },
      smartTiming: {
        enabled: true,
        learnFromBehavior: true,
        respectDeviceUsage: true
      },
      doNotDisturb: {
        enabled: false
      }
    }
  }

  private getDefaultTemplates(): NotificationTemplate[] {
    return [
      {
        id: 'pnr_status_update',
        type: 'pnr_update',
        name: 'PNR Status Update',
        title: 'PNR {{pnrNumber}} Status Updated',
        message: 'Your PNR {{pnrNumber}} status has been updated to {{status}}',
        icon: 'train',
        defaultCategory: 'important',
        customizable: true,
        variables: ['pnrNumber', 'status', 'passengerName']
      },
      {
        id: 'chart_prepared',
        type: 'pnr_update',
        name: 'Chart Prepared',
        title: 'Chart Prepared for {{trainName}}',
        message: 'Chart has been prepared for train {{trainNumber}} - {{trainName}}',
        icon: 'check-circle',
        defaultCategory: 'important',
        customizable: true,
        variables: ['trainNumber', 'trainName', 'pnrNumber']
      }
    ]
  }

  private getDefaultAnalytics(): NotificationAnalytics {
    return {
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
      timeBasedMetrics: {
        hourly: {},
        daily: {},
        weekly: {}
      },
      deviceMetrics: {
        desktop: 0,
        mobile: 0,
        tablet: 0
      }
    }
  }
}

export const notificationCenterService = new NotificationCenterService()