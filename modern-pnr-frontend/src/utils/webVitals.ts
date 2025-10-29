import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals'

export interface WebVitalsMetrics {
  CLS: number | null // Cumulative Layout Shift
  FID: number | null // First Input Delay
  FCP: number | null // First Contentful Paint
  LCP: number | null // Largest Contentful Paint
  TTFB: number | null // Time to First Byte
  timestamp: number
}

export interface PerformanceThresholds {
  CLS: { good: number; needsImprovement: number }
  FID: { good: number; needsImprovement: number }
  FCP: { good: number; needsImprovement: number }
  LCP: { good: number; needsImprovement: number }
  TTFB: { good: number; needsImprovement: number }
}

// Web Vitals thresholds (in milliseconds, except CLS which is unitless)
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 }
}

export class WebVitalsMonitor {
  private metrics: WebVitalsMetrics = {
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
    timestamp: Date.now()
  }
  
  private listeners: Array<(metrics: WebVitalsMetrics) => void> = []
  private thresholds: PerformanceThresholds
  private reportingEndpoint?: string

  constructor(thresholds = DEFAULT_THRESHOLDS, reportingEndpoint?: string) {
    this.thresholds = thresholds
    this.reportingEndpoint = reportingEndpoint
    this.initializeMonitoring()
  }

  private initializeMonitoring() {
    // Monitor Core Web Vitals
    getCLS(this.handleMetric.bind(this, 'CLS'))
    getFID(this.handleMetric.bind(this, 'FID'))
    getFCP(this.handleMetric.bind(this, 'FCP'))
    getLCP(this.handleMetric.bind(this, 'LCP'))
    getTTFB(this.handleMetric.bind(this, 'TTFB'))

    // Monitor additional performance metrics
    this.monitorCustomMetrics()
  }

  private handleMetric(name: keyof WebVitalsMetrics, metric: Metric) {
    this.metrics[name] = metric.value
    this.metrics.timestamp = Date.now()

    // Notify listeners
    this.listeners.forEach(listener => listener({ ...this.metrics }))

    // Report to analytics endpoint
    if (this.reportingEndpoint) {
      this.reportMetric(name, metric)
    }

    // Log performance issues
    this.checkPerformanceThresholds(name, metric.value)
  }

