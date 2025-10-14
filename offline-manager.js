/**
 * Offline Manager
 * Handles offline functionality and graceful degradation
 */

class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.cachedData = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }

    init() {
        // Monitor network status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processOfflineQueue();
            this.showOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineStatus();
        });

        // Initialize service worker for caching (if supported)
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
    }

    /**
     * Register service worker for offline caching
     */
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }

    /**
     * Cache data with expiry
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    cacheData(key, data) {
        this.cachedData.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Also store in localStorage for persistence
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to cache data in localStorage:', error);
        }
    }

    /**
     * Get cached data if not expired
     * @param {string} key - Cache key
     * @returns {any|null} - Cached data or null if expired/not found
     */
    getCachedData(key) {
        // Check memory cache first
        let cached = this.cachedData.get(key);
        
        // Fallback to localStorage
        if (!cached) {
            try {
                const stored = localStorage.getItem(`cache_${key}`);
                if (stored) {
                    cached = JSON.parse(stored);
                    this.cachedData.set(key, cached);
                }
            } catch (error) {
                console.warn('Failed to retrieve cached data:', error);
            }
        }

        if (!cached) return null;

        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cachedData.delete(key);
            localStorage.removeItem(`cache_${key}`);
            return null;
        }

        return cached.data;
    }

    /**
     * Add operation to offline queue
     * @param {Object} operation - Operation to queue
     */
    queueOperation(operation) {
        this.offlineQueue.push({
            ...operation,
            timestamp: Date.now()
        });
        
        // Persist queue to localStorage
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.warn('Failed to persist offline queue:', error);
        }
    }

    /**
     * Process queued operations when back online
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;

        window.ErrorHandler.showToast('Processing queued operations...', 'info');

        const processedOperations = [];
        
        for (const operation of this.offlineQueue) {
            try {
                await this.executeQueuedOperation(operation);
                processedOperations.push(operation);
            } catch (error) {
                console.error('Failed to process queued operation:', error);
                // Keep failed operations in queue for retry
            }
        }

        // Remove successfully processed operations
        this.offlineQueue = this.offlineQueue.filter(
            op => !processedOperations.includes(op)
        );

        // Update localStorage
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.warn('Failed to update offline queue:', error);
        }

        if (processedOperations.length > 0) {
            window.ErrorHandler.showToast(
                `${processedOperations.length} queued operations completed`,
                'success'
            );
        }
    }

    /**
     * Execute a queued operation
     * @param {Object} operation - Operation to execute
     */
    async executeQueuedOperation(operation) {
        switch (operation.type) {
            case 'savePNR':
                window.PNRApp.data.savePNR(operation.data.pnr);
                break;
            case 'updateNotifications':
                window.PNRApp.data.updateNotificationSettings(
                    operation.data.pnr,
                    operation.data.settings
                );
                break;
            case 'addToRecentSearches':
                window.PNRApp.data.addToRecentSearches(operation.data.pnr);
                break;
            default:
                console.warn('Unknown operation type:', operation.type);
        }
    }

    /**
     * Load offline queue from localStorage
     */
    loadOfflineQueue() {
        try {
            const stored = localStorage.getItem('offlineQueue');
            if (stored) {
                this.offlineQueue = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load offline queue:', error);
            this.offlineQueue = [];
        }
    }

    /**
     * Show offline status indicator
     */
    showOfflineStatus() {
        const existingIndicator = document.getElementById('offline-indicator');
        if (existingIndicator) return;

        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'fixed top-0 left-0 right-0 bg-orange-600 text-white px-4 py-2 text-center text-sm z-50';
        indicator.innerHTML = `
            <div class="flex items-center justify-center">
                <span class="material-symbols-outlined text-sm mr-2">wifi_off</span>
                You're offline. Changes will be saved when connection is restored.
            </div>
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Show online status indicator
     */
    showOnlineStatus() {
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.remove();
        }

        // Show temporary online indicator
        const indicator = document.createElement('div');
        indicator.className = 'fixed top-0 left-0 right-0 bg-green-600 text-white px-4 py-2 text-center text-sm z-50 transform -translate-y-full transition-transform duration-300';
        indicator.innerHTML = `
            <div class="flex items-center justify-center">
                <span class="material-symbols-outlined text-sm mr-2">wifi</span>
                Connection restored
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Animate in
        setTimeout(() => {
            indicator.classList.remove('-translate-y-full');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            indicator.classList.add('-translate-y-full');
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get offline-capable PNR data
     * @param {string} pnr - PNR number
     * @returns {Object|null} - PNR data from cache or sample data
     */
    getOfflinePNRData(pnr) {
        // Try to get from cache first
        const cached = this.getCachedData(`pnr_${pnr}`);
        if (cached) {
            return cached;
        }

        // Fallback to sample data if available
        const sampleData = window.PNRApp.data.getPNRData(pnr);
        if (sampleData) {
            // Cache the sample data
            this.cacheData(`pnr_${pnr}`, sampleData);
            return sampleData;
        }

        return null;
    }

    /**
     * Handle offline PNR operations
     * @param {string} operation - Operation type
     * @param {Object} data - Operation data
     */
    handleOfflineOperation(operation, data) {
        switch (operation) {
            case 'savePNR':
                // Save locally and queue for sync
                window.PNRApp.data.savePNR(data.pnr);
                this.queueOperation({ type: 'savePNR', data });
                window.ErrorHandler.showToast('PNR saved offline. Will sync when online.', 'info');
                break;
                
            case 'updateNotifications':
                // Update locally and queue for sync
                window.PNRApp.data.updateNotificationSettings(data.pnr, data.settings);
                this.queueOperation({ type: 'updateNotifications', data });
                window.ErrorHandler.showToast('Settings saved offline. Will sync when online.', 'info');
                break;
                
            case 'addToRecentSearches':
                // This can be done offline without queuing
                window.PNRApp.data.addToRecentSearches(data.pnr);
                break;
                
            default:
                window.ErrorHandler.showError('This action requires an internet connection.');
        }
    }

    /**
     * Check if operation can be performed offline
     * @param {string} operation - Operation type
     * @returns {boolean} - Whether operation can be performed offline
     */
    canPerformOffline(operation) {
        const offlineOperations = [
            'savePNR',
            'updateNotifications',
            'addToRecentSearches',
            'viewSavedPNRs',
            'viewRecentSearches'
        ];
        
        return offlineOperations.includes(operation);
    }

    /**
     * Show offline capabilities message
     * @param {HTMLElement} target - Target element
     */
    showOfflineCapabilities(target) {
        const message = `
            <div class="text-center py-8 px-4">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full mb-4">
                    <span class="material-symbols-outlined text-orange-600 dark:text-orange-400">wifi_off</span>
                </div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">You're offline</h3>
                <p class="text-slate-600 dark:text-slate-400 mb-4">
                    You can still view saved PNRs and recent searches. 
                    New changes will be saved when your connection is restored.
                </p>
                <div class="text-sm text-slate-500 dark:text-slate-400">
                    <p class="mb-2">Available offline:</p>
                    <ul class="text-left inline-block">
                        <li>• View saved PNRs</li>
                        <li>• View recent searches</li>
                        <li>• Save PNRs (synced later)</li>
                        <li>• Update notification settings</li>
                    </ul>
                </div>
            </div>
        `;
        
        if (target) {
            target.innerHTML = message;
        }
    }

    /**
     * Get current offline state
     * @returns {Object} - Current offline state
     */
    getOfflineState() {
        return {
            isOnline: this.isOnline,
            queuedOperations: this.offlineQueue.length,
            cachedItems: this.cachedData.size
        };
    }
}

// Create global instance
window.OfflineManager = new OfflineManager();

// Load offline queue on initialization
window.OfflineManager.loadOfflineQueue();

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineManager;
}