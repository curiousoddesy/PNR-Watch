/**
 * Error Handler and Loading State Manager
 * Provides comprehensive error handling and loading state management for the PNR Status Application
 */

class ErrorHandler {
    constructor() {
        this.isOnline = navigator.onLine;
        this.retryAttempts = new Map();
        this.maxRetryAttempts = 3;
        this.retryDelay = 1000; // 1 second base delay
        
        this.init();
    }

    init() {
        // Monitor network connectivity
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.hideNetworkError();
            this.showNetworkRestored();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkError();
        });

        // Add global error handler for unhandled promises
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'global');
        });
    }

    /**
     * Show loading indicator
     * @param {HTMLElement|string} target - Target element or selector
     * @param {string} message - Loading message
     * @param {string} type - Loading type (spinner, skeleton, inline)
     */
    showLoading(target, message = 'Loading...', type = 'spinner') {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return;

        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }

        let loadingHTML = '';
        
        switch (type) {
            case 'spinner':
                loadingHTML = `
                    <div class="flex items-center justify-center py-8" role="status" aria-live="polite">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                        <span class="text-slate-600 dark:text-slate-400">${message}</span>
                    </div>
                `;
                break;
            case 'skeleton':
                loadingHTML = `
                    <div class="animate-pulse space-y-4" role="status" aria-live="polite">
                        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                        <span class="sr-only">${message}</span>
                    </div>
                `;
                break;
            case 'inline':
                loadingHTML = `
                    <div class="flex items-center" role="status" aria-live="polite">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        <span class="text-sm text-slate-600 dark:text-slate-400">${message}</span>
                    </div>
                `;
                break;
            case 'button':
                const button = element;
                button.disabled = true;
                button.classList.add('opacity-75', 'cursor-not-allowed');
                const icon = button.querySelector('span.material-symbols-outlined');
                if (icon) {
                    icon.style.animation = 'spin 1s linear infinite';
                }
                return; // Don't replace innerHTML for buttons
        }

        element.innerHTML = loadingHTML;
        element.classList.add('loading-state');
    }

    /**
     * Hide loading indicator and restore original content
     * @param {HTMLElement|string} target - Target element or selector
     */
    hideLoading(target) {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return;

        if (element.tagName === 'BUTTON') {
            // Handle button loading state
            element.disabled = false;
            element.classList.remove('opacity-75', 'cursor-not-allowed');
            const icon = element.querySelector('span.material-symbols-outlined');
            if (icon) {
                icon.style.animation = '';
            }
        } else {
            // Restore original content
            if (element.dataset.originalContent) {
                element.innerHTML = element.dataset.originalContent;
                delete element.dataset.originalContent;
            }
            element.classList.remove('loading-state');
        }
    }

    /**
     * Show error message with retry option
     * @param {string} message - Error message
     * @param {HTMLElement|string} target - Target element or selector
     * @param {Function} retryCallback - Function to call on retry
     * @param {string} errorType - Type of error for tracking
     */
    showError(message, target = null, retryCallback = null, errorType = 'general') {
        const element = target ? (typeof target === 'string' ? document.querySelector(target) : target) : null;
        
        if (element) {
            const errorId = `error-${Date.now()}`;
            const retryButton = retryCallback ? `
                <button 
                    id="retry-${errorId}" 
                    class="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label="Retry the failed operation"
                >
                    <span class="material-symbols-outlined text-sm mr-1">refresh</span>
                    Try Again
                </button>
            ` : '';

            const errorHTML = `
                <div class="text-center py-8 px-4" role="alert" aria-live="assertive">
                    <div class="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                        <span class="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                    </div>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Something went wrong</h3>
                    <p class="text-slate-600 dark:text-slate-400 mb-4">${message}</p>
                    ${retryButton}
                </div>
            `;

            element.innerHTML = errorHTML;

            // Add retry functionality
            if (retryCallback) {
                const retryBtn = document.getElementById(`retry-${errorId}`);
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        this.handleRetry(retryCallback, errorType, element);
                    });
                }
            }
        } else {
            // Show toast notification
            this.showToast(message, 'error');
        }
    }

    /**
     * Handle retry logic with exponential backoff
     * @param {Function} retryCallback - Function to retry
     * @param {string} errorType - Type of error
     * @param {HTMLElement} element - Target element
     */
    async handleRetry(retryCallback, errorType, element) {
        const attempts = this.retryAttempts.get(errorType) || 0;
        
        if (attempts >= this.maxRetryAttempts) {
            this.showError(
                'Maximum retry attempts reached. Please check your connection and try again later.',
                element
            );
            return;
        }

        this.retryAttempts.set(errorType, attempts + 1);
        
        // Show loading state
        this.showLoading(element, 'Retrying...', 'spinner');
        
        // Exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempts);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            await retryCallback();
            // Reset retry count on success
            this.retryAttempts.delete(errorType);
        } catch (error) {
            console.error(`Retry attempt ${attempts + 1} failed:`, error);
            this.handleError(error, errorType, element, retryCallback);
        }
    }

    /**
     * Generic error handler
     * @param {Error|string} error - Error object or message
     * @param {string} context - Context where error occurred
     * @param {HTMLElement} target - Target element for error display
     * @param {Function} retryCallback - Retry function
     */
    handleError(error, context = 'unknown', target = null, retryCallback = null) {
        console.error(`Error in ${context}:`, error);
        
        let message = 'An unexpected error occurred. Please try again.';
        let errorType = 'general';

        if (typeof error === 'string') {
            message = error;
        } else if (error instanceof Error) {
            if (error.name === 'NetworkError' || error.message.includes('fetch')) {
                message = this.isOnline 
                    ? 'Unable to connect to the server. Please check your connection and try again.'
                    : 'You appear to be offline. Please check your internet connection.';
                errorType = 'network';
            } else if (error.name === 'ValidationError') {
                message = error.message;
                errorType = 'validation';
            } else if (error.message.includes('404')) {
                message = 'The requested information could not be found.';
                errorType = 'notfound';
            } else if (error.message.includes('500')) {
                message = 'Server error occurred. Please try again later.';
                errorType = 'server';
            }
        }

        this.showError(message, target, retryCallback, errorType);
    }

    /**
     * Show network connectivity error
     */
    showNetworkError() {
        const existingError = document.getElementById('network-error-banner');
        if (existingError) return;

        const banner = document.createElement('div');
        banner.id = 'network-error-banner';
        banner.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center text-sm z-50';
        banner.innerHTML = `
            <div class="flex items-center justify-center">
                <span class="material-symbols-outlined text-sm mr-2">wifi_off</span>
                You're offline. Some features may not work properly.
            </div>
        `;
        
        document.body.appendChild(banner);
    }

    /**
     * Hide network error banner
     */
    hideNetworkError() {
        const banner = document.getElementById('network-error-banner');
        if (banner) {
            banner.remove();
        }
    }

    /**
     * Show network restored notification
     */
    showNetworkRestored() {
        this.showToast('Connection restored', 'success');
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        const toastId = `toast-${Date.now()}`;
        toast.id = toastId;
        
        const typeClasses = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            warning: 'bg-orange-600 text-white',
            info: 'bg-blue-600 text-white'
        };

        const typeIcons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        toast.className = `fixed bottom-4 right-4 ${typeClasses[type]} px-4 py-3 rounded-lg shadow-lg z-50 flex items-center max-w-sm transform translate-x-full transition-transform duration-300`;
        toast.innerHTML = `
            <span class="material-symbols-outlined text-sm mr-2">${typeIcons[type]}</span>
            <span class="flex-1">${message}</span>
            <button class="ml-2 hover:opacity-75" onclick="document.getElementById('${toastId}').remove()">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    /**
     * Show success feedback
     * @param {string} message - Success message
     * @param {HTMLElement|string} target - Target element
     */
    showSuccess(message, target = null) {
        if (target) {
            const element = typeof target === 'string' ? document.querySelector(target) : target;
            if (element) {
                const successHTML = `
                    <div class="text-center py-8 px-4" role="status" aria-live="polite">
                        <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full mb-4">
                            <span class="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Success!</h3>
                        <p class="text-slate-600 dark:text-slate-400">${message}</p>
                    </div>
                `;
                element.innerHTML = successHTML;
            }
        } else {
            this.showToast(message, 'success');
        }
    }

    /**
     * Validate network connectivity before making requests
     * @returns {boolean} - Whether network is available
     */
    validateNetworkConnectivity() {
        if (!this.isOnline) {
            this.showError('You appear to be offline. Please check your internet connection.');
            return false;
        }
        return true;
    }

    /**
     * Wrap async operations with error handling
     * @param {Function} operation - Async operation to wrap
     * @param {HTMLElement|string} loadingTarget - Element to show loading state
     * @param {string} context - Context for error reporting
     * @returns {Promise} - Wrapped operation
     */
    async wrapAsyncOperation(operation, loadingTarget = null, context = 'operation') {
        if (!this.validateNetworkConnectivity()) {
            return Promise.reject(new Error('Network unavailable'));
        }

        if (loadingTarget) {
            this.showLoading(loadingTarget);
        }

        try {
            const result = await operation();
            if (loadingTarget) {
                this.hideLoading(loadingTarget);
            }
            return result;
        } catch (error) {
            if (loadingTarget) {
                this.hideLoading(loadingTarget);
                this.handleError(error, context, loadingTarget, () => operation());
            } else {
                this.handleError(error, context);
            }
            throw error;
        }
    }

    /**
     * Clear all retry attempts
     */
    clearRetryAttempts() {
        this.retryAttempts.clear();
    }

    /**
     * Get current error state
     * @returns {Object} - Current error state
     */
    getErrorState() {
        return {
            isOnline: this.isOnline,
            retryAttempts: Object.fromEntries(this.retryAttempts)
        };
    }
}

// Create global instance
window.ErrorHandler = new ErrorHandler();

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}