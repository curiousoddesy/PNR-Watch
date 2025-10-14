/**
 * CSS Optimizer
 * Handles CSS minification, purging unused styles, and critical CSS extraction
 */

class CSSOptimizer {
    constructor() {
        this.usedClasses = new Set();
        this.criticalCSS = '';
        this.nonCriticalCSS = '';
        this.config = {
            purgeUnusedCSS: true,
            extractCriticalCSS: true,
            minifyCSS: true,
            inlineCriticalCSS: true
        };
        
        this.init();
    }

    init() {
        // Scan for used CSS classes
        this.scanUsedClasses();
        
        // Extract critical CSS
        if (this.config.extractCriticalCSS) {
            this.extractCriticalCSS();
        }
        
        // Set up mutation observer to track dynamic class usage
        this.setupClassUsageObserver();
    }

    /**
     * Scan the DOM for used CSS classes
     */
    scanUsedClasses() {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            // Add classes from classList
            element.classList.forEach(className => {
                this.usedClasses.add(className);
            });
            
            // Add classes from data attributes that might be used dynamically
            Object.keys(element.dataset).forEach(key => {
                const value = element.dataset[key];
                if (value && typeof value === 'string') {
                    // Look for class-like patterns in data attributes
                    const classMatches = value.match(/\b[a-z-]+(?::[a-z-]+)*\b/g);
                    if (classMatches) {
                        classMatches.forEach(match => {
                            this.usedClasses.add(match);
                        });
                    }
                }
            });
        });

        // Add commonly used Tailwind utility classes that might be added dynamically
        const dynamicClasses = [
            'hidden', 'block', 'flex', 'grid', 'inline', 'inline-block',
            'opacity-0', 'opacity-100', 'invisible', 'visible',
            'translate-x-full', 'translate-x-0', 'translate-y-full', 'translate-y-0',
            'scale-0', 'scale-100', 'rotate-0', 'rotate-180',
            'bg-primary', 'text-primary', 'border-primary',
            'bg-green-500', 'bg-red-500', 'bg-orange-500',
            'text-green-600', 'text-red-600', 'text-orange-600',
            'border-green-500', 'border-red-500', 'border-orange-500',
            'animate-spin', 'animate-pulse', 'animate-bounce',
            'loading-state', 'error-shake', 'success-bounce',
            'fade-in', 'slide-up', 'hover-lift'
        ];

        dynamicClasses.forEach(className => {
            this.usedClasses.add(className);
        });

        console.log(`Found ${this.usedClasses.size} used CSS classes`);
    }

    /**
     * Set up mutation observer to track dynamically added classes
     */
    setupClassUsageObserver() {
        if (!window.MutationObserver) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    element.classList.forEach(className => {
                        this.usedClasses.add(className);
                    });
                }
                
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanElementClasses(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['class']
        });
    }

    /**
     * Scan classes in a specific element and its children
     * @param {Element} element - Element to scan
     */
    scanElementClasses(element) {
        element.classList.forEach(className => {
            this.usedClasses.add(className);
        });
        
        element.querySelectorAll('*').forEach(child => {
            child.classList.forEach(className => {
                this.usedClasses.add(className);
            });
        });
    }

    /**
     * Extract critical CSS for above-the-fold content
     */
    extractCriticalCSS() {
        const viewportHeight = window.innerHeight;
        const criticalElements = [];
        
        // Find elements in the viewport
        document.querySelectorAll('*').forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0) {
                criticalElements.push(element);
            }
        });

        // Extract classes used by critical elements
        const criticalClasses = new Set();
        criticalElements.forEach(element => {
            element.classList.forEach(className => {
                criticalClasses.add(className);
            });
        });

        console.log(`Found ${criticalClasses.size} critical CSS classes`);
        
        // In a real implementation, this would extract the actual CSS rules
        this.generateCriticalCSS(criticalClasses);
    }

    /**
     * Generate critical CSS from critical classes
     * @param {Set} criticalClasses - Set of critical CSS classes
     */
    generateCriticalCSS(criticalClasses) {
        // This is a simplified implementation
        // In production, you would parse actual CSS files and extract matching rules
        
        const criticalRules = [];
        
        // Add essential base styles
        criticalRules.push(`
            /* Critical CSS - Above the fold styles */
            html, body { margin: 0; padding: 0; }
            body { font-family: 'Public Sans', system-ui, sans-serif; }
            .hidden { display: none !important; }
            .block { display: block !important; }
            .flex { display: flex !important; }
            .grid { display: grid !important; }
        `);

        // Add critical utility classes
        Array.from(criticalClasses).forEach(className => {
            // Generate basic utility CSS for common classes
            if (className.startsWith('text-')) {
                criticalRules.push(`.${className} { color: var(--${className}); }`);
            } else if (className.startsWith('bg-')) {
                criticalRules.push(`.${className} { background-color: var(--${className}); }`);
            } else if (className.startsWith('p-')) {
                const value = className.split('-')[1];
                criticalRules.push(`.${className} { padding: ${value * 0.25}rem; }`);
            } else if (className.startsWith('m-')) {
                const value = className.split('-')[1];
                criticalRules.push(`.${className} { margin: ${value * 0.25}rem; }`);
            }
        });

        this.criticalCSS = criticalRules.join('\n');
        
        // Inline critical CSS if configured
        if (this.config.inlineCriticalCSS) {
            this.inlineCriticalCSS();
        }
    }

    /**
     * Inline critical CSS in the document head
     */
    inlineCriticalCSS() {
        const existingInlineCSS = document.querySelector('#critical-css');
        if (existingInlineCSS) {
            existingInlineCSS.remove();
        }

        const style = document.createElement('style');
        style.id = 'critical-css';
        style.textContent = this.criticalCSS;
        document.head.insertBefore(style, document.head.firstChild);
        
        console.log('Critical CSS inlined');
    }

    /**
     * Generate purged CSS by removing unused classes
     * @param {string} cssContent - Original CSS content
     * @returns {string} - Purged CSS content
     */
    purgeUnusedCSS(cssContent) {
        if (!this.config.purgeUnusedCSS) {
            return cssContent;
        }

        // This is a simplified implementation
        // In production, you would use a proper CSS parser
        
        const lines = cssContent.split('\n');
        const purgedLines = [];
        let inRule = false;
        let currentRule = '';
        let ruleUsed = false;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            if (trimmedLine.includes('{')) {
                inRule = true;
                currentRule = trimmedLine;
                
                // Check if any class in the rule is used
                const classMatches = trimmedLine.match(/\.[a-zA-Z0-9_-]+/g);
                if (classMatches) {
                    ruleUsed = classMatches.some(match => {
                        const className = match.substring(1); // Remove the dot
                        return this.usedClasses.has(className);
                    });
                } else {
                    ruleUsed = true; // Keep non-class rules (element selectors, etc.)
                }
                
                if (ruleUsed) {
                    purgedLines.push(line);
                }
            } else if (trimmedLine.includes('}')) {
                if (ruleUsed) {
                    purgedLines.push(line);
                }
                inRule = false;
                currentRule = '';
                ruleUsed = false;
            } else if (inRule && ruleUsed) {
                purgedLines.push(line);
            } else if (!inRule) {
                // Keep comments and other non-rule content
                purgedLines.push(line);
            }
        });

        const purgedCSS = purgedLines.join('\n');
        const originalSize = cssContent.length;
        const purgedSize = purgedCSS.length;
        const savings = ((originalSize - purgedSize) / originalSize * 100).toFixed(1);
        
        console.log(`CSS purged: ${this.formatBytes(originalSize)} → ${this.formatBytes(purgedSize)} (${savings}% reduction)`);
        
        return purgedCSS;
    }

    /**
     * Minify CSS content
     * @param {string} cssContent - CSS content to minify
     * @returns {string} - Minified CSS content
     */
    minifyCSS(cssContent) {
        if (!this.config.minifyCSS) {
            return cssContent;
        }

        let minified = cssContent
            // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove whitespace around special characters
            .replace(/\s*([{}:;,>+~])\s*/g, '$1')
            // Remove trailing semicolons
            .replace(/;}/g, '}')
            // Remove leading/trailing whitespace
            .trim();

        const originalSize = cssContent.length;
        const minifiedSize = minified.length;
        const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        
        console.log(`CSS minified: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${savings}% reduction)`);
        
        return minified;
    }

    /**
     * Optimize all CSS files
     */
    async optimizeAllCSS() {
        const styleSheets = Array.from(document.styleSheets);
        const optimizedCSS = [];

        for (const styleSheet of styleSheets) {
            try {
                if (styleSheet.href && styleSheet.href.includes(window.location.origin)) {
                    const response = await fetch(styleSheet.href);
                    const cssContent = await response.text();
                    
                    let optimized = cssContent;
                    optimized = this.purgeUnusedCSS(optimized);
                    optimized = this.minifyCSS(optimized);
                    
                    optimizedCSS.push({
                        href: styleSheet.href,
                        original: cssContent,
                        optimized: optimized
                    });
                }
            } catch (error) {
                console.warn('Failed to optimize CSS file:', styleSheet.href, error);
            }
        }

        return optimizedCSS;
    }

    /**
     * Generate CSS optimization report
     * @returns {Object} - Optimization report
     */
    generateOptimizationReport() {
        return {
            usedClasses: this.usedClasses.size,
            criticalCSSGenerated: this.criticalCSS.length > 0,
            criticalCSSSize: this.criticalCSS.length,
            recommendations: this.generateCSSRecommendations()
        };
    }

    /**
     * Generate CSS optimization recommendations
     * @returns {Array} - Array of recommendations
     */
    generateCSSRecommendations() {
        const recommendations = [];
        
        if (this.usedClasses.size > 500) {
            recommendations.push('Consider using CSS-in-JS or component-scoped styles to reduce unused CSS');
        }
        
        if (this.criticalCSS.length === 0) {
            recommendations.push('Extract and inline critical CSS for better First Contentful Paint');
        }
        
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        if (stylesheets.length > 3) {
            recommendations.push('Consider combining CSS files to reduce HTTP requests');
        }
        
        // Check for large external CSS files
        stylesheets.forEach(link => {
            if (link.href.includes('tailwindcss.com')) {
                recommendations.push('Consider using a custom Tailwind build instead of CDN for better performance');
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
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get current optimization state
     * @returns {Object} - Current state
     */
    getOptimizationState() {
        return {
            usedClasses: Array.from(this.usedClasses),
            criticalCSS: this.criticalCSS,
            config: this.config
        };
    }
}

// Create global instance
window.CSSOptimizer = new CSSOptimizer();

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSSOptimizer;
}