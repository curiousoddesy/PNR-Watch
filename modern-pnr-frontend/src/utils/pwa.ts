// PWA installation and service worker utilities
import { cacheService } from '../services/cacheService'
import { backgroundSyncService } from '../services/backgroundSyncService'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export interface PWAUpdateInfo {
  available: boolean
  version?: string
  size?: number
}

export interface PWAInstallInfo {
  canInstall: boolean
  isInstalled: boolean
  platform?: string
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private isInstalled = false
  private updateAvailable = false
  private registration: ServiceWorkerRegistration | null = null
  private updateCallbacks: Set<(info: PWAUpdateInfo) => void> = new Set()

  constructor() {
    this.init()
  }

  private async init() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e as BeforeInstallPromptEvent
      console.log('PWA install prompt available')
    })

    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true
      this.deferredPrompt = null
      console.log('PWA installed successfully')
    })

    // Register service worker and initialize services
    await this.registerServiceWorker()
    await this.initializeServices()
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        
        console.log('Service Worker registered:', this.registration)
        
        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration!.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true
                this.notifyUpdate({
                  available: true,
                  version: '1.0.0', // You can get this from your build process
                })
              }
            })
          }
        })

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'CACHE_UPDATED') {
            console.log('Cache updated:', event.data.cacheName)
          } else if (event.data?.type === 'OFFLINE_SYNC_COMPLETE') {
            console.log('Offline sync completed')
          }
        })

        // Check for existing update
        if (this.registration.waiting) {
          this.updateAvailable = true
          this.notifyUpdate({ available: true })
        }

      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  private async initializeServices() {
    try {
      await cacheService.initialize()
      await backgroundSyncService.initialize()
      console.log('PWA services initialized')
    } catch (error) {
      console.error('Failed to initialize PWA services:', error)
    }
  }

  private notifyUpdate(info: PWAUpdateInfo) {
    // Dispatch custom event for app update
    window.dispatchEvent(new CustomEvent('app-update-available', { detail: info }))
    
    // Notify registered callbacks
    this.updateCallbacks.forEach(callback => callback(info))
  }

  public async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false
    }

    try {
      await this.deferredPrompt.prompt()
      const { outcome } = await this.deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        this.isInstalled = true
        console.log('PWA installation accepted')
      } else {
        console.log('PWA installation dismissed')
      }
      
      this.deferredPrompt = null
      return outcome === 'accepted'
    } catch (error) {
      console.error('Installation failed:', error)
      return false
    }
  }

  public async updateApp(): Promise<boolean> {
    if (!this.registration || !this.registration.waiting) {
      return false
    }

    try {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
          resolve()
        }
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      })

      this.updateAvailable = false
      console.log('App updated successfully')
      return true
    } catch (error) {
      console.error('App update failed:', error)
      return false
    }
  }

  public getInstallInfo(): PWAInstallInfo {
    return {
      canInstall: !!this.deferredPrompt && !this.isInstalled,
      isInstalled: this.isInstalled || window.matchMedia('(display-mode: standalone)').matches,
      platform: this.deferredPrompt?.platforms?.[0],
    }
  }

  public getUpdateInfo(): PWAUpdateInfo {
    return {
      available: this.updateAvailable,
    }
  }

  public onUpdateAvailable(callback: (info: PWAUpdateInfo) => void) {
    this.updateCallbacks.add(callback)
    
    // Return cleanup function
    return () => {
      this.updateCallbacks.delete(callback)
    }
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      console.log('Notification permission:', permission)
      return permission
    }

    return Notification.permission
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('Already subscribed to push notifications')
        return existingSubscription
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      })

      console.log('Subscribed to push notifications')
      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }

  public async unsubscribeFromPushNotifications(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        const success = await subscription.unsubscribe()
        console.log('Unsubscribed from push notifications:', success)
        return success
      }
      
      return true
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      return false
    }
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

  public async getCacheStats() {
    return await cacheService.getCacheStats()
  }

  public async clearAllCaches() {
    await cacheService.clearAllCaches()
  }

  public async getSyncQueueStatus() {
    return await backgroundSyncService.getQueueStatus()
  }

  public async retryFailedSyncs() {
    await backgroundSyncService.retryFailedTasks()
  }

  public async addOfflineAction(type: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    return await backgroundSyncService.addTask(type as any, data, priority)
  }
}

export const pwaManager = new PWAManager()

// React hook for PWA functionality
export function usePWA() {
  const [installInfo, setInstallInfo] = useState<PWAInstallInfo>({ canInstall: false, isInstalled: false })
  const [updateInfo, setUpdateInfo] = useState<PWAUpdateInfo>({ available: false })

  useEffect(() => {
    // Initial state
    setInstallInfo(pwaManager.getInstallInfo())
    setUpdateInfo(pwaManager.getUpdateInfo())

    // Listen for updates
    const cleanup = pwaManager.onUpdateAvailable(setUpdateInfo)

    // Listen for install prompt changes
    const handleBeforeInstallPrompt = () => {
      setInstallInfo(pwaManager.getInstallInfo())
    }

    const handleAppInstalled = () => {
      setInstallInfo(pwaManager.getInstallInfo())
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      cleanup()
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return {
    ...installInfo,
    ...updateInfo,
    install: async () => {
      const success = await pwaManager.installApp()
      if (success) {
        setInstallInfo(pwaManager.getInstallInfo())
      }
      return success
    },
    update: async () => {
      const success = await pwaManager.updateApp()
      if (success) {
        setUpdateInfo(pwaManager.getUpdateInfo())
      }
      return success
    },
    requestNotifications: () => pwaManager.requestNotificationPermission(),
    subscribeToPush: () => pwaManager.subscribeToPushNotifications(),
    unsubscribeFromPush: () => pwaManager.unsubscribeFromPushNotifications(),
    getCacheStats: () => pwaManager.getCacheStats(),
    clearCaches: () => pwaManager.clearAllCaches(),
    getSyncStatus: () => pwaManager.getSyncQueueStatus(),
    retrySync: () => pwaManager.retryFailedSyncs(),
    addOfflineAction: (type: string, data: any, priority?: 'high' | 'medium' | 'low') => 
      pwaManager.addOfflineAction(type, data, priority),
  }
}

// Import React hooks
import { useState, useEffect } from 'react'