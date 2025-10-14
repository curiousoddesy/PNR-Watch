/**
 * Build Configuration and Performance Optimization
 * Handles CSS/JS minification, font optimization, and bundle analysis
 */

class BuildOptimizer {
    constructor() {
        this.config = {
            minifyCSS: true,
            minifyJS: true,
            optimizeFonts: true,
            enableGzip: true,
            bundleAnalysis: true,
            performanceMetrics: true
        };
        
        this.metrics = {
            bundleSize: 0,
            loadTime: 0,
            renderTime: 0,
            interactionTime: 0
        };
        
        this.init();
    }

    init() {
        // Initialize performance monitoring
        this.initPerformanceMonitoring();
        
        // Optimize font loading
        this.optimizeFontLoading();
        
        // Implement lazy loading for non-critical resources
        this.implementLazyLoading();
        
        // Set up bundle analysis
        this.analyzeBundleSize();
    }

    /**
     * Initialize performance monitoring and metrics collection
     */
    initPerformanceMonitoring() {
        // Performance Observer for monitoring various metrics
        if ('PerformanceObserver' in window) {
            // Monitor Largest Contentful Paint (LCP)
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.renderTime = lastEntry.startTime;
                this.reportMetric('LCP', lastEntry.startTime);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // Monitor First Input Delay (FID)
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.metrics.interactionTime = entry.processingStart - entry.startTime;
                    this.reportMetric('FID', entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });

            // Monitor Cumulative Layout Shift (CLS)
            const clsObserver = new PerformanceObserver((entryList) => {
                let clsValue = 0;
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                this.reportMetric('CLS', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }

        // Monitor page load performance
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
            this.reportMetric('Load Time', this.metrics.loadTime);
        });
    }

    /**
     * Optimize font loading with preload and font-display strategies
     */
    optimizeFontLoading() {
        // Add font preload links for critical fonts
        const criticalFonts = [
            'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap',
            'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
        ];

        criticalFonts.forEach(fontUrl => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = fontUrl;
            link.onload = function() {
                this.onload = null;
                this.rel = 'stylesheet';
            };
            document.head.appendChild(link);
        });

