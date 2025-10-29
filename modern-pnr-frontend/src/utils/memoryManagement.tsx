// Memory management and leak detection utilities
import React, { useEffect } from 'react'
export interface MemoryMetrics {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

export interface MemoryLeak {
  type: 'listener' | 'timer' | 'observer' | 'reference'
  description: string
  severity: 'low' | 'medium' | 'high'
  timestamp: number
}

export class MemoryManager {
  private metrics: MemoryMetrics[] = []
  private leaks: MemoryLeak[] = []
  private timers = new Set<number>()
  private intervals = new Set<number>()
  private observers = new Set<IntersectionObserver | MutationObserver | ResizeObserver>()
  private eventListeners = new Map<EventTarget, Map<string, EventListener[]>>()
  private abortControllers = new Set<AbortController>()

  // Track memory usage over time
  startMemoryMonitoring(interval = 5000) {
    if (!this.isMemoryAPIAvailable()) {
      console.warn('Memory API not available')
      return
    }

    const monitoringInterval = setInterval(() => {
      this.recordMemoryMetrics()
      this.detectMemoryLeaks()
    }, interval)

    this.intervals.add(monitoringInterval)
    return monitoringInterval
  }

  stopMemoryMonitoring(intervalId: number) {
    clearInterval(intervalId)
    this.intervals.delete(intervalId)
  }

  // Record current memory metrics
  recordMemoryMetrics() {
    if (!this.isMemoryAPIAvailable()) return

    const memory = (performance as any).memory
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }

    this.metrics.push(metrics)
    
