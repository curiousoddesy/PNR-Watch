// Error tracking and performance regression detection
export interface ErrorReport {
  id: string
  message: string
  stack?: string
  url: string
  line?: number
  column?: number
  timestamp: number
  userAgent: string
  userId?: string
  sessionId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context: Record<string, any>
  performance?: PerformanceSnapshot
}

export interface PerformanceSnapshot {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  timing?: {
    navigationStart: number
    loadEventEnd: number
    domContentLoadedEventEnd: number
  }
  vitals?: {
    CLS?: number
    FID?: number
    FCP?: number
    LCP?: number
    TTFB?: number
  }
}

export interface PerformanceRegression {
  metric: string
  baseline: number
  current: number
  degradation: number
  timestamp: number
  severity: 'minor' | 'moderate' | 'severe'
}

export class ErrorTracker {
  private sessionId: string
  private userId?: string
  private reportingEndpoint?: string
  private errorQueue: ErrorReport[] = []
  private performanceBaseline = new Map<string, number>()
  private regressionThresholds = {
    minor: 0.1,    // 10% degradation
    moderate: 0.25, // 25% degradation
    severe: 0.5     // 50% degradation
  }

  constructor(config: {
    reportingEndpoint?: string
    userId?: string
    autoReport?: boolean
  } = {}) {
    this.sessionId = this.generateSessionId()
    this.userId = config.userId
    this.reportingEndpoint = config.reportingEndpoint

    if (config.autoReport !== false) {
      this.initializeErrorHandling()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        severity: 'high',
        context: {
          type: 'javascript',
          target: event.target?.tagName
        }
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        severity: 'high',
        context: {
          type: 'promise',
          reason: event.reason
        }
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureError({
          message: `Resource failed to load: ${(event.target as any)?.src || (event.target as any)?.href}`,
          severity: 'medium',
          context: {
            type: 'resource',
            tagName: (event.target as any)?.tagName,
            src: (event.target as any)?.src,
            href: (event.target as any)?.href
          }
        })
      }
    }, true)

    // Performance observer for long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'longtask' && entry.duration > 50) {
              this.captureError({
                message: `Long task detected: ${entry.duration}ms`,
                severity: 'medium',
                context: {
                  type: 'performance',
                  duration: entry.duration,
                  startTime: entry.startTime
                }
              })
            }
          })
        })
        observer.observe({ entryTypes: ['longtask'] })
      } catch (error) {
        console.warn('Long task observer not supported')
      }
    }
  }

  captureError(error: Partial<ErrorReport>): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const errorReport: ErrorReport = {
      id: errorId,
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: error.url || window.location.href,
      line: error.line,
      column: error.column,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      userId: this.userId,
      sessionId: this.sessionId,
      severity: error.severity || 'medium',
      context: error.context || {},
      performance: this.capturePerformanceSnapshot()
    }

    this.errorQueue.push(errorReport)

    // Auto-report critical errors immediately
    if (errorReport.severity === 'critical') {
      this.reportError(errorReport)
    } else {
      // Batch report other errors
      this.scheduleErrorReporting()
    }

    return errorId
  }

  private capturePerformanceSnapshot(): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {}

    // Memory information
    if ('memory' in performance) {
      const memory = (performance as any).memory
      snapshot.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }

    // Navigation timing
    if ('timing' in performance) {
      const timing = performance.timing
      snapshot.timing = {
        navigationStart: timing.navigationStart,
        loadEventEnd: timing.loadEventEnd,
        domContentLoadedEventEnd: timing.domContentLoadedEventEnd
      }
    }

    return snapshot
  }

  private scheduleErrorReporting() {
    // Debounced error reporting
    if (!this.reportingTimeout) {
      this.reportingTimeout = setTimeout(() => {
        this.flushErrorQueue()
        this.reportingTimeout = null
      }, 5000) // Report errors every 5 seconds
    }
  }

  private reportingTimeout: NodeJS.Timeout | null = null

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0 || !this.reportingEndpoint) return

    const errors = [...this.errorQueue]
    this.errorQueue = []

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors,
          sessionId: this.sessionId,
          timestamp: Date.now()
        }),
      })
    } catch (error) {
      console.warn('Failed to report errors:', error)
      // Re-queue errors for retry
      this.errorQueue.unshift(...errors)
    }
  }

  private async reportError(error: ErrorReport) {
    if (!this.reportingEndpoint) return

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: [error],
          sessionId: this.sessionId,
          timestamp: Date.now()
        }),
      })
    } catch (reportingError) {
      console.warn('Failed to report critical error:', reportingError)
    }
  }

  // Performance regression detection
  setPerformanceBaseline(metric: string, value: number) {
    this.performanceBaseline.set(metric, value)
  }

  checkPerformanceRegression(metric: string, currentValue: number): PerformanceRegression | null {
    const baseline = this.performanceBaseline.get(metric)
    if (!baseline) return null

    const degradation = (currentValue - baseline) / baseline

    let severity: 'minor' | 'moderate' | 'severe'
    if (degradation >= this.regressionThresholds.severe) {
      severity = 'severe'
    } else if (degradation >= this.regressionThresholds.moderate) {
      severity = 'moderate'
    } else if (degradation >= this.regressionThresholds.minor) {
      severity = 'minor'
    } else {
      return null // No significant regression
    }

    const regression: PerformanceRegression = {
      metric,
      baseline,
      current: currentValue,
      degradation,
      timestamp: Date.now(),
      severity
    }

    // Report regression as an error
    this.captureError({
      message: `Performance regression detected: ${metric}`,
      severity: severity === 'severe' ? 'high' : 'medium',
      context: {
        type: 'performance-regression',
        regression
      }
    })

    return regression
  }

  // User interaction tracking
  trackUserInteraction(action: string, element?: string, metadata?: Record<string, any>) {
    if (this.reportingEndpoint) {
      fetch(this.reportingEndpoint.replace('/errors', '/interactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          element,
          metadata,
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href
        }),
      }).catch(error => {
        console.warn('Failed to track user interaction:', error)
      })
    }
  }

  // Get error statistics
  getErrorStats() {
    const now = Date.now()
    const last24Hours = now - (24 * 60 * 60 * 1000)
    
    const recentErrors = this.errorQueue.filter(error => error.timestamp > last24Hours)
    
    const severityCount = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: recentErrors.length,
      bySeverity: severityCount,
      sessionId: this.sessionId,
      userId: this.userId
    }
  }

  // Manual error reporting
  reportManualError(message: string, context?: Record<string, any>, severity: ErrorReport['severity'] = 'medium') {
    return this.captureError({
      message,
      context: { ...context, manual: true },
      severity
    })
  }

  // Set user context
  setUser(userId: string, metadata?: Record<string, any>) {
    this.userId = userId
    
    if (metadata && this.reportingEndpoint) {
      fetch(this.reportingEndpoint.replace('/errors', '/user-context'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId: this.sessionId,
          metadata,
          timestamp: Date.now()
        }),
      }).catch(error => {
        console.warn('Failed to set user context:', error)
      })
    }
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker({
  autoReport: true
})

// React hook for error tracking
export function useErrorTracking() {
  const reportError = (error: Error | string, context?: Record<string, any>) => {
    const message = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'object' ? error.stack : undefined
    
    return errorTracker.captureError({
      message,
      stack,
      context,
      severity: 'medium'
    })
  }

  const trackInteraction = (action: string, element?: string, metadata?: Record<string, any>) => {
    errorTracker.trackUserInteraction(action, element, metadata)
  }

  return {
    reportError,
    trackInteraction,
    setUser: errorTracker.setUser.bind(errorTracker),
    getStats: errorTracker.getErrorStats.bind(errorTracker)
  }
}