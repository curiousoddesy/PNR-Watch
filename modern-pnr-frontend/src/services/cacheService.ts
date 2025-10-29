// Cache management service for PWA functionality

export interface CacheConfig {
  name: string
  maxEntries?: number
  maxAgeSeconds?: number
  strategy: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'
}

export interface OfflineAction {
  id: string
  url: string
  method: string
  body?: any
  headers?: Record<string, string>
  timestamp: number
  retryCount: number
}

class CacheService {
  private readonly OFFLINE_QUEUE_KEY = 'offline-actions-queue'
  private readonly CACHE_METADATA_KEY = 'cache-metadata'
  
  // Cache configurations
  private readonly cacheConfigs: Record<string, CacheConfig> = {
    'app-shell': {
      name: 'app-shell-v1',
      maxEntries: 1,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      strategy: 'CacheFirst',
    },
    'api-cache': {
      name: 'api-cache-v1',
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24, // 24 hours
      strategy: 'NetworkFirst',
    },
    'pnr-status': {
      name: 'pnr-status-cache-v1',
      maxEntries: 50,
      maxAgeSeconds: 60 * 30, // 30 minutes
      strategy: 'NetworkFirst',
    },
    'static-assets': {
      name: 'static-assets-v1',
      maxEntries: 60,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      strategy: 'StaleWhileRevalidate',
    },
    'images': {
      name: 'images-cache-v1',
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      strategy: 'CacheFirst',
    },
  }

  /**
   * Initialize cache service
   */
  async initialize(): Promise<void> {
    try {
      await this.cleanupExpiredCaches()
      await this.setupCacheMetadata()
      console.log('Cache service initialized')
    } catch (error) {
      console.error('Failed to initialize cache service:', error)
    }
  }

  /**
   * Get cached data with fallback strategies
   */
  async getCachedData<T>(
    url: string, 
    cacheType: keyof typeof this.cacheConfigs = 'api-cache'
  ): Promise<T | null> {
    try {
      const cache = await caches.open(this.cacheConfigs[cacheType].name)
      const response = await cache.match(url)
      
      if (response) {
        const data = await response.json()
        
        // Check if cache is expired
        if (this.isCacheExpired(response, this.cacheConfigs[cacheType].maxAgeSeconds)) {
          console.log('Cache expired for:', url)
          return null
        }
        
        return data
      }
      
      return null
    } catch (error) {
      console.error('Failed to get cached data:', error)
      return null
    }
  }

  /**
   * Cache data with metadata
   */
  async cacheData(
    url: string, 
    data: any, 
    cacheType: keyof typeof this.cacheConfigs = 'api-cache'
  ): Promise<void> {
    try {
      const cache = await caches.open(this.cacheConfigs[cacheType].name)
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Timestamp': Date.now().toString(),
          'Cache-Type': cacheType,
        },
      })
      
      await cache.put(url, response)
      await this.updateCacheMetadata(cacheType)
    } catch (error) {
      console.error('Failed to cache data:', error)
    }
  }

  /**
   * Queue offline actions for background sync
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue()
      const newAction: OfflineAction = {
        ...action,
        id: this.generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      }
      
      queue.push(newAction)
      await this.saveOfflineQueue(queue)
      
      // Request background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('offline-actions-queue')
      }
      
      console.log('Offline action queued:', newAction.id)
    } catch (error) {
      console.error('Failed to queue offline action:', error)
    }
  }

  /**
   * Process offline queue
   */
  async processOfflineQueue(): Promise<{ success: number; failed: number }> {
    const queue = await this.getOfflineQueue()
    let success = 0
    let failed = 0
    const remainingActions: OfflineAction[] = []

    for (const action of queue) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          body: action.body ? JSON.stringify(action.body) : undefined,
          headers: {
            'Content-Type': 'application/json',
            ...action.headers,
          },
        })

        if (response.ok) {
          success++
          console.log('Offline action processed successfully:', action.id)
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        console.error('Failed to process offline action:', action.id, error)
        
        // Retry logic
        if (action.retryCount < 3) {
          remainingActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          })
        } else {
          failed++
          console.error('Max retries reached for action:', action.id)
        }
      }
    }

    await this.saveOfflineQueue(remainingActions)
    return { success, failed }
  }

  /**
   * Get offline queue
   */
  private async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const stored = localStorage.getItem(this.OFFLINE_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get offline queue:', error)
      return []
    }
  }

  /**
   * Save offline queue
   */
  private async saveOfflineQueue(queue: OfflineAction[]): Promise<void> {
    try {
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(response: Response, maxAgeSeconds?: number): boolean {
    if (!maxAgeSeconds) return false
    
    const cacheTimestamp = response.headers.get('Cache-Timestamp')
    if (!cacheTimestamp) return false
    
    const age = (Date.now() - parseInt(cacheTimestamp)) / 1000
    return age > maxAgeSeconds
  }

  /**
   * Clean up expired caches
   */
  private async cleanupExpiredCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys()
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        
        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            const cacheType = response.headers.get('Cache-Type') as keyof typeof this.cacheConfigs
            const config = this.cacheConfigs[cacheType]
            
            if (config && this.isCacheExpired(response, config.maxAgeSeconds)) {
              await cache.delete(request)
              console.log('Expired cache entry removed:', request.url)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired caches:', error)
    }
  }

  /**
   * Setup cache metadata
   */
  private async setupCacheMetadata(): Promise<void> {
    try {
      const metadata = {
        version: '1.0.0',
        lastCleanup: Date.now(),
        cacheConfigs: this.cacheConfigs,
      }
      
      localStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to setup cache metadata:', error)
    }
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMetadata(cacheType: string): Promise<void> {
    try {
      const stored = localStorage.getItem(this.CACHE_METADATA_KEY)
      const metadata = stored ? JSON.parse(stored) : {}
      
      metadata.lastUpdated = Date.now()
      metadata[`${cacheType}LastUpdate`] = Date.now()
      
      localStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to update cache metadata:', error)
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}
    
    try {
      for (const [key, config] of Object.entries(this.cacheConfigs)) {
        const cache = await caches.open(config.name)
        const requests = await cache.keys()
        
        stats[key] = {
          name: config.name,
          entries: requests.length,
          maxEntries: config.maxEntries,
          strategy: config.strategy,
        }
      }
      
      const offlineQueue = await this.getOfflineQueue()
      stats.offlineQueue = {
        pending: offlineQueue.length,
        actions: offlineQueue.map(action => ({
          id: action.id,
          method: action.method,
          url: action.url,
          retryCount: action.retryCount,
          timestamp: action.timestamp,
        })),
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
    }
    
    return stats
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      localStorage.removeItem(this.OFFLINE_QUEUE_KEY)
      localStorage.removeItem(this.CACHE_METADATA_KEY)
      console.log('All caches cleared')
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }
}

export const cacheService = new CacheService()