    // Keep only last 100 measurements
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }
  }

  // Detect potential memory leaks
  detectMemoryLeaks() {
    if (this.metrics.length < 10) return

    const recent = this.metrics.slice(-10)
    const trend = this.calculateMemoryTrend(recent)

    // Check for consistent memory growth
    if (trend > 1024 * 1024) { // 1MB growth trend
      this.leaks.push({
        type: 'reference',
        description: `Consistent memory growth detected: ${this.formatBytes(trend)}/measurement`,
        severity: 'high',
        timestamp: Date.now()
      })
    }

    // Check for excessive timer/interval usage
    if (this.timers.size + this.intervals.size > 50) {
      this.leaks.push({
        type: 'timer',
        description: `Excessive timers/intervals: ${this.timers.size + this.intervals.size}`,
        severity: 'medium',
        timestamp: Date.now()
      })
    }

    // Check for excessive observers
    if (this.observers.size > 20) {
      this.leaks.push({
        type: 'observer',
        description: `Excessive observers: ${this.observers.size}`,
        severity: 'medium',
        timestamp: Date.now()
      })
    }

    // Check for excessive event listeners
    let totalListeners = 0
    this.eventListeners.forEach(listeners => {
      listeners.forEach(listenerArray => {
        totalListeners += listenerArray.length
      })
    })

    if (totalListeners > 100) {
      this.leaks.push({
        type: 'listener',
        description: `Excessive event listeners: ${totalListeners}`,
        severity: 'medium',
        timestamp: Date.now()
      })
    }
  }

  // Safe timer management
  setTimeout(callback: () => void, delay: number): number {
    const timerId = window.setTimeout(() => {
      callback()
      this.timers.delete(timerId)
    }, delay)
    
    this.timers.add(timerId)
    return timerId
  }

  setInterval(callback: () => void, delay: number): number {
    const intervalId = window.setInterval(callback, delay)
    this.intervals.add(intervalId)
    return intervalId
  }

  clearTimeout(timerId: number) {
    window.clearTimeout(timerId)
    this.timers.delete(timerId)
  }

  clearInterval(intervalId: number) {
    window.clearInterval(intervalId)
    this.intervals.delete(intervalId)
  }

  // Safe observer management
  createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    const observer = new IntersectionObserver(callback, options)
    this.observers.add(observer)
    return observer
  }

  createMutationObserver(callback: MutationCallback): MutationObserver {
    const observer = new MutationObserver(callback)
    this.observers.add(observer)
    return observer
  }

  createResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
    const observer = new ResizeObserver(callback)
    this.observers.add(observer)
    return observer
  }

  disconnectObserver(observer: IntersectionObserver | MutationObserver | ResizeObserver) {
    observer.disconnect()
    this.observers.delete(observer)
  }

  // Safe event listener management
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) {
    target.addEventListener(type, listener, options)
    
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Map())
    }
    
    const targetListeners = this.eventListeners.get(target)!
    if (!targetListeners.has(type)) {
      targetListeners.set(type, [])
    }
    
    targetListeners.get(type)!.push(listener)
  }

  removeEventListener(target: EventTarget, type: string, listener: EventListener) {
    target.removeEventListener(type, listener)
    
    const targetListeners = this.eventListeners.get(target)
    if (targetListeners) {
      const typeListeners = targetListeners.get(type)
      if (typeListeners) {
        const index = typeListeners.indexOf(listener)
        if (index > -1) {
          typeListeners.splice(index, 1)
        }
        
        if (typeListeners.length === 0) {
          targetListeners.delete(type)
        }
      }
      
      if (targetListeners.size === 0) {
        this.eventListeners.delete(target)
      }
    }
  }

  // AbortController management
  createAbortController(): AbortController {
    const controller = new AbortController()
    this.abortControllers.add(controller)
    return controller
  }

  abortController(controller: AbortController) {
    controller.abort()
    this.abortControllers.delete(controller)
  }

  // Cleanup all managed resources
  cleanup() {
    // Clear all timers
    this.timers.forEach(timerId => window.clearTimeout(timerId))
    this.timers.clear()

    // Clear all intervals
    this.intervals.forEach(intervalId => window.clearInterval(intervalId))
    this.intervals.clear()

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()

    // Remove all event listeners
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach((listenerArray, type) => {
        listenerArray.forEach(listener => {
          target.removeEventListener(type, listener)
        })
      })
    })
    this.eventListeners.clear()

    // Abort all controllers
    this.abortControllers.forEach(controller => controller.abort())
    this.abortControllers.clear()
  }

  // Get memory statistics
  getMemoryStats() {
    if (this.metrics.length === 0) return null

    const latest = this.metrics[this.metrics.length - 1]
    const trend = this.metrics.length > 1 ? this.calculateMemoryTrend(this.metrics.slice(-10)) : 0

    return {
      current: latest,
      trend,
      leaks: this.leaks,
      managedResources: {
        timers: this.timers.size,
        intervals: this.intervals.size,
        observers: this.observers.size,
        eventListeners: Array.from(this.eventListeners.values()).reduce(
          (total, listeners) => total + Array.from(listeners.values()).reduce(
            (sum, arr) => sum + arr.length, 0
          ), 0
        ),
        abortControllers: this.abortControllers.size
      }
    }
  }

  private calculateMemoryTrend(metrics: MemoryMetrics[]): number {
    if (metrics.length < 2) return 0

    const first = metrics[0].usedJSHeapSize
    const last = metrics[metrics.length - 1].usedJSHeapSize
    
    return (last - first) / metrics.length
  }

  private isMemoryAPIAvailable(): boolean {
    return 'memory' in performance
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager()

// React hook for memory management
export function useMemoryManagement() {
  const [stats, setStats] = useState(memoryManager.getMemoryStats())

  useEffect(() => {
    const intervalId = memoryManager.startMemoryMonitoring(5000)
    
    const updateStats = () => {
      setStats(memoryManager.getMemoryStats())
    }

    const statsInterval = setInterval(updateStats, 5000)

    return () => {
      if (intervalId) {
        memoryManager.stopMemoryMonitoring(intervalId)
      }
      clearInterval(statsInterval)
    }
  }, [])

  return {
    stats,
    cleanup: () => memoryManager.cleanup(),
    createAbortController: () => memoryManager.createAbortController(),
    setTimeout: (callback: () => void, delay: number) => memoryManager.setTimeout(callback, delay),
    setInterval: (callback: () => void, delay: number) => memoryManager.setInterval(callback, delay),
    clearTimeout: (id: number) => memoryManager.clearTimeout(id),
    clearInterval: (id: number) => memoryManager.clearInterval(id)
  }
}

// Component wrapper for automatic cleanup
export function withMemoryManagement<P extends object>(
  Component: React.ComponentType<P>
) {
  return function MemoryManagedComponent(props: P) {
    useEffect(() => {
      return () => {
        // Cleanup on unmount
        memoryManager.cleanup()
      }
    }, [])

    return <Component {...props} />
  }
}