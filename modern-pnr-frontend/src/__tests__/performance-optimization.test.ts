import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { bundleAnalyzer } from '../utils/bundleAnalyzer'
import { memoryManager } from '../utils/memoryManagement'
import { webVitalsMonitor } from '../utils/webVitals'
import { budgetChecker } from '../utils/performanceBudgets'

// Mock performance APIs
const mockPerformance = {
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 20 * 1024 * 1024, // 20MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  },
  timing: {
    navigationStart: 1000,
    loadEventEnd: 2000,
    domContentLoadedEventEnd: 1500
  }
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
})

describe('Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    memoryManager.cleanup()
  })

  describe('Bundle Analysis', () => {
    it('should analyze bundle stats correctly', () => {
      const mockStats = {
        chunks: [
          {
            name: 'main',
            size: 100 * 1024, // 100KB
            isEntry: true,
            modules: ['src/main.tsx', 'src/App.tsx']
          },
          {
            name: 'vendor',
            size: 200 * 1024, // 200KB
            isEntry: false,
            modules: ['node_modules/react', 'node_modules/react-dom']
          }
        ],
        assets: [
          { name: 'main.js', size: 100 * 1024 },
          { name: 'vendor.js', size: 200 * 1024 }
        ]
      }

      const result = bundleAnalyzer.analyzeBundleStats(mockStats)

      expect(result.totalSize).toBe(300 * 1024)
      expect(result.chunks).toHaveLength(2)
      expect(result.assets).toHaveLength(2)
      expect(result.gzippedSize).toBeLessThan(result.totalSize)
    })

    it('should detect budget violations', () => {
      const stats = {
        totalSize: 600 * 1024, // 600KB - exceeds 500KB budget
        gzippedSize: 200 * 1024,
        chunks: [
          {
            name: 'large-chunk',
            size: 150 * 1024, // 150KB - exceeds 100KB budget
            gzippedSize: 50 * 1024,
            modules: [],
            isEntry: true,
            isAsync: false
          }
        ],
        assets: [],
        timestamp: Date.now()
      }

      const result = bundleAnalyzer.checkBudgets(stats)

      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(2) // Total size + chunk size
      expect(result.violations[0].type).toBe('total-size')
      expect(result.violations[1].type).toBe('chunk-size')
    })

    it('should generate optimization recommendations', () => {
      const stats = {
        totalSize: 300 * 1024,
        gzippedSize: 100 * 1024,
        chunks: [
          {
            name: 'large-chunk',
            size: 80 * 1024, // Large but under budget
            gzippedSize: 25 * 1024,
            modules: ['module1', 'module2', 'module1'], // Duplicate module
            isEntry: true,
            isAsync: false
          }
        ],
        assets: [
          { name: 'large-image.png', size: 30 * 1024, type: 'image' as const }
        ],
        timestamp: Date.now()
      }

      const recommendations = bundleAnalyzer.generateRecommendations(stats)

      expect(recommendations).toHaveLength(2)
      expect(recommendations[0].type).toBe('code-splitting')
      expect(recommendations[1].type).toBe('asset-optimization')
    })
  })

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      memoryManager.recordMemoryMetrics()
      const stats = memoryManager.getMemoryStats()

      expect(stats).toBeDefined()
      expect(stats?.current.usedJSHeapSize).toBe(10 * 1024 * 1024)
      expect(stats?.managedResources.timers).toBe(0)
    })

    it('should manage timers safely', () => {
      const callback = vi.fn()
      const timerId = memoryManager.setTimeout(callback, 100)

      expect(typeof timerId).toBe('number')
      
      const stats = memoryManager.getMemoryStats()
      expect(stats?.managedResources.timers).toBe(1)

      memoryManager.clearTimeout(timerId)
      const updatedStats = memoryManager.getMemoryStats()
      expect(updatedStats?.managedResources.timers).toBe(0)
    })

    it('should detect memory leaks', async () => {
      // Simulate memory growth
      const originalMemory = mockPerformance.memory.usedJSHeapSize
      
      // Create multiple measurements with increasing memory
      for (let i = 0; i < 15; i++) {
        mockPerformance.memory.usedJSHeapSize = originalMemory + (i * 1024 * 1024)
        memoryManager.recordMemoryMetrics()
      }

      memoryManager.detectMemoryLeaks()
      const stats = memoryManager.getMemoryStats()

      expect(stats?.leaks.length).toBeGreaterThan(0)
      expect(stats?.leaks[0].type).toBe('reference')
      expect(stats?.leaks[0].severity).toBe('high')
    })

    it('should cleanup all resources', () => {
      // Create some resources
      memoryManager.setTimeout(() => {}, 1000)
      memoryManager.setInterval(() => {}, 1000)
      const observer = memoryManager.createIntersectionObserver(() => {})
      const controller = memoryManager.createAbortController()

      let stats = memoryManager.getMemoryStats()
      expect(stats?.managedResources.timers).toBe(1)
      expect(stats?.managedResources.intervals).toBe(1)
      expect(stats?.managedResources.observers).toBe(1)
      expect(stats?.managedResources.abortControllers).toBe(1)

      memoryManager.cleanup()

      stats = memoryManager.getMemoryStats()
      expect(stats?.managedResources.timers).toBe(0)
      expect(stats?.managedResources.intervals).toBe(0)
      expect(stats?.managedResources.observers).toBe(0)
      expect(stats?.managedResources.abortControllers).toBe(0)
    })
  })

  describe('Performance Budgets', () => {
    it('should check budgets correctly', () => {
      const metrics = {
        FCP: 1500, // Good - under 1800ms budget
        LCP: 3000, // Bad - over 2500ms budget
        FID: 80,   // Good - under 100ms budget
        CLS: 0.15, // Bad - over 0.1 budget
        MAIN_BUNDLE: 200 * 1024, // Good - under 250KB budget
        TOTAL_BUNDLE: 1200 * 1024 // Bad - over 1000KB budget
      }

      const report = budgetChecker.checkBudgets(metrics)

      expect(report.passed).toBe(false)
      expect(report.summary.passed).toBe(3) // FCP, FID, MAIN_BUNDLE
      expect(report.summary.failed).toBe(3) // LCP, CLS, TOTAL_BUNDLE
      expect(report.summary.errors).toBeGreaterThan(0)
    })

    it('should generate readable report', () => {
      const metrics = {
        FCP: 2000, // Over budget
        LCP: 2000, // Under budget
        FID: 150,  // Over budget
        CLS: 0.05  // Under budget
      }

      const budgetReport = budgetChecker.checkBudgets(metrics)
      const textReport = budgetChecker.generateReport(budgetReport)

      expect(textReport).toContain('Performance Budget Report')
      expect(textReport).toContain('❌ Failed Budgets:')
      expect(textReport).toContain('✅ Passed Budgets:')
      expect(textReport).toContain('First Contentful Paint')
      expect(textReport).toContain('First Input Delay')
    })

    it('should export CI-compatible report', () => {
      const metrics = {
        FCP: 2000, // Over budget - error
        TTFB: 1000 // Over budget - warning
      }

      const budgetReport = budgetChecker.checkBudgets(metrics)
      const ciReport = budgetChecker.exportToCI(budgetReport)

      expect(ciReport.success).toBe(false)
      expect(ciReport.exitCode).toBe(1) // Has errors
      expect(ciReport.annotations).toHaveLength(2)
      expect(ciReport.annotations[0].level).toBe('failure')
      expect(ciReport.annotations[1].level).toBe('warning')
    })
  })

  describe('Web Vitals Monitoring', () => {
    it('should calculate performance score', () => {
      // Mock good metrics
      webVitalsMonitor['metrics'] = {
        CLS: 0.05,  // Good
        FID: 50,    // Good
        FCP: 1500,  // Good
        LCP: 2000,  // Good
        TTFB: 600,  // Good
        timestamp: Date.now()
      }

      const score = webVitalsMonitor.getPerformanceScore()
      expect(score).toBe(100)
    })

    it('should generate performance report with issues', () => {
      // Mock poor metrics
      webVitalsMonitor['metrics'] = {
        CLS: 0.3,   // Poor
        FID: 200,   // Poor
        FCP: 1000,  // Good
        LCP: 1500,  // Good
        TTFB: 500,  // Good
        timestamp: Date.now()
      }

      const report = webVitalsMonitor.generateReport()

      expect(report.score).toBeLessThan(100)
      expect(report.issues.length).toBeGreaterThan(0)
      expect(report.recommendations.length).toBeGreaterThan(0)
      
      const clsIssue = report.issues.find(issue => issue.metric === 'CLS')
      expect(clsIssue?.severity).toBe('high')
    })
  })
})