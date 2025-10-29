import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { BackgroundSync } from 'workbox-background-sync'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

// Cache version for manual cache busting
const CACHE_VERSION = 'v1.0.0'
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`
const API_CACHE = `api-cache-${CACHE_VERSION}`
const OFFLINE_QUEUE_NAME = 'offline-actions'

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST)

// Clean up outdated caches
cleanupOutdatedCaches()

// Background sync for offline actions
const bgSync = new BackgroundSync(OFFLINE_QUEUE_NAME, {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
})

// App Shell - Cache First Strategy
registerRoute(
  ({ request, url }) => 
    request.mode === 'navigate' && 
    url.pathname === '/',
  new CacheFirst({
    cacheName: APP_SHELL_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Navigation fallback for SPA
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigation-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  {
    allowlist: [/^(?!\/__).*/], // Exclude dev server routes
  }
)
registerRoute(navigationRoute)

// API Routes - Network First with Background Sync
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      {
        requestWillFetch: async ({ request }) => {
          // Add timestamp to prevent stale data
          const url = new URL(request.url)
          url.searchParams.set('_t', Date.now().toString())
          return new Request(url.toString(), request)
        },
        fetchDidFail: async ({ originalRequest }) => {
          // Queue failed requests for background sync
          if (originalRequest.method === 'POST' || originalRequest.method === 'PUT') {
            await bgSync.replayRequests()
          }
        },
      },
    ],
  })
)

// PNR Status API - Network First with shorter cache
registerRoute(
  ({ url }) => url.pathname.includes('/api/pnr/'),
  new NetworkFirst({
    cacheName: 'pnr-status-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 30, // 30 minutes
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Static Assets - Stale While Revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Images - Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Google Fonts - Cache First
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
)

// Handle background sync for offline actions
self.addEventListener('sync', (event: any) => {
  console.log('Background sync event:', event.tag)
  
  if (event.tag === OFFLINE_QUEUE_NAME) {
    event.waitUntil(handleOfflineSync())
  } else if (event.tag === 'pnr-status-sync') {
    event.waitUntil(syncPNRStatus())
  }
})

async function handleOfflineSync() {
  try {
    console.log('Processing offline actions queue')
    await bgSync.replayRequests()
    
    // Notify clients about successful sync
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_COMPLETE',
        timestamp: Date.now(),
      })
    })
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

async function syncPNRStatus() {
  try {
    // Get all cached PNR requests and refresh them
    const cache = await caches.open('pnr-status-cache')
    const requests = await cache.keys()
    
    for (const request of requests) {
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.put(request, response.clone())
        }
      } catch (error) {
        console.warn('Failed to sync PNR status:', request.url)
      }
    }
    
    console.log('PNR status sync completed')
  } catch (error) {
    console.error('PNR status sync failed:', error)
  }
}

// Enhanced push notification handling
self.addEventListener('push', (event: any) => {
  console.log('Push notification received:', event)
  
  if (event.data) {
    const data = event.data.json()
    
    // Enhanced notification options with rich features
    const options = {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-64x64.png',
      image: data.image, // Rich notification image
      tag: data.tag || 'pnr-notification',
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      timestamp: Date.now(),
      vibrate: data.vibrate || [200, 100, 200],
      renotify: data.renotify || false,
      sticky: data.sticky || false,
      dir: data.dir || 'auto',
      lang: data.lang || 'en',
      data: {
        ...data.data,
        abTestId: data.abTestId,
        variantId: data.variantId,
        trackingParams: data.trackingParams,
        url: data.url,
        originalTimestamp: data.timestamp
      },
      actions: data.actions || [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png',
        },
      ],
    }
    
    // Track notification delivery
    trackNotificationEvent('delivered', data)
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Enhanced notification click handling with deep linking and analytics
self.addEventListener('notificationclick', (event: any) => {
  console.log('Notification clicked:', event)
  event.notification.close()
  
  const action = event.action
  const data = event.notification.data
  
  // Track click event
  trackNotificationEvent('clicked', data, action)
  
  if (action === 'view' || !action) {
    let urlToOpen = data?.url || '/'
    
    // Add tracking parameters to URL
    if (data.trackingParams) {
      const url = new URL(urlToOpen, self.location.origin)
      Object.entries(data.trackingParams).forEach(([key, value]: [string, any]) => {
        url.searchParams.set(key, value)
      })
      urlToOpen = url.toString()
    }
    
    event.waitUntil(
      handleNotificationNavigation(urlToOpen, data)
    )
  } else if (action === 'dismiss') {
    trackNotificationEvent('dismissed', data)
    console.log('Notification dismissed')
  } else if (action === 'snooze') {
    handleSnoozeAction(data)
  } else if (action === 'archive') {
    handleArchiveAction(data)
  } else {
    // Handle custom actions
    const customUrl = data.actionUrls?.[action] || data.url || '/'
    event.waitUntil(
      handleNotificationNavigation(customUrl, data)
    )
  }
})

// Handle service worker updates
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Cache versioning and cleanup
self.addEventListener('activate', (event: any) => {
  console.log('Service worker activated')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('v') && !cacheName.includes(CACHE_VERSION)) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  )
})

// Handle fetch events for offline functionality
self.addEventListener('fetch', (event: any) => {
  // Skip non-GET requests for background sync
  if (event.request.method !== 'GET') {
    // Queue POST/PUT/DELETE requests for background sync when offline
    if (!navigator.onLine) {
      event.respondWith(
        new Response(JSON.stringify({ queued: true }), {
          status: 202,
          statusText: 'Queued for background sync',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      
      // Add to background sync queue
      bgSync.replayRequests()
    }
  }
})

// Helper functions for enhanced push notifications

// Handle notification navigation with focus management
async function handleNotificationNavigation(url: string, data: any) {
  try {
    const clientList = await self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    })
    
    // Try to focus existing window with same origin
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        await client.focus()
        
        // Send message to client to handle navigation
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          url: url,
          notification: data,
          action: 'navigate'
        })
        
        return client
      }
    }
    
    // Open new window if no existing window found
    if (self.clients.openWindow) {
      return await self.clients.openWindow(url)
    }
  } catch (error) {
    console.error('Failed to handle notification navigation:', error)
  }
}

// Track notification events for analytics
function trackNotificationEvent(event: string, data: any, action?: string) {
  try {
    // Send analytics to main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_ANALYTICS',
          event: event,
          data: data,
          action: action,
          timestamp: Date.now()
        })
      })
    })
    
    // Track A/B test metrics if applicable
    if (data.abTestId && data.variantId) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'AB_TEST_EVENT',
            testId: data.abTestId,
            variantId: data.variantId,
            event: event,
            timestamp: Date.now()
          })
        })
      })
    }
  } catch (error) {
    console.error('Failed to track notification event:', error)
  }
}

// Handle snooze action
function handleSnoozeAction(data: any) {
  const snoozeTime = data.snoozeTime || 15 * 60 * 1000 // 15 minutes default
  
  setTimeout(() => {
    // Re-show notification after snooze period
    self.registration.showNotification(data.title || 'Reminder', {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-64x64.png',
      data: {
        ...data,
        snoozed: true,
        originalTimestamp: data.originalTimestamp
      },
      tag: `${data.tag || 'notification'}_snoozed`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'snooze', title: 'Snooze Again' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  }, snoozeTime)
  
  trackNotificationEvent('snoozed', data)
}

// Handle archive action
function handleArchiveAction(data: any) {
  // Send message to main thread to archive notification
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ARCHIVE_NOTIFICATION',
        notificationId: data.notificationId,
        timestamp: Date.now()
      })
    })
  })
  
  trackNotificationEvent('archived', data)
}

// Handle notification close event
self.addEventListener('notificationclose', (event: any) => {
  const data = event.notification.data
  trackNotificationEvent('dismissed', data)
})

// Periodic cleanup of old notifications
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'notification-cleanup') {
    event.waitUntil(cleanupOldNotifications())
  }
})

async function cleanupOldNotifications() {
  try {
    const notifications = await self.registration.getNotifications()
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    
    notifications.forEach(notification => {
      const timestamp = notification.data?.originalTimestamp || notification.timestamp || 0
      if (now - timestamp > maxAge) {
        notification.close()
      }
    })
    
    console.log('Old notifications cleaned up')
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error)
  }
}

console.log('Service worker loaded with enhanced caching strategies and push notifications')