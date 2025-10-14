/**
 * Service Worker for PNR Status Application
 * Provides advanced caching, offline functionality, and performance optimization
 */

const CACHE_NAME = 'pnr-status-v2';
const STATIC_CACHE = 'pnr-static-v2';
const DYNAMIC_CACHE = 'pnr-dynamic-v2';
const API_CACHE = 'pnr-api-v2';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/navigation.js',
    '/navigation-manager.js',
    '/error-handler.js',
    '/offline-manager.js',
    '/form-validator.js',
    '/build-config.js',
    '/pnr_input/code.html',
    '/ticket_status_display_1/code.html',
    '/ticket_status_display_2/code.html',
    '/ticket_status_display_3/code.html',
    '/ticket_status_display_4/code.html',
    '/pnr_history_1/code.html',
    '/pnr_history_2/code.html',
    '/pnr_history_3/code.html',
    '/pnr_history_4/code.html'
];

// Network-first resources (API calls, dynamic content)
const NETWORK_FIRST = [
    '/api/',
    '/status/',
    '/search/'
];

// Cache-first resources (fonts, images, static assets)
const CACHE_FIRST = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    '.woff2',
    '.woff',
    '.ttf',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.webp'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Fetch event - implement advanced caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Determine caching strategy based on request
    if (isStaticAsset(request.url)) {
        event.respondWith(cacheFirstStrategy(request));
    } else if (isNetworkFirst(request.url)) {
        event.respondWith(networkFirstStrategy(request));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(staleWhileRevalidateStrategy(request));
    } else {
        event.respondWith(cacheFirstStrategy(request));
    }
});

/**
 * Cache-first strategy: Check cache first, fallback to network
 * Best for static assets that don't change often
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache-first strategy failed:', error);
        
        // Return offline fallback if available
        if (request.destination === 'document') {
            return caches.match('/index.html') || new Response('Offline', { status: 503 });
        }
        
        return new Response('Network error', { status: 503 });
    }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 * Best for dynamic content that should be fresh
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        if (request.destination === 'document') {
            return caches.match('/index.html') || new Response('Offline', { status: 503 });
        }
        
        return new Response('Network error', { status: 503 });
    }
}

/**
 * Stale-while-revalidate strategy: Return cache immediately, update in background
 * Best for API responses that can be stale but should be updated
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkResponsePromise = fetch(request).then((response) => {
        if (response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch((error) => {
        console.log('Background fetch failed:', error);
    });
    
    // Return cached response immediately if available
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Otherwise wait for network response
    return networkResponsePromise;
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
    return CACHE_FIRST.some(pattern => url.includes(pattern));
}

/**
 * Check if request should use network-first strategy
 */
function isNetworkFirst(url) {
    return NETWORK_FIRST.some(pattern => url.includes(pattern));
}

/**
 * Check if request is an API call
 */
function isAPIRequest(url) {
    return url.includes('/api/') || url.includes('/status/') || url.includes('/search/');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'pnr-sync') {
        event.waitUntil(syncPNRData());
    }
});

/**
 * Sync PNR data when back online
 */
async function syncPNRData() {
    try {
        // Notify main thread to process offline queue
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'PROCESS_OFFLINE_QUEUE'
            });
        });
        
        console.log('PNR data sync completed');
    } catch (error) {
        console.error('PNR sync failed:', error);
    }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        getCacheSize().then(size => {
            event.ports[0].postMessage({ cacheSize: size });
        });
    }
});

/**
 * Calculate total cache size
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(cleanupOldCaches());
    }
});

/**
 * Clean up old cache entries
 */
async function cleanupOldCaches() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (now - responseDate > maxAge) {
                        await cache.delete(request);
                        console.log('Deleted old cache entry:', request.url);
                    }
                }
            }
        }
    }
}