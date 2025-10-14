/**
 * Performance Monitor Integration
 * Coordinates all performance optimization tools and provides unified monitoring
 */

class PerformanceMonitor {
    constructor() {
        this.isInitialized = false;
        this.optimizers = {};
        this.metrics = {
            initialization: 0,
            bundleOptimization: 0,
            cssOptimization: 0,
            cacheOptimization: 0,
            totalOptimization: 0
        };
        
        this.init();
    }

    async init() {
        const startTime = performance.now();
        
        try {
            // Initialize all optimization tools
            await this.initializeOptimizers();
            
            // Set up performance monitoring
            this.setupPerformanceMonitoring();
            
            // Set up automatic optimizations
            this.setupAutomaticOptimizations();
            
            // Calculate initialization time
            this.metrics.initialization = performance.now() - startTime;
            
            this.isInitialized = true;
            console.log(`Performance Monitor initialized in ${this.metrics.initialization.toFixed(2)}ms`);
            
            // Report initial performance state
            this.reportPerformanceState();
            
        } catch (error) {
            console.error('Failed to initialize Performance Monitor:', error);
        }
    }

    /**
     * Initialize all optimization tools
     */
    async initializeOptimizers() {
        // Initialize Build Optimizer
        if (window.BuildOptimizer) {
            this.optimizers.build = window.BuildOptimizer;
            console.log('✓ Build Optimizer initialized');
        }

        // Initialize CSS Optimizer
        if (window.CSSOptimizer) {
            this.optimizers.css = window.CSSOptimizer;
            console.log('✓ CSS Optimizer initialized');
        }

        // Initialize Performance Dashboard
        if (window.PerformanceDashboard) {
            this.optimizers.dashboard = window.PerformanceDashboard;
            console.log('✓ Performance Dashboard initialized');
        }

        // Initialize Error Handler
        if (window.ErrorHandler) {
            this.optimizers.errorHandler = window.ErrorHandler;
            console.log('✓ Error Handler initialized');
        }

        // Initialize Offline Manager
        if (window.OfflineManager) {
            this.optimizers.offline = window.OfflineManager;
            console.log('✓ Offline Manager initialized');
        }

        // Initialize Form Validator
        if (window.FormValidator) {
            this.optimizers.formValidator = window.FormValidator;
            console.log('✓ Form Validator initialized');
        }
    }