  private async reportMetric(name: string, metric: Metric) {
    try {
      await fetch(this.reportingEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          value: metric.value,
          id: metric.id,
          delta: metric.delta,
          entries: metric.entries,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: (navigator as any).connection?.effectiveType,
        }),
      })
    } catch (error) {
      console.warn('Failed to report Web Vitals metric:', error)
    }
  }

  private checkPerformanceThresholds(name: keyof WebVitalsMetrics, value: number) {
    const threshold = this.thresholds[name]
    if (!threshold) return

    let status: 'good' | 'needs-improvement' | 'poor'
    
    if (value <= threshold.good) {
      status = 'good'
    } else if (value <= threshold.needsImprovement) {
      status = 'needs-improvement'
    } else {
      status = 'poor'
    }

    if (status !== 'good') {
      console.warn(`Performance issue detected: ${name} = ${value} (${status})`)
      
      // Trigger performance alert
      this.triggerPerformanceAlert(name, value, status)
    }
  }

  private triggerPerformanceAlert(metric: string, value: number, status: string) {
    // Custom event for performance alerts
    window.dispatchEvent(new CustomEvent('performance-alert', {
      detail: { metric, value, status, timestamp: Date.now() }
    }))
  }

  private monitorCustomMetrics() {
    // Monitor navigation timing
    if ('navigation' in performance && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0]
        
        // Calculate additional metrics
        const domContentLoaded = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart
        const domComplete = nav.domComplete - nav.navigationStart
        const loadComplete = nav.loadEventEnd - nav.navigationStart

        // Report custom metrics
        this.reportCustomMetric('DOM_CONTENT_LOADED', domContentLoaded)
        this.reportCustomMetric('DOM_COMPLETE', domComplete)
        this.reportCustomMetric('LOAD_COMPLETE', loadComplete)
      }
    }

    // Monitor resource timing
    this.monitorResourceTiming()

    // Monitor long tasks
    this.monitorLongTasks()
  }

  private monitorResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming
            
            // Check for slow resources
            if (resource.duration > 1000) { // > 1 second
              console.warn(`Slow resource detected: ${resource.name} (${resource.duration}ms)`)
              
              this.reportCustomMetric('SLOW_RESOURCE', resource.duration, {
                name: resource.name,
                type: resource.initiatorType
              })
            }
          }
        })
      })

      observer.observe({ entryTypes: ['resource'] })
    }
  }

  private monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            console.warn(`Long task detected: ${entry.duration}ms`)
            
            this.reportCustomMetric('LONG_TASK', entry.duration)
          }
        })
      })

      try {
        observer.observe({ entryTypes: ['longtask'] })
      } catch (error) {
        // Long task API not supported
        console.warn('Long task monitoring not supported')
      }
    }
  }

  private reportCustomMetric(name: string, value: number, metadata?: any) {
    if (this.reportingEndpoint) {
      fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          value,
          metadata,
          timestamp: Date.now(),
          url: window.location.href,
          type: 'custom'
        }),
      }).catch(error => {
        console.warn('Failed to report custom metric:', error)
      })
    }
  }

  // Public API
  onMetricsUpdate(callback: (metrics: WebVitalsMetrics) => void) {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getCurrentMetrics(): WebVitalsMetrics {
    return { ...this.metrics }
  }

  getPerformanceScore(): number {
    const scores = Object.entries(this.metrics)
      .filter(([key, value]) => key !== 'timestamp' && value !== null)
      .map(([key, value]) => {
        const threshold = this.thresholds[key as keyof PerformanceThresholds]
        if (!threshold || value === null) return 100

        if (value <= threshold.good) return 100
        if (value <= threshold.needsImprovement) return 75
        return 25
      })

    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  }

  generateReport(): PerformanceReport {
    const score = this.getPerformanceScore()
    const issues: PerformanceIssue[] = []
    const recommendations: string[] = []

    // Analyze each metric
    Object.entries(this.metrics).forEach(([key, value]) => {
      if (key === 'timestamp' || value === null) return

      const threshold = this.thresholds[key as keyof PerformanceThresholds]
      if (!threshold) return

      if (value > threshold.needsImprovement) {
        issues.push({
          metric: key,
          value,
          severity: 'high',
          description: this.getIssueDescription(key, value)
        })
        recommendations.push(...this.getRecommendations(key))
      } else if (value > threshold.good) {
        issues.push({
          metric: key,
          value,
          severity: 'medium',
          description: this.getIssueDescription(key, value)
        })
      }
    })

    return {
      score,
      metrics: this.metrics,
      issues,
      recommendations,
      timestamp: Date.now()
    }
  }

  private getIssueDescription(metric: string, value: number): string {
    switch (metric) {
      case 'CLS':
        return `Layout shifts are causing visual instability (${value.toFixed(3)})`
      case 'FID':
        return `First input delay is too high (${value}ms)`
      case 'FCP':
        return `First contentful paint is slow (${value}ms)`
      case 'LCP':
        return `Largest contentful paint is slow (${value}ms)`
      case 'TTFB':
        return `Time to first byte is slow (${value}ms)`
      default:
        return `Performance issue detected: ${metric} = ${value}`
    }
  }

  private getRecommendations(metric: string): string[] {
    switch (metric) {
      case 'CLS':
        return [
          'Add size attributes to images and videos',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content'
        ]
      case 'FID':
        return [
          'Reduce JavaScript execution time',
          'Split long tasks into smaller chunks',
          'Use web workers for heavy computations'
        ]
      case 'FCP':
        return [
          'Optimize critical rendering path',
          'Reduce server response time',
          'Eliminate render-blocking resources'
        ]
      case 'LCP':
        return [
          'Optimize images and videos',
          'Preload important resources',
          'Reduce server response time'
        ]
      case 'TTFB':
        return [
          'Optimize server performance',
          'Use a CDN',
          'Implement caching strategies'
        ]
      default:
        return []
    }
  }
}

export interface PerformanceReport {
  score: number
  metrics: WebVitalsMetrics
  issues: PerformanceIssue[]
  recommendations: string[]
  timestamp: number
}

export interface PerformanceIssue {
  metric: string
  value: number
  severity: 'low' | 'medium' | 'high'
  description: string
}

// Global Web Vitals monitor instance
export const webVitalsMonitor = new WebVitalsMonitor()

// React hook for Web Vitals monitoring
export function useWebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>(webVitalsMonitor.getCurrentMetrics())
  const [report, setReport] = useState<PerformanceReport | null>(null)

  useEffect(() => {
    const unsubscribe = webVitalsMonitor.onMetricsUpdate(setMetrics)
    
    // Generate initial report
    setReport(webVitalsMonitor.generateReport())
    
    // Update report periodically
    const interval = setInterval(() => {
      setReport(webVitalsMonitor.generateReport())
    }, 10000) // Every 10 seconds

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return {
    metrics,
    report,
    score: webVitalsMonitor.getPerformanceScore()
  }
}