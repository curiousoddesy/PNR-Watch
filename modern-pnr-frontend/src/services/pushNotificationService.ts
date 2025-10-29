// Push notification service for PWA

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  timestamp?: number
  url?: string
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotificationPreferences {
  enabled: boolean
  pnrUpdates: boolean
  systemAlerts: boolean
  promotions: boolean
  quietHours: {
    enabled: boolean
    start: string // HH:MM format
    end: string   // HH:MM format
  }
}

class PushNotificationService {
  private readonly PREFERENCES_KEY = 'notification-preferences'
  private readonly SUBSCRIPTION_KEY = 'push-subscription'
  private readonly BATCH_QUEUE_KEY = 'notification-batch-queue'
  private readonly AB_TESTS_KEY = 'notification-ab-tests'
  private readonly ANALYTICS_KEY = 'push-notification-analytics'
  
  private subscription: PushSubscription | null = null
  private preferences: NotificationPreferences = {
    enabled: false,
    pnrUpdates: true,
    systemAlerts: true,
    promotions: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  }
  
  private batchQueue: NotificationBatch[] = []
  private abTests: ABTest[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private analytics: Record<string, any> = {}

  constructor() {
    this.initialize()
  }

  /**
   * Initialize push notification service
   */
  private async initialize() {
    try {
      // Load preferences and data
      await this.loadPreferences()
      await this.loadBatchQueue()
      await this.loadABTests()
      
      // Check for existing subscription
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready
        this.subscription = await registration.pushManager.getSubscription()
        
        if (this.subscription) {
          console.log('Existing push subscription found')
          await this.syncSubscriptionWithServer()
        }
        
        // Set up notification click handler
        this.setupNotificationClickHandler(registration)
      }
      
      // Start batch processing
      this.scheduleBatchProcessing()
    } catch (error) {
      console.error('Failed to initialize push notification service:', error)
    }
  }