        // Add font-display: swap to existing font CSS
        const fontStylesheets = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
        fontStylesheets.forEach(link => {
            if (!link.href.includes('display=swap')) {
                link.href += link.href.includes('?') ? '&display=swap' : '?display=swap';
            }
        });
    }

    /**
     * Implement lazy loading for non-critical resources
     */
    implementLazyLoading() {
        // Lazy load images with Intersection Observer
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            // Observe all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Lazy load non-critical JavaScript modules
        this.lazyLoadModules();
    }

    /**
     * Lazy load non-critical JavaScript modules
     */
    lazyLoadModules() {
        const nonCriticalModules = [
            { name: 'analytics', src: '/js/analytics.js', condition: () => true },
            { name: 'charts', src: '/js/charts.js', condition: () => document.querySelector('.chart-container') },
            { name: 'advanced-features', src: '/js/advanced.js', condition: () => localStorage.getItem('enableAdvanced') === 'true' }
        ];

        nonCriticalModules.forEach(module => {
            if (module.condition()) {
                this.loadModuleAsync(module.name, module.src);
            }
        });
    }

    /**
     * Load JavaScript module asynchronously
     * @param {string} name - Module name
     * @param {string} src - Module source URL
     */
    async loadModuleAsync(name, src) {
        try {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    console.log(`Module ${name} loaded successfully`);
                    resolve();
                };
                script.onerror = () => {
                    console.warn(`Failed to load module ${name}`);
                    reject(new Error(`Failed to load ${name}`));
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error(`Error loading module ${name}:`, error);
        }
    }

    /**
     * Analyze and report bundle sizes
     */
    analyzeBundleSize() {
        // Calculate approximate bundle sizes
        const resources = performance.getEntriesByType('resource');
        let totalSize = 0;
        const bundleBreakdown = {
            css: 0,
            js: 0,
            fonts: 0,
            images: 0,
            other: 0
        };

        resources.forEach(resource => {
            const size = resource.transferSize || resource.encodedBodySize || 0;
            totalSize += size;

            // Categorize resources
            if (resource.name.includes('.css') || resource.name.includes('fonts.googleapis.com')) {
                bundleBreakdown.css += size;
            } else if (resource.name.includes('.js')) {
                bundleBreakdown.js += size;
            } else if (resource.name.includes('font') || resource.name.includes('.woff')) {
                bundleBreakdown.fonts += size;
            } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
                bundleBreakdown.images += size;
            } else {
                bundleBreakdown.other += size;
            }
        });

        this.metrics.bundleSize = totalSize;
        this.reportBundleAnalysis(bundleBreakdown, totalSize);
    }

    /**
     * Report bundle analysis results
     * @param {Object} breakdown - Bundle size breakdown
     * @param {number} totalSize - Total bundle size
     */
    reportBundleAnalysis(breakdown, totalSize) {
        const analysis = {
            total: this.formatBytes(totalSize),
            breakdown: {
                css: this.formatBytes(breakdown.css),
                js: this.formatBytes(breakdown.js),
                fonts: this.formatBytes(breakdown.fonts),
                images: this.formatBytes(breakdown.images),
                other: this.formatBytes(breakdown.other)
            },
            recommendations: this.generateOptimizationRecommendations(breakdown, totalSize)
        };

        console.group('📊 Bundle Analysis');
        console.log('Total Size:', analysis.total);
        console.log('Breakdown:', analysis.breakdown);
        console.log('Recommendations:', analysis.recommendations);
        console.groupEnd();

        // Store analysis for performance dashboard
        this.storeAnalysis(analysis);
    }

    /**
     * Generate optimization recommendations based on bundle analysis
     * @param {Object} breakdown - Bundle size breakdown
     * @param {number} totalSize - Total bundle size
     * @returns {Array} - Array of recommendations
     */
    generateOptimizationRecommendations(breakdown, totalSize) {
        const recommendations = [];

        // Check total bundle size
        if (totalSize > 500 * 1024) { // 500KB
            recommendations.push('Consider code splitting to reduce initial bundle size');
        }

        // Check CSS size
        if (breakdown.css > 100 * 1024) { // 100KB
            recommendations.push('CSS bundle is large - consider purging unused styles');
        }

        // Check JavaScript size
        if (breakdown.js > 200 * 1024) { // 200KB
            recommendations.push('JavaScript bundle is large - consider lazy loading non-critical modules');
        }

        // Check font size
        if (breakdown.fonts > 150 * 1024) { // 150KB
            recommendations.push('Font files are large - consider using variable fonts or subsetting');
        }

        // Check image size
        if (breakdown.images > 300 * 1024) { // 300KB
            recommendations.push('Image files are large - consider WebP format and lazy loading');
        }

        return recommendations;
    }

    /**
     * Implement CSS optimization strategies
     */
    optimizeCSS() {
        // Remove unused CSS classes (simplified implementation)
        const usedClasses = new Set();
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            element.classList.forEach(className => {
                usedClasses.add(className);
            });
        });

        // Report unused classes (in production, this would remove them)
        console.log('Used CSS classes:', usedClasses.size);
        
        // Optimize critical CSS
        this.extractCriticalCSS();
    }

    /**
     * Extract and inline critical CSS
     */
    extractCriticalCSS() {
        // Identify above-the-fold elements
        const criticalElements = [];
        const viewportHeight = window.innerHeight;
        
        document.querySelectorAll('*').forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0) {
                criticalElements.push(element);
            }
        });

        console.log('Critical elements identified:', criticalElements.length);
        
        // In production, this would extract and inline the CSS for these elements
        this.reportMetric('Critical Elements', criticalElements.length);
    }

    /**
     * Optimize JavaScript execution
     */
    optimizeJavaScript() {
        // Implement code splitting points
        const splitPoints = [
            { name: 'vendor', condition: () => true },
            { name: 'components', condition: () => document.querySelector('[data-component]') },
            { name: 'utilities', condition: () => true }
        ];

        splitPoints.forEach(point => {
            if (point.condition()) {
                console.log(`Code split point identified: ${point.name}`);
            }
        });

        // Optimize event listeners
        this.optimizeEventListeners();
    }

    /**
     * Optimize event listeners using delegation
     */
    optimizeEventListeners() {
        // Remove individual event listeners and use delegation
        const delegatedEvents = ['click', 'input', 'change', 'focus', 'blur'];
        
        delegatedEvents.forEach(eventType => {
            document.addEventListener(eventType, (event) => {
                // Handle delegated events based on element attributes
                const target = event.target;
                
                if (target.dataset.action) {
                    this.handleDelegatedAction(target.dataset.action, event);
                }
            }, { passive: true });
        });
    }

    /**
     * Handle delegated actions
     * @param {string} action - Action to handle
     * @param {Event} event - Event object
     */
    handleDelegatedAction(action, event) {
        switch (action) {
            case 'navigate':
                const target = event.target.dataset.target;
                if (target && window.NavigationManager) {
                    window.NavigationManager.navigateTo(target);
                }
                break;
            case 'validate':
                if (window.FormValidator) {
                    const fieldType = event.target.dataset.validate;
                    window.FormValidator.validateField(event.target, fieldType);
                }
                break;
            default:
                console.log('Unhandled delegated action:', action);
        }
    }

    /**
     * Implement resource hints for better loading performance
     */
    implementResourceHints() {
        const hints = [
            { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
            { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: true },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
        ];

        hints.forEach(hint => {
            const link = document.createElement('link');
            link.rel = hint.rel;
            link.href = hint.href;
            if (hint.crossorigin) {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        });
    }

    /**
     * Report performance metric
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     */
    reportMetric(name, value) {
        if (this.config.performanceMetrics) {
            console.log(`📈 ${name}: ${typeof value === 'number' ? this.formatNumber(value) : value}`);
            
            // Store metric for dashboard
            const metrics = JSON.parse(localStorage.getItem('performanceMetrics') || '{}');
            metrics[name] = {
                value: value,
                timestamp: Date.now()
            };
            localStorage.setItem('performanceMetrics', JSON.stringify(metrics));
        }
    }

    /**
     * Store analysis results
     * @param {Object} analysis - Analysis results
     */
    storeAnalysis(analysis) {
        const analysisHistory = JSON.parse(localStorage.getItem('bundleAnalysis') || '[]');
        analysisHistory.push({
            ...analysis,
            timestamp: Date.now()
        });
        
        // Keep only last 10 analyses
        if (analysisHistory.length > 10) {
            analysisHistory.shift();
        }
        
        localStorage.setItem('bundleAnalysis', JSON.stringify(analysisHistory));
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} - Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format number with appropriate units
     * @param {number} num - Number to format
     * @returns {string} - Formatted string
     */
    formatNumber(num) {
        if (num < 1000) return num.toFixed(2) + 'ms';
        return (num / 1000).toFixed(2) + 's';
    }

    /**
     * Get current performance metrics
     * @returns {Object} - Current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get optimization recommendations
     * @returns {Array} - Array of recommendations
     */
    getRecommendations() {
        const recommendations = [];
        
        // Check current metrics and provide recommendations
        if (this.metrics.loadTime > 3000) {
            recommendations.push('Page load time is slow - consider optimizing critical resources');
        }
        
        if (this.metrics.renderTime > 2500) {
            recommendations.push('Render time is slow - optimize above-the-fold content');
        }
        
        if (this.metrics.interactionTime > 100) {
            recommendations.push('Interaction delay detected - optimize JavaScript execution');
        }
        
        if (this.metrics.bundleSize > 1024 * 1024) {
            recommendations.push('Bundle size is large - implement code splitting');
        }
        
        return recommendations;
    }

    /**
     * Generate performance report
     * @returns {Object} - Performance report
     */
    generatePerformanceReport() {
        return {
            metrics: this.getMetrics(),
            recommendations: this.getRecommendations(),
            bundleAnalysis: JSON.parse(localStorage.getItem('bundleAnalysis') || '[]'),
            timestamp: Date.now()
        };
    }
}

// Create global instance
window.BuildOptimizer = new BuildOptimizer();

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BuildOptimizer;
}