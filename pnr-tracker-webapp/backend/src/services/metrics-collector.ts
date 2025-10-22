/**
 * System Metrics Collector
 * Collects and stores system performance metrics for monitoring and alerting
 */

import { logger } from './logger';
import { errorAlerting, AlertType } from './error-alerting';
import { healthMonitor } from './health-monitor';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: NodeJS.CpuUsage;
    loadAverage: number[];
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usagePercent: number;
  };
  process: {
    uptime: number;
    pid: number;
    version: string;
  };
  requests: {
    total: number;
    errors: number;
    averageResponseTime: number;
  };
  database: {
    activeConnections?: number;
    queryCount?: number;
    averageQueryTime?: number;
  };
}

export interface MetricsThresholds {
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  averageResponseTime: number;
  errorRate: number;
}

export class MetricsCollectorService {
  private static instance: MetricsCollectorService;
  private metrics: SystemMetrics[] = [];
  private requestMetrics: Map<string, { count: number; totalTime: number; errors: number }> = new Map();
  private thresholds: MetricsThresholds;
  private collectionInterval: NodeJS.Timeout | null = null;
  private maxMetricsHistory = 1440; // 24 hours of minute-by-minute data

  private constructor() {
    this.thresholds = {
      memoryUsagePercent: 85,
      cpuUsagePercent: 80,
      averageResponseTime: 2000,
      errorRate: 5 // errors per minute
    };
  }

  public static getInstance(): MetricsCollectorService {
    if (!MetricsCollectorService.instance) {
      MetricsCollectorService.instance = new MetricsCollectorService();
    }
    return MetricsCollectorService.instance;
  }

  /**
   * Start collecting metrics at regular intervals
   */
  public startCollection(intervalMs: number = 60000): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    logger.logSystem('Metrics collection started', {
      interval: intervalMs,
      maxHistory: this.maxMetricsHistory
    });
  }

  /**
   * Stop collecting metrics
   */
  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.logSystem('Metrics collection stopped');
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];

      // Calculate memory usage percentage
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Get request metrics for the last minute
      const currentMinute = Math.floor(Date.now() / 60000);
      const requestStats = this.getRequestStatsForMinute(currentMinute);

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: cpuUsage,
          loadAverage
        },
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
          usagePercent: memoryUsagePercent
        },
        process: {
          uptime: process.uptime(),
          pid: process.pid,
          version: process.version
        },
        requests: requestStats,
        database: await this.getDatabaseMetrics()
      };

      // Store metrics
      this.metrics.push(metrics);

      // Trim old metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Check thresholds and send alerts
      await this.checkThresholds(metrics);

      logger.debug('Metrics collected', {
        memoryUsage: Math.round(memoryUsagePercent * 100) / 100,
        requestCount: requestStats.total,
        errorCount: requestStats.errors
      });

    } catch (error) {
      logger.error('Failed to collect metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get request statistics for a specific minute
   */
  private getRequestStatsForMinute(minute: number): { total: number; errors: number; averageResponseTime: number } {
    const key = minute.toString();
    const stats = this.requestMetrics.get(key);

    if (!stats) {
      return { total: 0, errors: 0, averageResponseTime: 0 };
    }

    return {
      total: stats.count,
      errors: stats.errors,
      averageResponseTime: stats.count > 0 ? stats.totalTime / stats.count : 0
    };
  }

  /**
   * Get database metrics (simplified - would need actual DB pool access)
   */
  private async getDatabaseMetrics(): Promise<{ activeConnections?: number; queryCount?: number; averageQueryTime?: number }> {
    try {
      // This would need to be implemented with actual database pool metrics
      // For now, return empty object
      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Check metrics against thresholds and send alerts
   */
  private async checkThresholds(metrics: SystemMetrics): Promise<void> {
    // Memory usage check
    if (metrics.memory.usagePercent > this.thresholds.memoryUsagePercent) {
      await errorAlerting.sendHighAlert(
        AlertType.HIGH_MEMORY,
        'High Memory Usage Detected',
        `Memory usage is ${Math.round(metrics.memory.usagePercent)}%, exceeding threshold of ${this.thresholds.memoryUsagePercent}%`,
        {
          currentUsage: metrics.memory.usagePercent,
          threshold: this.thresholds.memoryUsagePercent,
          heapUsed: metrics.memory.heapUsed,
          heapTotal: metrics.memory.heapTotal
        }
      );
    }

    // Response time check
    if (metrics.requests.averageResponseTime > this.thresholds.averageResponseTime) {
      await errorAlerting.sendMediumAlert(
        AlertType.SLOW_RESPONSE,
        'Slow Response Time Detected',
        `Average response time is ${Math.round(metrics.requests.averageResponseTime)}ms, exceeding threshold of ${this.thresholds.averageResponseTime}ms`,
        {
          currentResponseTime: metrics.requests.averageResponseTime,
          threshold: this.thresholds.averageResponseTime,
          requestCount: metrics.requests.total
        }
      );
    }

    // Error rate check
    if (metrics.requests.errors > this.thresholds.errorRate) {
      await errorAlerting.sendHighAlert(
        AlertType.HIGH_ERROR_RATE,
        'High Error Rate Detected',
        `Error rate is ${metrics.requests.errors} errors per minute, exceeding threshold of ${this.thresholds.errorRate}`,
        {
          currentErrorRate: metrics.requests.errors,
          threshold: this.thresholds.errorRate,
          totalRequests: metrics.requests.total
        }
      );
    }
  }

  /**
   * Record request metrics
   */
  public recordRequest(responseTime: number, isError: boolean = false): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const key = currentMinute.toString();
    
    const existing = this.requestMetrics.get(key) || { count: 0, totalTime: 0, errors: 0 };
    
    existing.count++;
    existing.totalTime += responseTime;
    if (isError) {
      existing.errors++;
    }
    
    this.requestMetrics.set(key, existing);

    // Clean up old request metrics (keep last 5 minutes)
    const cutoff = currentMinute - 5;
    for (const [metricKey] of this.requestMetrics) {
      if (parseInt(metricKey) < cutoff) {
        this.requestMetrics.delete(metricKey);
      }
    }
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): SystemMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific time range
   */
  public getMetricsInRange(startTime: Date, endTime: Date): SystemMetrics[] {
    return this.metrics.filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Get aggregated metrics for a time period
   */
  public getAggregatedMetrics(minutes: number): {
    averageMemoryUsage: number;
    maxMemoryUsage: number;
    averageResponseTime: number;
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
  } {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(metric => metric.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        maxMemoryUsage: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        totalErrors: 0,
        errorRate: 0
      };
    }

    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.requests.total, 0);
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.requests.errors, 0);
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memory.usagePercent, 0) / recentMetrics.length;
    const maxMemoryUsage = Math.max(...recentMetrics.map(m => m.memory.usagePercent));
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.requests.averageResponseTime, 0) / recentMetrics.length;

    return {
      averageMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
      maxMemoryUsage: Math.round(maxMemoryUsage * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime),
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0
    };
  }

  /**
   * Update thresholds
   */
  public updateThresholds(newThresholds: Partial<MetricsThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.logSystem('Metrics thresholds updated', { thresholds: this.thresholds });
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): MetricsThresholds {
    return { ...this.thresholds };
  }

  /**
   * Clear metrics history
   */
  public clearHistory(): void {
    this.metrics = [];
    this.requestMetrics.clear();
    logger.logSystem('Metrics history cleared');
  }
}

export const metricsCollector = MetricsCollectorService.getInstance();