/**
 * Production monitoring and error tracking service
 * Integrates with Sentry, Web Vitals, and custom analytics
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals'

// Types
interface ErrorContext {
  userId?: string
  sessionId: string
  userAgent: string
  url: string
  timestamp: number
  buildVersion: string
  environment: string
}

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  url: string
}

interface CustomEvent {
  name: string
  properties: Record<string, any>
  timestamp: number
  userId?: string
  sessionId: string
}

class MonitoringService {
  private sessionId: string
  private userId?: string
  private isInitialized = false
  private performanceObserver?: PerformanceObserver
  private errorQueue: Array<{ error: Error; context: ErrorContext }> = []
  private metricsQueue: PerformanceMetric[] = []
  private eventsQueue: CustomEvent[] = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeErrorHandling()
  }

  /**
   * Initialize monitoring service
   */
  async initialize(config: {
    sentryDsn?: string
    apiEndpoint?: string
    userId?: string
    environment?: string
    buildVersion?: string
  }) {
    if (this.isInitialized) return

    this.userId = config.userId
    
    // Initialize Sentry if DSN is provided
    if (config.sentryDsn && typeof window !== 'undefined') {
      await this.initializeSentry(config.sentryDsn, {
        environment: config.environment || 'production',
        release: config.buildVersion || 'unknown'
      })
    }

    // Initialize Web Vitals monitoring
    this.initializeWebVitals()

    // Initialize performance monitoring
    this.initializePerformanceMonitoring()

    // Initialize custom analytics
    this.initializeAnalytics(config.apiEndpoint)

    // Start periodic reporting
    this.startPeriodicReporting()

    this.isInitialized = true
    console.log('🔍 Monitoring service initialized')
  }

  /**
   * Initialize Sentry error tracking
   */
  private async initializeSentry(dsn: string, options: { environment: string; release: string }) {
    try {
      // Dynamic import to avoid bundling Sentry if not needed
      const Sentry = await import('@sentry/react')
      
      Sentry.init({
        dsn,
        environment: options.environment,
        release: options.release,
        integrations: [
          new Sentry.BrowserTracing({
            // Set sampling rate for performance monitoring
            tracePropagationTargets: ['localhost', /^https:\/\/[^\/]*\.pnrtracker\.com/],
          }),
          new Sentry.Replay({
            // Capture 10% of sessions for replay
            sessionSampleRate: 0.1,
            // Capture 100% of sessions with errors for replay
            errorSampleRate: 1.0,
          }),
        ],
        // Performance monitoring sample rate
        tracesSampleRate: 0.1,
        // Session replay sample rate
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        beforeSend: (event, hint) => {
          // Filter out non-critical errors
          if (this.shouldIgnoreError(hint.originalException)) {
            return null
          }
          
          // Add custom context
          event.contexts = {
            ...event.contexts,
            custom: {
              sessionId: this.sessionId,
              userId: this.userId,
              buildVersion: options.release,
            }
          }
          
          return event
        },
      })

      // Set user context
      if (this.userId) {
        Sentry.setUser({ id: this.userId })
      }

      console.log('✅ Sentry initialized')
    } catch (error) {
      console.warn('Failed to initialize Sentry:', error)
    }
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals() {
    const reportMetric = (metric: Metric) => {
      const rating = this.getMetricRating(metric.name, metric.value)
      
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating,
        timestamp: Date.now(),
        url: window.location.href,
      }

      this.metricsQueue.push(performanceMetric)
      
      // Report to console in development
      if (import.meta.env.DEV) {
        console.log(`📊 ${metric.name}:`, metric.value, `(${rating})`)
      }
    }

    // Collect Core Web Vitals
    getCLS(reportMetric)
    getFCP(reportMetric)
    getFID(reportMetric)
    getLCP(reportMetric)
    getTTFB(reportMetric)
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring() {
    if (!('PerformanceObserver' in window)) return

    // Monitor long tasks
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            this.trackEvent('performance_long_task', {
              duration: entry.duration,
              startTime: entry.startTime,
              url: window.location.href,
            })
          }
        })
      })

      this.performanceObserver.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('Failed to initialize performance observer:', error)
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        if (memory) {
          this.trackEvent('memory_usage', {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            timestamp: Date.now(),
          })
        }
      }, 30000) // Every 30 seconds
    }
  }

  /**
   * Initialize custom analytics
   */
  private initializeAnalytics(apiEndpoint?: string) {
    // Track page views
    this.trackPageView()

    // Track navigation
    if ('navigation' in performance) {
      const navigation = performance.navigation
      this.trackEvent('navigation', {
        type: navigation.type,
        redirectCount: navigation.redirectCount,
      })
    }

    // Track connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.trackEvent('connection_info', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      })
    }
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
      })
    })

    // React error boundary integration
    window.addEventListener('react-error', ((event: CustomEvent) => {
      this.captureError(event.detail.error, {
        type: 'react_error',
        componentStack: event.detail.componentStack,
        errorBoundary: event.detail.errorBoundary,
      })
    }) as EventListener)
  }

  /**
   * Capture and report errors
   */
  captureError(error: Error, context: Record<string, any> = {}) {
    const errorContext: ErrorContext = {
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
      buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown',
      environment: import.meta.env.VITE_ENVIRONMENT || 'production',
      ...context,
    }

    this.errorQueue.push({ error, context: errorContext })

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('🚨 Error captured:', error, errorContext)
    }
  }

  /**
   * Track custom events
   */
  trackEvent(name: string, properties: Record<string, any> = {}) {
    const event: CustomEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    }

    this.eventsQueue.push(event)

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`📈 Event tracked: ${name}`, properties)
    }
  }

  /**
   * Track page views
   */
  trackPageView(path?: string) {
    this.trackEvent('page_view', {
      path: path || window.location.pathname,
      referrer: document.referrer,
      title: document.title,
    })
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(action: string, element: string, properties: Record<string, any> = {}) {
    this.trackEvent('user_interaction', {
      action,
      element,
      ...properties,
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(name: string, value: number, unit: string = 'ms') {
    const rating = this.getMetricRating(name, value)
    
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
    }

    this.metricsQueue.push(metric)
  }

  /**
   * Set user context
   */
  setUser(userId: string, properties: Record<string, any> = {}) {
    this.userId = userId
    
    this.trackEvent('user_identified', {
      userId,
      ...properties,
    })
  }

  /**
   * Start periodic reporting to backend
   */
  private startPeriodicReporting() {
    // Report every 30 seconds
    setInterval(() => {
      this.flushQueues()
    }, 30000)

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.flushQueues(true)
    })

    // Report on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushQueues(true)
      }
    })
  }

  /**
   * Flush all queued data to backend
   */
  private async flushQueues(useBeacon = false) {
    if (this.errorQueue.length === 0 && this.metricsQueue.length === 0 && this.eventsQueue.length === 0) {
      return
    }

    const payload = {
      errors: [...this.errorQueue],
      metrics: [...this.metricsQueue],
      events: [...this.eventsQueue],
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    }

    // Clear queues
    this.errorQueue = []
    this.metricsQueue = []
    this.eventsQueue = []

    try {
      const apiEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT || '/api/monitoring'
      
      if (useBeacon && 'sendBeacon' in navigator) {
        // Use beacon for reliable delivery on page unload
        navigator.sendBeacon(apiEndpoint, JSON.stringify(payload))
      } else {
        // Use fetch for regular reporting
        await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }
    } catch (error) {
      console.warn('Failed to send monitoring data:', error)
      // Re-queue the data for next attempt
      this.errorQueue.push(...payload.errors)
      this.metricsQueue.push(...payload.metrics)
      this.eventsQueue.push(...payload.events)
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Determine metric rating based on thresholds
   */
  private getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      'CLS': { good: 0.1, poor: 0.25 },
      'FCP': { good: 1800, poor: 3000 },
      'FID': { good: 100, poor: 300 },
      'LCP': { good: 2500, poor: 4000 },
      'TTFB': { good: 800, poor: 1800 },
    }

    const threshold = thresholds[name]
    if (!threshold) return 'good'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(error: any): boolean {
    if (!error) return true

    const message = error.message || error.toString()
    
    // Ignore common non-critical errors
    const ignoredPatterns = [
      /Script error/i,
      /Non-Error promise rejection captured/i,
      /ResizeObserver loop limit exceeded/i,
      /Network request failed/i,
      /Loading chunk \d+ failed/i,
      /ChunkLoadError/i,
    ]

    return ignoredPatterns.some(pattern => pattern.test(message))
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    
    // Flush remaining data
    this.flushQueues(true)
  }
}

// Create singleton instance
export const monitoring = new MonitoringService()

// React Error Boundary integration
export class ErrorBoundary extends Error {
  componentStack?: string
  errorBoundary?: string

  constructor(message: string, componentStack?: string, errorBoundary?: string) {
    super(message)
    this.name = 'ErrorBoundary'
    this.componentStack = componentStack
    this.errorBoundary = errorBoundary
  }
}

// Hook for React components
export function useMonitoring() {
  return {
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackUserInteraction: monitoring.trackUserInteraction.bind(monitoring),
    trackPerformance: monitoring.trackPerformance.bind(monitoring),
    captureError: monitoring.captureError.bind(monitoring),
    setUser: monitoring.setUser.bind(monitoring),
  }
}

export default monitoring