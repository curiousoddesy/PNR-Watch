/**
 * Performance Dashboard
 * Provides real-time performance monitoring and optimization insights
 */

class PerformanceDashboard {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            interactionTime: 0,
            bundleSize: 0,
            cacheHitRate: 0,
            memoryUsage: 0
        };
        
        this.thresholds = {
            loadTime: 3000, // 3 seconds
            renderTime: 2500, // 2.5 seconds
            interactionTime: 100, // 100ms
            bundleSize: 500 * 1024, // 500KB
            cacheHitRate: 80, // 80%
            memoryUsage: 50 * 1024 * 1024 // 50MB
        };
        
        this.history = [];
        this.isVisible = false;
        
        this.init();
    }

    init() {
        // Create dashboard UI
        this.createDashboardUI();
        
        // Start monitoring
        this.startMonitoring();
        
        // Set up keyboard shortcut to toggle dashboard
        this.setupKeyboardShortcut();
        
        // Update dashboard periodically
        setInterval(() => {
            if (this.isVisible) {
                this.updateDashboard();
            }
        }, 1000);
    }

    /**
     * Create the dashboard UI
     */
    createDashboardUI() {
        const dashboard = document.createElement('div');
        dashboard.id = 'performance-dashboard';
        dashboard.className = 'fixed top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 hidden';
        
        dashboard.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Performance Dashboard</h3>
                    <button id="close-dashboard" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
                
                <div class="space-y-3">
                    <!-- Load Time -->
                    <div class="metric-item">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Load Time</span>
                            <span id="load-time-value" class="text-sm font-mono">--</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div id="load-time-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Render Time -->
                    <div class="metric-item">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Render Time (LCP)</span>
                            <span id="render-time-value" class="text-sm font-mono">--</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div id="render-time-bar" class="bg-green-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Interaction Time -->
                    <div class="metric-item">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Interaction Time (FID)</span>
                            <span id="interaction-time-value" class="text-sm font-mono">--</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div id="interaction-time-bar" class="bg-yellow-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Bundle Size -->
                    <div class="metric-item">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Bundle Size</span>
                            <span id="bundle-size-value" class="text-sm font-mono">--</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div id="bundle-size-bar" class="bg-purple-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Memory Usage -->
                    <div class="metric-item">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Memory Usage</span>
                            <span id="memory-usage-value" class="text-sm font-mono">--</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div id="memory-usage-bar" class="bg-red-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Cache Hit Rate -->
                    <div class="metric-item">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Cache Hit Rate</span>
                            <span id="cache-hit-rate-value" class="text-sm font-mono">--</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div id="cache-hit-rate-bar" class="bg-indigo-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Recommendations -->
                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h4>
                    <div id="recommendations-list" class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <div class="text-center py-2">Analyzing performance...</div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex space-x-2">
                        <button id="clear-cache-btn" class="flex-1 px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                            Clear Cache
                        </button>
                        <button id="optimize-css-btn" class="flex-1 px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                            Optimize CSS
                        </button>
                        <button id="export-report-btn" class="flex-1 px-3 py-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                            Export Report
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboard);
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for dashboard interactions
     */
    setupEventListeners() {
        // Close button
        document.getElementById('close-dashboard').addEventListener('click', () => {
            this.hideDashboard();
        });
        
        // Clear cache button
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.clearCache();
        });
        
        // Optimize CSS button
        document.getElementById('optimize-css-btn').addEventListener('click', () => {
            this.optimizeCSS();
        });
        
        // Export report button
        document.getElementById('export-report-btn').addEventListener('click', () => {
            this.exportReport();
        });
    }

    /**
     * Set up keyboard shortcut to toggle dashboard
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+P to toggle dashboard
            if (event.ctrlKey && event.shiftKey && event.key === 'P') {
                event.preventDefault();
                this.toggleDashboard();
            }
        });
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        // Monitor page load performance
        if (performance.getEntriesByType) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
            }
        }

        // Monitor memory usage
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        }

        // Monitor bundle size from BuildOptimizer
        if (window.BuildOptimizer) {
            const builderMetrics = window.BuildOptimizer.getMetrics();
            this.metrics.bundleSize = builderMetrics.bundleSize || 0;
            this.metrics.renderTime = builderMetrics.renderTime || 0;
            this.metrics.interactionTime = builderMetrics.interactionTime || 0;
        }

        // Monitor cache performance
        this.monitorCachePerformance();
    }

    /**
     * Monitor cache performance
     */
    async monitorCachePerformance() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                // Get cache size from service worker
                const messageChannel = new MessageChannel();
                navigator.serviceWorker.controller.postMessage(
                    { type: 'GET_CACHE_SIZE' },
                    [messageChannel.port2]
                );
                
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.cacheSize) {
                        this.metrics.cacheSize = event.data.cacheSize;
                    }
                };
            } catch (error) {
                console.warn('Failed to get cache metrics:', error);
            }
        }

        // Calculate cache hit rate from performance entries
        const resources = performance.getEntriesByType('resource');
        let cacheHits = 0;
        let totalRequests = resources.length;

        resources.forEach(resource => {
            // Heuristic: very fast responses are likely from cache
            if (resource.duration < 50) {
                cacheHits++;
            }
        });

        this.metrics.cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    }

    /**
     * Update dashboard with current metrics
     */
    updateDashboard() {
        // Update load time
        this.updateMetric('load-time', this.metrics.loadTime, this.thresholds.loadTime, 'ms');
        
        // Update render time
        this.updateMetric('render-time', this.metrics.renderTime, this.thresholds.renderTime, 'ms');
        
        // Update interaction time
        this.updateMetric('interaction-time', this.metrics.interactionTime, this.thresholds.interactionTime, 'ms');
        
        // Update bundle size
        this.updateMetric('bundle-size', this.metrics.bundleSize, this.thresholds.bundleSize, 'bytes');
        
        // Update memory usage
        this.updateMetric('memory-usage', this.metrics.memoryUsage, this.thresholds.memoryUsage, 'bytes');
        
        // Update cache hit rate
        this.updateMetric('cache-hit-rate', this.metrics.cacheHitRate, this.thresholds.cacheHitRate, '%');
        
        // Update recommendations
        this.updateRecommendations();
        
        // Store metrics in history
        this.storeMetrics();
    }

    /**
     * Update a specific metric in the dashboard
     * @param {string} metricName - Name of the metric
     * @param {number} value - Current value
     * @param {number} threshold - Threshold value
     * @param {string} unit - Unit of measurement
     */
    updateMetric(metricName, value, threshold, unit) {
        const valueElement = document.getElementById(`${metricName}-value`);
        const barElement = document.getElementById(`${metricName}-bar`);
        
        if (!valueElement || !barElement) return;
        
        // Format value based on unit
        let displayValue;
        if (unit === 'ms') {
            displayValue = value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
        } else if (unit === 'bytes') {
            displayValue = this.formatBytes(value);
        } else if (unit === '%') {
            displayValue = `${Math.round(value)}%`;
        } else {
            displayValue = Math.round(value).toString();
        }
        
        valueElement.textContent = displayValue;
        
        // Calculate percentage for progress bar
        let percentage;
        if (unit === '%') {
            percentage = value;
        } else {
            percentage = Math.min((value / threshold) * 100, 100);
        }
        
        barElement.style.width = `${percentage}%`;
        
        // Update color based on performance
        const isGood = value <= threshold * 0.7;
        const isOk = value <= threshold;
        
        if (isGood) {
            barElement.className = barElement.className.replace(/bg-\w+-500/, 'bg-green-500');
        } else if (isOk) {
            barElement.className = barElement.className.replace(/bg-\w+-500/, 'bg-yellow-500');
        } else {
            barElement.className = barElement.className.replace(/bg-\w+-500/, 'bg-red-500');
        }
    }

    /**
     * Update recommendations based on current metrics
     */
    updateRecommendations() {
        const recommendationsList = document.getElementById('recommendations-list');
        if (!recommendationsList) return;
        
        const recommendations = [];
        
        // Check each metric against thresholds
        if (this.metrics.loadTime > this.thresholds.loadTime) {
            recommendations.push('• Optimize critical resources to improve load time');
        }
        
        if (this.metrics.renderTime > this.thresholds.renderTime) {
            recommendations.push('• Optimize above-the-fold content for faster rendering');
        }
        
        if (this.metrics.interactionTime > this.thresholds.interactionTime) {
            recommendations.push('• Reduce JavaScript execution time for better interactivity');
        }
        
        if (this.metrics.bundleSize > this.thresholds.bundleSize) {
            recommendations.push('• Implement code splitting to reduce bundle size');
        }
        
        if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
            recommendations.push('• Optimize memory usage to prevent performance issues');
        }
        
        if (this.metrics.cacheHitRate < this.thresholds.cacheHitRate) {
            recommendations.push('• Improve caching strategy for better performance');
        }
        
        // Add general recommendations
        if (window.CSSOptimizer) {
            const cssReport = window.CSSOptimizer.generateOptimizationReport();
            recommendations.push(...cssReport.recommendations.map(rec => `• ${rec}`));
        }
        
        if (window.BuildOptimizer) {
            const buildRecommendations = window.BuildOptimizer.getRecommendations();
            recommendations.push(...buildRecommendations.map(rec => `• ${rec}`));
        }
        
        // Display recommendations
        if (recommendations.length === 0) {
            recommendationsList.innerHTML = '<div class="text-center py-2 text-green-600 dark:text-green-400">✓ Performance looks good!</div>';
        } else {
            recommendationsList.innerHTML = recommendations.slice(0, 5).join('<br>');
        }
    }

    /**
     * Store current metrics in history
     */
    storeMetrics() {
        const timestamp = Date.now();
        this.history.push({
            timestamp,
            ...this.metrics
        });
        
        // Keep only last 100 entries
        if (this.history.length > 100) {
            this.history.shift();
        }
        
        // Store in localStorage
        try {
            localStorage.setItem('performanceHistory', JSON.stringify(this.history.slice(-20)));
        } catch (error) {
            console.warn('Failed to store performance history:', error);
        }
    }

    /**
     * Toggle dashboard visibility
     */
    toggleDashboard() {
        if (this.isVisible) {
            this.hideDashboard();
        } else {
            this.showDashboard();
        }
    }

    /**
     * Show dashboard
     */
    showDashboard() {
        const dashboard = document.getElementById('performance-dashboard');
        if (dashboard) {
            dashboard.classList.remove('hidden');
            this.isVisible = true;
            this.updateDashboard();
        }
    }

    /**
     * Hide dashboard
     */
    hideDashboard() {
        const dashboard = document.getElementById('performance-dashboard');
        if (dashboard) {
            dashboard.classList.add('hidden');
            this.isVisible = false;
        }
    }

    /**
     * Clear all caches
     */
    async clearCache() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // Clear localStorage performance data
            localStorage.removeItem('performanceHistory');
            localStorage.removeItem('bundleAnalysis');
            localStorage.removeItem('performanceMetrics');
            
            alert('Cache cleared successfully!');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            alert('Failed to clear cache. Check console for details.');
        }
    }

    /**
     * Optimize CSS
     */
    async optimizeCSS() {
        try {
            if (window.CSSOptimizer) {
                const optimizedCSS = await window.CSSOptimizer.optimizeAllCSS();
                console.log('CSS optimization completed:', optimizedCSS);
                alert(`CSS optimization completed! Check console for details.`);
            } else {
                alert('CSS Optimizer not available');
            }
        } catch (error) {
            console.error('CSS optimization failed:', error);
            alert('CSS optimization failed. Check console for details.');
        }
    }

    /**
     * Export performance report
     */
    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            thresholds: this.thresholds,
            history: this.history.slice(-10),
            recommendations: this.getRecommendations(),
            buildOptimization: window.BuildOptimizer ? window.BuildOptimizer.generatePerformanceReport() : null,
            cssOptimization: window.CSSOptimizer ? window.CSSOptimizer.generateOptimizationReport() : null
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Get current recommendations
     * @returns {Array} - Array of recommendations
     */
    getRecommendations() {
        const recommendations = [];
        
        Object.keys(this.metrics).forEach(key => {
            if (this.metrics[key] > this.thresholds[key]) {
                recommendations.push(`${key} exceeds threshold: ${this.metrics[key]} > ${this.thresholds[key]}`);
            }
        });
        
        return recommendations;
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} - Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Get current performance state
     * @returns {Object} - Current state
     */
    getPerformanceState() {
        return {
            metrics: this.metrics,
            isVisible: this.isVisible,
            history: this.history.slice(-5)
        };
    }
}

// Create global instance
window.PerformanceDashboard = new PerformanceDashboard();

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceDashboard;
}