    /**
     * Set up comprehensive performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor Core Web Vitals
        this.monitorCoreWebVitals();
        
        // Monitor resource loading
        this.monitorResourceLoading();
        
        // Monitor user interactions
        this.monitorUserInteractions();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
        
        // Set up periodic performance checks
        this.setupPeriodicChecks();
    }

    /**
     * Monitor Core Web Vitals (LCP, FID, CLS)
     */
    monitorCoreWebVitals() {
        if (!('PerformanceObserver' in window)) return;

        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.reportMetric('LCP', lastEntry.startTime, {
                good: 2500,
                needsImprovement: 4000
            });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                const fid = entry.processingStart - entry.startTime;
                this.reportMetric('FID', fid, {
                    good: 100,
                    needsImprovement: 300
                });
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            this.reportMetric('CLS', clsValue, {
                good: 0.1,
                needsImprovement: 0.25
            });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    /**
     * Monitor resource loading performance
     */
    monitorResourceLoading() {
        const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                // Categorize resources
                const resourceType = this.categorizeResource(entry.name);
                
                // Report slow resources
                if (entry.duration > 1000) { // Slower than 1 second
                    console.warn(`Slow ${resourceType} resource:`, {
                        name: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize
                    });
                }
                
                // Track cache performance
                if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
                    this.reportMetric('CacheHit', 1);
                } else {
                    this.reportMetric('CacheMiss', 1);
                }
            });
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    /**
     * Monitor user interactions for performance impact
     */
    monitorUserInteractions() {
        let interactionCount = 0;
        let totalInteractionTime = 0;

        const interactionEvents = ['click', 'keydown', 'touchstart'];
        
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, (event) => {
                const startTime = performance.now();
                
                // Use requestIdleCallback to measure interaction impact
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => {
                        const endTime = performance.now();
                        const interactionTime = endTime - startTime;
                        
                        interactionCount++;
                        totalInteractionTime += interactionTime;
                        
                        // Report if interaction is slow
                        if (interactionTime > 50) {
                            console.warn('Slow interaction detected:', {
                                type: eventType,
                                target: event.target.tagName,
                                duration: interactionTime
                            });
                        }
                        
                        // Report average interaction time periodically
                        if (interactionCount % 10 === 0) {
                            const avgInteractionTime = totalInteractionTime / interactionCount;
                            this.reportMetric('AvgInteractionTime', avgInteractionTime);
                        }
                    });
                }
            }, { passive: true });
        });
    }

    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        if (!performance.memory) return;

        const checkMemory = () => {
            const memory = performance.memory;
            const memoryUsage = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
            };

            // Report high memory usage
            if (memoryUsage.percentage > 80) {
                console.warn('High memory usage detected:', memoryUsage);
                this.reportMetric('HighMemoryUsage', memoryUsage.percentage);
            }

            this.reportMetric('MemoryUsage', memoryUsage.used);
        };

        // Check memory usage every 30 seconds
        setInterval(checkMemory, 30000);
        checkMemory(); // Initial check
    }

    /**
     * Set up periodic performance checks
     */
    setupPeriodicChecks() {
        // Run comprehensive performance audit every 5 minutes
        setInterval(() => {
            this.runPerformanceAudit();
        }, 5 * 60 * 1000);

        // Run quick performance check every minute
        setInterval(() => {
            this.runQuickPerformanceCheck();
        }, 60 * 1000);
    }

    /**
     * Set up automatic optimizations
     */
    setupAutomaticOptimizations() {
        // Optimize CSS when DOM changes significantly
        let domChangeCount = 0;
        const domObserver = new MutationObserver(() => {
            domChangeCount++;
            if (domChangeCount > 50) { // Significant DOM changes
                this.optimizeCSS();
                domChangeCount = 0;
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        // Optimize on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.runQuickPerformanceCheck();
            }
        });

        // Optimize on network status change
        window.addEventListener('online', () => {
            this.optimizeForOnlineState();
        });

        window.addEventListener('offline', () => {
            this.optimizeForOfflineState();
        });
    }

    /**
     * Run comprehensive performance audit
     */
    async runPerformanceAudit() {
        console.group('🔍 Performance Audit');
        
        const auditResults = {
            timestamp: Date.now(),
            metrics: {},
            recommendations: [],
            optimizations: {}
        };

        try {
            // Collect metrics from all optimizers
            if (this.optimizers.build) {
                auditResults.metrics.build = this.optimizers.build.getMetrics();
                auditResults.recommendations.push(...this.optimizers.build.getRecommendations());
            }

            if (this.optimizers.css) {
                auditResults.metrics.css = this.optimizers.css.generateOptimizationReport();
                auditResults.recommendations.push(...auditResults.metrics.css.recommendations);
            }

            if (this.optimizers.dashboard) {
                auditResults.metrics.dashboard = this.optimizers.dashboard.getPerformanceState();
            }

            // Run optimizations
            auditResults.optimizations.css = await this.optimizeCSS();
            auditResults.optimizations.bundle = await this.optimizeBundle();
            auditResults.optimizations.cache = await this.optimizeCache();

            // Store audit results
            this.storeAuditResults(auditResults);

            console.log('Performance audit completed:', auditResults);
            
        } catch (error) {
            console.error('Performance audit failed:', error);
        }
        
        console.groupEnd();
    }

    /**
     * Run quick performance check
     */
    runQuickPerformanceCheck() {
        const metrics = {
            timestamp: Date.now(),
            memory: performance.memory ? performance.memory.usedJSHeapSize : 0,
            timing: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0
        };

        // Check for performance issues
        const issues = [];
        
        if (metrics.memory > 50 * 1024 * 1024) { // 50MB
            issues.push('High memory usage detected');
        }

        if (metrics.timing > 5000) { // 5 seconds
            issues.push('Slow page load detected');
        }

        if (issues.length > 0) {
            console.warn('Performance issues detected:', issues);
            this.reportMetric('PerformanceIssues', issues.length);
        }

        return { metrics, issues };
    }

    /**
     * Optimize CSS
     */
    async optimizeCSS() {
        if (!this.optimizers.css) return null;

        const startTime = performance.now();
        
        try {
            const optimizedCSS = await this.optimizers.css.optimizeAllCSS();
            const optimizationTime = performance.now() - startTime;
            
            this.metrics.cssOptimization += optimizationTime;
            this.reportMetric('CSSOptimizationTime', optimizationTime);
            
            return {
                success: true,
                time: optimizationTime,
                results: optimizedCSS
            };
        } catch (error) {
            console.error('CSS optimization failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Optimize bundle
     */
    async optimizeBundle() {
        if (!this.optimizers.build) return null;

        const startTime = performance.now();
        
        try {
            // Run bundle analysis
            this.optimizers.build.analyzeBundleSize();
            
            // Optimize JavaScript execution
            this.optimizers.build.optimizeJavaScript();
            
            const optimizationTime = performance.now() - startTime;
            this.metrics.bundleOptimization += optimizationTime;
            this.reportMetric('BundleOptimizationTime', optimizationTime);
            
            return {
                success: true,
                time: optimizationTime,
                metrics: this.optimizers.build.getMetrics()
            };
        } catch (error) {
            console.error('Bundle optimization failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Optimize cache
     */
    async optimizeCache() {
        const startTime = performance.now();
        
        try {
            // Clear old cache entries
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('old') || cacheName.includes('v1')) {
                        await caches.delete(cacheName);
                    }
                }
            }
            
            const optimizationTime = performance.now() - startTime;
            this.metrics.cacheOptimization += optimizationTime;
            this.reportMetric('CacheOptimizationTime', optimizationTime);
            
            return {
                success: true,
                time: optimizationTime
            };
        } catch (error) {
            console.error('Cache optimization failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Optimize for online state
     */
    optimizeForOnlineState() {
        console.log('Optimizing for online state...');
        
        // Process offline queue
        if (this.optimizers.offline) {
            this.optimizers.offline.processOfflineQueue();
        }
        
        // Refresh performance metrics
        this.runQuickPerformanceCheck();
    }

    /**
     * Optimize for offline state
     */
    optimizeForOfflineState() {
        console.log('Optimizing for offline state...');
        
        // Reduce background processing
        // Clear non-essential timers
        // Optimize memory usage
    }

    /**
     * Categorize resource by URL
     * @param {string} url - Resource URL
     * @returns {string} - Resource category
     */
    categorizeResource(url) {
        if (url.includes('.css')) return 'CSS';
        if (url.includes('.js')) return 'JavaScript';
        if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return 'Image';
        if (url.includes('font')) return 'Font';
        if (url.includes('.html')) return 'HTML';
        return 'Other';
    }

    /**
     * Report performance metric
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     * @param {Object} thresholds - Performance thresholds
     */
    reportMetric(name, value, thresholds = null) {
        const metric = {
            name,
            value,
            timestamp: Date.now()
        };

        if (thresholds) {
            if (value <= thresholds.good) {
                metric.rating = 'good';
            } else if (value <= thresholds.needsImprovement) {
                metric.rating = 'needs-improvement';
            } else {
                metric.rating = 'poor';
            }
        }

        // Store metric
        const metrics = JSON.parse(localStorage.getItem('performanceMetrics') || '{}');
        if (!metrics[name]) metrics[name] = [];
        metrics[name].push(metric);
        
        // Keep only last 100 entries per metric
        if (metrics[name].length > 100) {
            metrics[name] = metrics[name].slice(-100);
        }
        
        localStorage.setItem('performanceMetrics', JSON.stringify(metrics));

        // Log significant metrics
        if (thresholds && metric.rating === 'poor') {
            console.warn(`Poor ${name} performance:`, metric);
        }
    }

    /**
     * Store audit results
     * @param {Object} results - Audit results
     */
    storeAuditResults(results) {
        const audits = JSON.parse(localStorage.getItem('performanceAudits') || '[]');
        audits.push(results);
        
        // Keep only last 10 audits
        if (audits.length > 10) {
            audits.shift();
        }
        
        localStorage.setItem('performanceAudits', JSON.stringify(audits));
    }

    /**
     * Report current performance state
     */
    reportPerformanceState() {
        const state = {
            initialized: this.isInitialized,
            optimizers: Object.keys(this.optimizers),
            metrics: this.metrics,
            timestamp: Date.now()
        };

        console.group('📊 Performance Monitor State');
        console.log('Initialization Time:', `${this.metrics.initialization.toFixed(2)}ms`);
        console.log('Available Optimizers:', state.optimizers);
        console.log('Total Optimization Time:', `${this.metrics.totalOptimization.toFixed(2)}ms`);
        console.groupEnd();

        return state;
    }

    /**
     * Get comprehensive performance report
     * @returns {Object} - Performance report
     */
    getPerformanceReport() {
        return {
            monitor: this.reportPerformanceState(),
            build: this.optimizers.build ? this.optimizers.build.generatePerformanceReport() : null,
            css: this.optimizers.css ? this.optimizers.css.generateOptimizationReport() : null,
            dashboard: this.optimizers.dashboard ? this.optimizers.dashboard.getPerformanceState() : null,
            audits: JSON.parse(localStorage.getItem('performanceAudits') || '[]'),
            metrics: JSON.parse(localStorage.getItem('performanceMetrics') || '{}')
        };
    }
}

// Initialize Performance Monitor when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.PerformanceMonitor = new PerformanceMonitor();
    });
} else {
    window.PerformanceMonitor = new PerformanceMonitor();
}

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}