  private setupNotificationClickHandler(registration: ServiceWorkerRegistration): void {
    // Listen for notification clicks
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          this.handleNotificationClick(event.data.notification, event.data.action)
        }
      })
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    console.log('Notification permission:', permission)
    
    if (permission === 'granted') {
      this.preferences.enabled = true
      await this.savePreferences()
    }
    
    return permission
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported')
        return null
      }

      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        return null
      }

      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        this.subscription = existingSubscription
        return existingSubscription
      }

      // Create new subscription
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured')
        return null
      }

      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      })

      console.log('Push subscription created')
      
      // Save subscription and sync with server
      await this.saveSubscription()
      await this.syncSubscriptionWithServer()
      
      return this.subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        const success = await this.subscription.unsubscribe()
        if (success) {
          this.subscription = null
          await this.removeSubscription()
          await this.removeSubscriptionFromServer()
          console.log('Push subscription removed')
        }
        return success
      }
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  /**
   * Show local notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    try {
      if (!this.canShowNotification()) {
        console.log('Notifications disabled or in quiet hours')
        return
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/pwa-192x192.png',
          badge: payload.badge || '/pwa-64x64.png',
          tag: payload.tag || 'default',
          data: payload.data || {},
          actions: payload.actions || [],
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false,
          timestamp: payload.timestamp || Date.now(),
        })
      } else {
        // Fallback to browser notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/pwa-192x192.png',
          tag: payload.tag || 'default',
          data: payload.data || {},
        })
      }

      console.log('Notification shown:', payload.title)
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  /**
   * Schedule notification
   */
  async scheduleNotification(payload: NotificationPayload, delay: number): Promise<void> {
    setTimeout(() => {
      this.showNotification(payload)
    }, delay)
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates }
    await this.savePreferences()
    
    // If notifications are disabled, unsubscribe
    if (!this.preferences.enabled && this.subscription) {
      await this.unsubscribe()
    }
    
    console.log('Notification preferences updated')
  }

  /**
   * Check if subscribed
   */
  isSubscribed(): boolean {
    return !!this.subscription
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(): {
    supported: boolean
    permission: NotificationPermission
    subscribed: boolean
    subscription: PushSubscription | null
  } {
    return {
      supported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
      permission: Notification.permission,
      subscribed: this.isSubscribed(),
      subscription: this.subscription,
    }
  }

  /**
   * Show rich notification with advanced features
   */
  async showRichNotification(payload: RichNotificationPayload): Promise<void> {
    try {
      if (!this.canShowNotification()) {
        console.log('Rich notifications disabled or in quiet hours')
        return
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/pwa-192x192.png',
          badge: payload.badge || '/pwa-64x64.png',
          image: payload.image,
          tag: payload.tag || 'default',
          data: {
            ...payload.data,
            url: payload.url,
            timestamp: payload.timestamp || Date.now()
          },
          actions: payload.actions || [],
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false,
          vibrate: payload.vibrate || [200, 100, 200],
          renotify: payload.renotify || false,
          sticky: payload.sticky || false,
          dir: payload.dir || 'auto',
          lang: payload.lang || 'en'
        })
      }

      console.log('Rich notification shown:', payload.title)
      this.trackNotificationEvent('sent', payload)
    } catch (error) {
      console.error('Failed to show rich notification:', error)
    }
  }

  /**
   * Schedule notification batch
   */
  async scheduleNotificationBatch(
    notifications: NotificationPayload[],
    delay: number,
    options: {
      batchSize?: number
      priority?: 'low' | 'normal' | 'high'
      intelligentTiming?: boolean
    } = {}
  ): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const scheduledFor = Date.now() + delay
    
    const batch: NotificationBatch = {
      id: batchId,
      notifications,
      scheduledFor: options.intelligentTiming ? this.calculateOptimalTime(scheduledFor) : scheduledFor,
      batchSize: options.batchSize || 5,
      priority: options.priority || 'normal',
      status: 'pending'
    }

    this.batchQueue.push(batch)
    await this.saveBatchQueue()
    
    this.scheduleBatchProcessing()
    
    return batchId
  }

  /**
   * Create A/B test for notifications
   */
  async createABTest(test: Omit<ABTest, 'metrics'>): Promise<string> {
    const abTest: ABTest = {
      ...test,
      metrics: {}
    }

    // Initialize metrics for each variant
    test.variants.forEach(variant => {
      abTest.metrics[variant.id] = {
        sent: 0,
        delivered: 0,
        clicked: 0,
        dismissed: 0,
        conversionRate: 0
      }
    })

    this.abTests.push(abTest)
    await this.saveABTests()
    
    return abTest.id
  }

  /**
   * Send notification with A/B testing
   */
  async sendNotificationWithABTest(
    testId: string,
    basePayload: Omit<NotificationPayload, 'title' | 'body'>,
    userId?: string
  ): Promise<void> {
    const test = this.abTests.find(t => t.id === testId && t.isActive)
    if (!test) {
      console.error('A/B test not found or inactive:', testId)
      return
    }

    // Select variant based on weights
    const variant = this.selectABTestVariant(test, userId)
    if (!variant) return

    const payload: NotificationPayload = {
      ...basePayload,
      title: variant.title,
      body: variant.message,
      icon: variant.icon || basePayload.icon,
      actions: variant.actions || basePayload.actions,
      data: {
        ...basePayload.data,
        abTestId: testId,
        variantId: variant.id
      }
    }

    await this.showNotification(payload)
    
    // Track A/B test metrics
    this.trackABTestEvent(testId, variant.id, 'sent')
  }

  /**
   * Handle notification click with deep linking
   */
  async handleNotificationClick(
    notificationData: any,
    action?: string
  ): Promise<void> {
    try {
      // Track click event
      if (notificationData.abTestId && notificationData.variantId) {
        this.trackABTestEvent(notificationData.abTestId, notificationData.variantId, 'clicked')
      }

      // Handle deep linking
      if (notificationData.url) {
        const deepLinkConfig: DeepLinkConfig = {
          url: notificationData.url,
          fallbackUrl: notificationData.fallbackUrl,
          parameters: notificationData.parameters,
          trackingParams: {
            source: 'push_notification',
            action: action || 'click',
            timestamp: Date.now().toString()
          }
        }

        await this.handleDeepLink(deepLinkConfig)
      }

      // Execute custom action if provided
      if (action && notificationData.customActions?.[action]) {
        await notificationData.customActions[action]()
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error)
    }
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testId: string): ABTest | null {
    const test = this.abTests.find(t => t.id === testId)
    if (!test) return null

    // Calculate conversion rates
    Object.keys(test.metrics).forEach(variantId => {
      const metrics = test.metrics[variantId]
      metrics.conversionRate = metrics.sent > 0 ? (metrics.clicked / metrics.sent) * 100 : 0
    })

    return test
  }

  /**
   * Optimize notification timing based on user behavior
   */
  async optimizeNotificationTiming(
    payload: NotificationPayload,
    userId?: string
  ): Promise<number> {
    // Get user's historical engagement data
    const userEngagement = await this.getUserEngagementData(userId)
    
    // Calculate optimal time based on:
    // 1. User's most active hours
    // 2. Historical click-through rates by time
    // 3. Device usage patterns
    // 4. Time zone considerations
    
    const now = new Date()
    const currentHour = now.getHours()
    
    // Simple optimization: avoid late night/early morning hours
    if (currentHour >= 22 || currentHour <= 7) {
      // Schedule for next optimal time (9 AM)
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow.getTime() - now.getTime()
    }
    
    // If user has high engagement during current hour, send immediately
    if (userEngagement.hourlyEngagement?.[currentHour] > 0.7) {
      return 0
    }
    
    // Otherwise, find the next high-engagement hour
    const nextOptimalHour = this.findNextOptimalHour(userEngagement, currentHour)
    const nextOptimalTime = new Date(now)
    nextOptimalTime.setHours(nextOptimalHour, 0, 0, 0)
    
    if (nextOptimalTime <= now) {
      nextOptimalTime.setDate(nextOptimalTime.getDate() + 1)
    }
    
    return nextOptimalTime.getTime() - now.getTime()
  }

  /**
   * Test notification
   */
  async testNotification(): Promise<void> {
    await this.showRichNotification({
      title: 'Test Notification',
      body: 'This is a test notification from PNR Tracker',
      tag: 'test',
      image: '/test-notification-image.jpg',
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'view', title: 'View', icon: '/icons/view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' },
      ],
      data: {
        url: '/notifications/test',
        customActions: {
          view: () => console.log('Test notification viewed'),
          dismiss: () => console.log('Test notification dismissed')
        }
      }
    })
  }

  /**
   * Private helper methods
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.PREFERENCES_KEY)
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }

  private async saveSubscription(): Promise<void> {
    try {
      if (this.subscription) {
        localStorage.setItem(this.SUBSCRIPTION_KEY, JSON.stringify(this.subscription.toJSON()))
      }
    } catch (error) {
      console.error('Failed to save subscription:', error)
    }
  }

  private async removeSubscription(): Promise<void> {
    try {
      localStorage.removeItem(this.SUBSCRIPTION_KEY)
    } catch (error) {
      console.error('Failed to remove subscription:', error)
    }
  }

  private async syncSubscriptionWithServer(): Promise<void> {
    try {
      if (!this.subscription) return

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON(),
          preferences: this.preferences,
        }),
      })

      if (!response.ok) {
        console.error('Failed to sync subscription with server')
      }
    } catch (error) {
      console.error('Failed to sync subscription with server:', error)
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Failed to remove subscription from server')
      }
    } catch (error) {
      console.error('Failed to remove subscription from server:', error)
    }
  }

  private canShowNotification(): boolean {
    if (!this.preferences.enabled) {
      return false
    }

    // Check quiet hours
    if (this.preferences.quietHours.enabled) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      const start = this.preferences.quietHours.start
      const end = this.preferences.quietHours.end
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (start > end) {
        if (currentTime >= start || currentTime <= end) {
          return false
        }
      } else {
        // Same day quiet hours (e.g., 12:00 to 14:00)
        if (currentTime >= start && currentTime <= end) {
          return false
        }
      }
    }

    return true
  }

  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray.buffer
  }

  private async saveBatchQueue(): Promise<void> {
    try {
      localStorage.setItem(this.BATCH_QUEUE_KEY, JSON.stringify(this.batchQueue))
    } catch (error) {
      console.error('Failed to save batch queue:', error)
    }
  }

  private async loadBatchQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.BATCH_QUEUE_KEY)
      if (stored) {
        this.batchQueue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load batch queue:', error)
    }
  }

  private async saveABTests(): Promise<void> {
    try {
      localStorage.setItem(this.AB_TESTS_KEY, JSON.stringify(this.abTests))
    } catch (error) {
      console.error('Failed to save A/B tests:', error)
    }
  }

  private async loadABTests(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.AB_TESTS_KEY)
      if (stored) {
        this.abTests = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load A/B tests:', error)
    }
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    const nextBatch = this.batchQueue
      .filter(batch => batch.status === 'pending')
      .sort((a, b) => a.scheduledFor - b.scheduledFor)[0]

    if (nextBatch) {
      const delay = Math.max(0, nextBatch.scheduledFor - Date.now())
      this.batchTimer = setTimeout(() => {
        this.processBatch(nextBatch.id)
      }, delay)
    }
  }

  private async processBatch(batchId: string): Promise<void> {
    const batch = this.batchQueue.find(b => b.id === batchId)
    if (!batch || batch.status !== 'pending') return

    try {
      batch.status = 'sent'
      
      // Process notifications in batches
      for (let i = 0; i < batch.notifications.length; i += batch.batchSize) {
        const batchNotifications = batch.notifications.slice(i, i + batch.batchSize)
        
        // Send batch with small delay between notifications
        for (const notification of batchNotifications) {
          await this.showNotification(notification)
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        }
        
        // Delay between batches
        if (i + batch.batchSize < batch.notifications.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2s delay between batches
        }
      }
      
      await this.saveBatchQueue()
      this.scheduleBatchProcessing() // Schedule next batch
    } catch (error) {
      console.error('Failed to process batch:', error)
      batch.status = 'failed'
      await this.saveBatchQueue()
    }
  }

  private selectABTestVariant(test: ABTest, userId?: string): ABTestVariant | null {
    if (!test.variants.length) return null

    // Use user ID for consistent variant selection, or random for anonymous users
    const seed = userId ? this.hashString(userId) : Math.random()
    let cumulativeWeight = 0
    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0)
    const normalizedSeed = seed * totalWeight

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight
      if (normalizedSeed <= cumulativeWeight) {
        return variant
      }
    }

    return test.variants[0] // Fallback to first variant
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647 // Normalize to 0-1
  }

  private trackABTestEvent(testId: string, variantId: string, event: 'sent' | 'delivered' | 'clicked' | 'dismissed'): void {
    const test = this.abTests.find(t => t.id === testId)
    if (test && test.metrics[variantId]) {
      test.metrics[variantId][event]++
      this.saveABTests()
    }
  }

  private trackNotificationEvent(event: string, payload: NotificationPayload): void {
    // Track notification events for analytics
    if (!this.analytics[event]) {
      this.analytics[event] = 0
    }
    this.analytics[event]++
    
    // Save analytics periodically
    localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(this.analytics))
  }

  private calculateOptimalTime(scheduledFor: number): number {
    // Simple intelligent timing: avoid late night/early morning
    const date = new Date(scheduledFor)
    const hour = date.getHours()
    
    if (hour >= 22 || hour <= 7) {
      // Move to 9 AM next day
      date.setHours(9, 0, 0, 0)
      if (date.getTime() <= scheduledFor) {
        date.setDate(date.getDate() + 1)
      }
      return date.getTime()
    }
    
    return scheduledFor
  }

  private async getUserEngagementData(userId?: string): Promise<any> {
    // Mock user engagement data - in real app, this would come from analytics
    return {
      hourlyEngagement: {
        9: 0.8, 10: 0.9, 11: 0.7, 12: 0.6, 13: 0.5, 14: 0.7,
        15: 0.8, 16: 0.9, 17: 0.8, 18: 0.7, 19: 0.6, 20: 0.5,
        21: 0.4, 22: 0.2, 23: 0.1, 0: 0.1, 1: 0.1, 2: 0.1,
        3: 0.1, 4: 0.1, 5: 0.1, 6: 0.2, 7: 0.3, 8: 0.6
      },
      averageResponseTime: 300000, // 5 minutes
      preferredDevices: ['mobile', 'desktop'],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  private findNextOptimalHour(engagement: any, currentHour: number): number {
    const hours = Object.keys(engagement.hourlyEngagement).map(Number)
    const sortedHours = hours
      .filter(hour => hour > currentHour && engagement.hourlyEngagement[hour] > 0.6)
      .sort((a, b) => engagement.hourlyEngagement[b] - engagement.hourlyEngagement[a])
    
    return sortedHours[0] || 9 // Default to 9 AM if no optimal hour found
  }

  private async handleDeepLink(config: DeepLinkConfig): Promise<void> {
    try {
      let url = config.url
      
      // Add tracking parameters
      if (config.trackingParams) {
        const urlObj = new URL(url, window.location.origin)
        Object.entries(config.trackingParams).forEach(([key, value]) => {
          urlObj.searchParams.set(key, value)
        })
        url = urlObj.toString()
      }
      
      // Try to open the URL
      if (window.focus) {
        window.focus()
      }
      
      // For PWA, try to navigate within the app
      if (url.startsWith('/') || url.includes(window.location.origin)) {
        window.location.href = url
      } else {
        // External URL
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Failed to handle deep link:', error)
      
      // Fallback URL
      if (config.fallbackUrl) {
        window.location.href = config.fallbackUrl
      }
    }
  }
}

export const pushNotificationService = new PushNotificationService()

// React hook for push notifications
export function usePushNotifications() {
  const [status, setStatus] = useState(pushNotificationService.getSubscriptionStatus())
  const [preferences, setPreferences] = useState(pushNotificationService.getPreferences())

  useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setStatus(pushNotificationService.getSubscriptionStatus())
      setPreferences(pushNotificationService.getPreferences())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    ...status,
    preferences,
    subscribe: async () => {
      const subscription = await pushNotificationService.subscribe()
      setStatus(pushNotificationService.getSubscriptionStatus())
      return subscription
    },
    unsubscribe: async () => {
      const success = await pushNotificationService.unsubscribe()
      setStatus(pushNotificationService.getSubscriptionStatus())
      return success
    },
    updatePreferences: async (updates: Partial<NotificationPreferences>) => {
      await pushNotificationService.updatePreferences(updates)
      setPreferences(pushNotificationService.getPreferences())
    },
    testNotification: () => pushNotificationService.testNotification(),
    showNotification: (payload: NotificationPayload) => pushNotificationService.showNotification(payload),
  }
}

// Import React hooks
import { useState, useEffect } from 'react'

// Enhanced interfaces for advanced push notification features
export interface RichNotificationPayload extends NotificationPayload {
  image?: string
  vibrate?: number[]
  renotify?: boolean
  sticky?: boolean
  dir?: 'auto' | 'ltr' | 'rtl'
  lang?: string
  badge?: string
  sound?: string
}

export interface NotificationBatch {
  id: string
  notifications: NotificationPayload[]
  scheduledFor: number
  batchSize: number
  priority: 'low' | 'normal' | 'high'
  status: 'pending' | 'sent' | 'failed'
}

export interface ABTestVariant {
  id: string
  name: string
  title: string
  message: string
  icon?: string
  actions?: NotificationAction[]
  weight: number // 0-100, percentage of users who see this variant
}

export interface ABTest {
  id: string
  name: string
  variants: ABTestVariant[]
  isActive: boolean
  startDate: number
  endDate?: number
  targetAudience?: {
    userSegments?: string[]
    deviceTypes?: string[]
    timeZones?: string[]
  }
  metrics: {
    [variantId: string]: {
      sent: number
      delivered: number
      clicked: number
      dismissed: number
      conversionRate: number
    }
  }
}

export interface DeepLinkConfig {
  url: string
  fallbackUrl?: string
  parameters?: Record<string, string>
  trackingParams?: Record<string, string>
}