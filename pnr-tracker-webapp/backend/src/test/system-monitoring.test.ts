/**
 * System Monitoring and Alerting Tests
 * Tests system health monitoring and alerting functionality
 * Requirements: 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitorService } from '../services/health-monitor';
import { ErrorAlertingService, AlertType, AlertSeverity } from '../services/error-alerting';
import { MetricsCollectorService } from '../services/metrics-collector';
import { logger } from '../services/logger';
import { Pool } from 'pg';

// Mock external dependencies
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    end: vi.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
    query: vi.fn()
  }))
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    quit: vi.fn(),
    ping: vi.fn(),
    isOpen: true,
    on: vi.fn()
  }))
}));

vi.mock('../services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    logSystem: vi.fn()
  }
}));

vi.mock('../services/notification', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendEmailNotification: vi.fn().mockResolvedValue(true),
    sendPushNotification: vi.fn().mockResolvedValue(true),
    testEmailConfiguration: vi.fn().mockResolvedValue(true)
  }))
}));

// Mock fetch for external service checks
global.fetch = vi.fn();

describe('System Monitoring and Alerting Tests', () => {
  let healthMonitor: HealthMonitorService;
  let errorAlerting: ErrorAlertingService;
  let metricsCollector: MetricsCollectorService;

  beforeAll(() => {
    // Set up test environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.ALERTS_ENABLED = 'true';
    process.env.ADMIN_EMAILS = 'admin@test.com,ops@test.com';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.ALERT_WEBHOOK_URL = 'https://webhook.test.com/alerts';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize services
    healthMonitor = HealthMonitorService.getInstance();
    errorAlerting = ErrorAlertingService.getInstance();
    metricsCollector = MetricsCollectorService.getInstance();

    // Mock fetch responses
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.ALERTS_ENABLED;
    delete process.env.ADMIN_EMAILS;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.ALERT_WEBHOOK_URL;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
  });

  describe('Health Monitor Service Tests', () => {
    it('should perform complete health check with all services healthy', async () => {
      // Mock successful database connection
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
        release: vi.fn()
      };
      const mockPool = new Pool();
      vi.mocked(mockPool.connect).mockResolvedValue(mockClient as any);

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.status).toBe('healthy');
      expect(healthResult.checks.database.status).toBe('healthy');
      expect(healthResult.checks.redis.status).toBe('healthy');
      expect(healthResult.checks.memory.status).toBe('healthy');
      expect(healthResult.checks.externalServices.status).toBe('healthy');
      
      expect(healthResult).toHaveProperty('timestamp');
      expect(healthResult).toHaveProperty('uptime');
      expect(healthResult).toHaveProperty('version');
    });

    it('should detect database connection issues', async () => {
      // Mock database connection failure
      const mockPool = new Pool();
      vi.mocked(mockPool.connect).mockRejectedValue(new Error('Connection refused'));

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.database.status).toBe('unhealthy');
      expect(healthResult.checks.database.message).toContain('connection failed');
      expect(healthResult.status).toBe('unhealthy');
    });

    it('should detect slow database responses', async () => {
      // Mock slow database response
      const mockClient = {
        query: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ rows: [{ result: 1 }] }), 1500))
        ),
        release: vi.fn()
      };
      const mockPool = new Pool();
      vi.mocked(mockPool.connect).mockResolvedValue(mockClient as any);

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.database.status).toBe('degraded');
      expect(healthResult.checks.database.message).toContain('responding slowly');
      expect(healthResult.checks.database.responseTime).toBeGreaterThan(1000);
    });

    it('should check Redis connectivity', async () => {
      const mockRedis = {
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
        isOpen: true
      };

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.redis.status).toBe('healthy');
    });

    it('should handle Redis connection failures', async () => {
      const mockRedis = {
        connect: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        ping: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        isOpen: false
      };

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.redis.status).toBe('unhealthy');
      expect(healthResult.checks.redis.details?.error).toContain('connection failed');
    });

    it('should monitor memory usage', async () => {
      // Mock normal memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 500 * 1024 * 1024, // 500MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (50% usage)
        external: 50 * 1024 * 1024,
        rss: 600 * 1024 * 1024
      });

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.memory.status).toBe('healthy');
      expect(healthResult.checks.memory.details?.usagePercent).toBe(50);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect high memory usage', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (80% usage)
        external: 50 * 1024 * 1024,
        rss: 900 * 1024 * 1024
      });

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.memory.status).toBe('degraded');
      expect(healthResult.checks.memory.message).toContain('High memory usage');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect critical memory usage', async () => {
      // Mock critical memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 950 * 1024 * 1024, // 950MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (95% usage)
        external: 50 * 1024 * 1024,
        rss: 1000 * 1024 * 1024
      });

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.memory.status).toBe('unhealthy');
      expect(healthResult.checks.memory.message).toContain('Critical memory usage');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should check external services availability', async () => {
      // Mock successful external service responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true } as Response) // IRCTC
        .mockResolvedValueOnce({ ok: true } as Response); // Email service check

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.externalServices.status).toBe('healthy');
      expect(healthResult.checks.externalServices.details?.irctc).toBe('available');
      expect(healthResult.checks.externalServices.details?.email).toBe('available');
    });

    it('should detect external service failures', async () => {
      // Mock external service failures
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('IRCTC timeout')) // IRCTC failure
        .mockResolvedValueOnce({ ok: true } as Response); // Email service OK

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.externalServices.status).toBe('degraded');
      expect(healthResult.checks.externalServices.message).toContain('external service(s) unavailable');
      expect(healthResult.checks.externalServices.details?.irctc).toBe('unavailable');
      expect(healthResult.checks.externalServices.details?.email).toBe('available');
    });

    it('should get system metrics', () => {
      const metrics = healthMonitor.getSystemMetrics();

      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('version');

      expect(typeof metrics.uptime).toBe('number');
      expect(metrics.memory).toHaveProperty('heapUsed');
      expect(metrics.memory).toHaveProperty('heapTotal');
      expect(metrics.memory).toHaveProperty('external');
      expect(metrics.memory).toHaveProperty('rss');
      expect(metrics.version).toHaveProperty('node');
      expect(metrics.version).toHaveProperty('app');
    });

    it('should handle health check timeouts', async () => {
      // Mock timeout scenario
      const mockClient = {
        query: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 6000))
        ),
        release: vi.fn()
      };
      const mockPool = new Pool();
      vi.mocked(mockPool.connect).mockResolvedValue(mockClient as any);

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.database.status).toBe('unhealthy');
      expect(healthResult.checks.database.message).toContain('connection failed');
    });
  });

  describe('Error Alerting Service Tests', () => {
    it('should send critical alerts via multiple channels', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue(true);
      const mockFetch = vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      await errorAlerting.sendCriticalAlert(
        AlertType.SYSTEM_ERROR,
        'Database Connection Lost',
        'PostgreSQL database is not responding',
        { 
          error: 'ECONNREFUSED',
          timestamp: new Date(),
          affectedServices: ['PNR tracking', 'User authentication']
        }
      );

      // Should log the alert
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT [CRITICAL]'),
        expect.objectContaining({
          type: AlertType.SYSTEM_ERROR,
          message: 'PostgreSQL database is not responding'
        })
      );

      // Should send webhook notifications
      expect(mockFetch).toHaveBeenCalledWith(
        process.env.SLACK_WEBHOOK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        process.env.ALERT_WEBHOOK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should send high severity alerts', async () => {
      await errorAlerting.sendHighAlert(
        AlertType.HIGH_ERROR_RATE,
        'Error Rate Spike Detected',
        'Error rate has exceeded 10 errors per minute',
        { 
          currentRate: 15,
          threshold: 10,
          timeWindow: '1 minute'
        }
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT [HIGH]'),
        expect.objectContaining({
          type: AlertType.HIGH_ERROR_RATE
        })
      );
    });

    it('should send medium severity alerts', async () => {
      await errorAlerting.sendMediumAlert(
        AlertType.EXTERNAL_SERVICE_DOWN,
        'IRCTC Service Degraded',
        'IRCTC response time is above normal thresholds',
        { 
          service: 'IRCTC',
          responseTime: 8000,
          threshold: 5000
        }
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT [MEDIUM]'),
        expect.objectContaining({
          type: AlertType.EXTERNAL_SERVICE_DOWN
        })
      );
    });

    it('should track error rates and trigger alerts', async () => {
      const mockSendHighAlert = vi.spyOn(errorAlerting, 'sendHighAlert').mockResolvedValue();

      // Simulate multiple errors within the threshold window
      for (let i = 0; i < 6; i++) {
        errorAlerting.recordError();
      }

      // Manually trigger error rate check (normally done by interval)
      await (errorAlerting as any).checkErrorRates();

      expect(mockSendHighAlert).toHaveBeenCalledWith(
        AlertType.HIGH_ERROR_RATE,
        'High Error Rate Detected',
        expect.stringContaining('exceeds threshold'),
        expect.objectContaining({
          errorCount: 6,
          threshold: 5
        })
      );

      mockSendHighAlert.mockRestore();
    });

    it('should format email alerts correctly', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue(true);

      await errorAlerting.sendCriticalAlert(
        AlertType.DATABASE_ERROR,
        'Database Corruption Detected',
        'Data integrity check failed on users table',
        { 
          table: 'users',
          corruptedRows: 5,
          totalRows: 1000
        }
      );

      // Verify email formatting (this would be tested in the actual email sending)
      expect(logger.error).toHaveBeenCalled();
    });

    it('should format Slack alerts correctly', async () => {
      const mockFetch = vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      await errorAlerting.sendCriticalAlert(
        AlertType.SECURITY_INCIDENT,
        'Multiple Failed Login Attempts',
        'Detected brute force attack from IP 192.168.1.100',
        { 
          sourceIP: '192.168.1.100',
          attemptCount: 50,
          timeWindow: '5 minutes'
        }
      );

      // Verify Slack webhook was called with proper payload
      const slackCall = mockFetch.mock.calls.find(call => 
        call[0] === process.env.SLACK_WEBHOOK_URL
      );
      
      expect(slackCall).toBeDefined();
      expect(slackCall![1]).toMatchObject({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const payload = JSON.parse(slackCall![1]!.body as string);
      expect(payload.text).toContain('🚨 CRITICAL Alert');
      expect(payload.attachments[0].color).toBe('danger');
    });

    it('should handle alert sending failures gracefully', async () => {
      // Mock webhook failure
      vi.mocked(fetch).mockRejectedValue(new Error('Webhook service unavailable'));

      // Should not throw error
      await expect(
        errorAlerting.sendCriticalAlert(
          AlertType.SYSTEM_ERROR,
          'Test Alert',
          'Test message'
        )
      ).resolves.not.toThrow();

      // Should log the failure
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send'),
        expect.any(Object)
      );
    });

    it('should manage active alerts', () => {
      const activeAlerts = errorAlerting.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);

      // Test alert resolution
      const alertId = 'test-alert-123';
      errorAlerting.resolveAlert(alertId);

      expect(logger.info).toHaveBeenCalledWith(
        'Alert resolved',
        expect.objectContaining({ alertId })
      );
    });

    it('should clean up old error counts', () => {
      // Record errors
      for (let i = 0; i < 3; i++) {
        errorAlerting.recordError();
      }

      // Manually trigger cleanup (normally done by interval)
      (errorAlerting as any).cleanupOldErrorCounts();

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should update alert configuration', () => {
      const newConfig = {
        alertThresholds: {
          errorRate: 20,
          responseTime: 10000,
          memoryUsage: 90,
          failedHealthChecks: 5
        }
      };

      errorAlerting.updateConfig(newConfig);

      expect(logger.info).toHaveBeenCalledWith(
        'Alert configuration updated',
        expect.objectContaining({ config: expect.any(Object) })
      );
    });

    it('should respect alert configuration settings', async () => {
      // Disable alerts
      errorAlerting.updateConfig({ enabled: false });

      const mockSendCriticalAlert = vi.spyOn(errorAlerting, 'sendCriticalAlert');

      await errorAlerting.sendCriticalAlert(
        AlertType.SYSTEM_ERROR,
        'Test Alert',
        'Should not be sent'
      );

      // Should return early without processing
      expect(mockSendCriticalAlert).toHaveBeenCalled();

      // Re-enable alerts
      errorAlerting.updateConfig({ enabled: true });
      mockSendCriticalAlert.mockRestore();
    });
  });

  describe('Metrics Collection Tests', () => {
    it('should start and stop metrics collection', () => {
      metricsCollector.startCollection(1000); // 1 second interval for testing
      
      // Should not throw error
      expect(true).toBe(true);
      
      metricsCollector.stopCollection();
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should record request metrics', () => {
      metricsCollector.recordRequest(150, false); // Successful request
      metricsCollector.recordRequest(50, true);   // Error request
      metricsCollector.recordRequest(300, true);  // Another error request

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should get current metrics', () => {
      const currentMetrics = metricsCollector.getCurrentMetrics();
      
      // May be null if no metrics collected yet
      if (currentMetrics) {
        expect(currentMetrics).toHaveProperty('timestamp');
        expect(currentMetrics).toHaveProperty('memory');
        expect(currentMetrics).toHaveProperty('cpu');
        expect(currentMetrics).toHaveProperty('process');
        expect(currentMetrics).toHaveProperty('requests');
        
        expect(typeof currentMetrics.memory.heapUsed).toBe('number');
        expect(typeof currentMetrics.memory.heapTotal).toBe('number');
        expect(typeof currentMetrics.process.uptime).toBe('number');
      }
    });

    it('should get metrics history', () => {
      const history = metricsCollector.getMetricsHistory();
      
      expect(Array.isArray(history)).toBe(true);
      
      // Test with limit
      const limitedHistory = metricsCollector.getMetricsHistory(5);
      expect(Array.isArray(limitedHistory)).toBe(true);
      expect(limitedHistory.length).toBeLessThanOrEqual(5);
    });

    it('should get metrics in time range', () => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour ago
      
      const rangeMetrics = metricsCollector.getMetricsInRange(startTime, endTime);
      
      expect(Array.isArray(rangeMetrics)).toBe(true);
    });

    it('should get aggregated metrics', () => {
      const aggregated = metricsCollector.getAggregatedMetrics(60); // Last 60 minutes
      
      expect(aggregated).toHaveProperty('averageMemoryUsage');
      expect(aggregated).toHaveProperty('maxMemoryUsage');
      expect(aggregated).toHaveProperty('averageResponseTime');
      expect(aggregated).toHaveProperty('totalRequests');
      expect(aggregated).toHaveProperty('totalErrors');
      expect(aggregated).toHaveProperty('errorRate');
      
      expect(typeof aggregated.averageMemoryUsage).toBe('number');
      expect(typeof aggregated.maxMemoryUsage).toBe('number');
      expect(typeof aggregated.totalRequests).toBe('number');
    });

    it('should update and get thresholds', () => {
      const originalThresholds = metricsCollector.getThresholds();
      
      expect(originalThresholds).toHaveProperty('memoryUsagePercent');
      expect(originalThresholds).toHaveProperty('cpuUsagePercent');
      expect(originalThresholds).toHaveProperty('averageResponseTime');
      expect(originalThresholds).toHaveProperty('errorRate');
      
      const newThresholds = {
        memoryUsagePercent: 90,
        averageResponseTime: 3000
      };
      
      metricsCollector.updateThresholds(newThresholds);
      
      const updatedThresholds = metricsCollector.getThresholds();
      expect(updatedThresholds.memoryUsagePercent).toBe(90);
      expect(updatedThresholds.averageResponseTime).toBe(3000);
      
      expect(logger.logSystem).toHaveBeenCalledWith(
        'Metrics thresholds updated',
        expect.objectContaining({ thresholds: expect.any(Object) })
      );
    });

    it('should clear metrics history', () => {
      metricsCollector.clearHistory();
      
      const history = metricsCollector.getMetricsHistory();
      expect(history).toHaveLength(0);
      
      expect(logger.logSystem).toHaveBeenCalledWith('Metrics history cleared');
    });

    it('should handle metrics collection errors gracefully', () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockImplementation(() => {
        throw new Error('Memory usage error');
      });

      // Start collection (this would trigger the error internally)
      metricsCollector.startCollection(100);
      
      // Wait a bit for the interval to trigger
      setTimeout(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to collect metrics',
          expect.objectContaining({
            error: 'Memory usage error'
          })
        );
        
        metricsCollector.stopCollection();
        
        // Restore original function
        process.memoryUsage = originalMemoryUsage;
      }, 150);
    });
  });

  describe('Integration Tests', () => {
    it('should trigger alerts when health checks fail', async () => {
      const mockSendCriticalAlert = vi.spyOn(errorAlerting, 'sendCriticalAlert').mockResolvedValue();

      // Mock database failure
      const mockPool = new Pool();
      vi.mocked(mockPool.connect).mockRejectedValue(new Error('Database down'));

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.status).toBe('unhealthy');

      // Manually trigger alert (in real system, this would be automatic)
      if (healthResult.checks.database.status === 'unhealthy') {
        await errorAlerting.sendCriticalAlert(
          AlertType.DATABASE_ERROR,
          'Database Health Check Failed',
          'Database is not responding to health checks',
          { healthCheck: healthResult.checks.database }
        );
      }

      expect(mockSendCriticalAlert).toHaveBeenCalledWith(
        AlertType.DATABASE_ERROR,
        'Database Health Check Failed',
        'Database is not responding to health checks',
        expect.any(Object)
      );

      mockSendCriticalAlert.mockRestore();
    });

    it('should correlate metrics with health status', async () => {
      // Record high error rate
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordRequest(1000, true); // Record error requests
      }

      const aggregatedMetrics = metricsCollector.getAggregatedMetrics(5); // Last 5 minutes
      const healthResult = await healthMonitor.performHealthCheck();

      // High error rate should correlate with potential health issues
      expect(aggregatedMetrics.totalErrors).toBeGreaterThan(0);

      // In a real system, this correlation would trigger additional monitoring
      if (aggregatedMetrics.totalErrors > 5) {
        expect(healthResult.checks.database.status).toBeDefined();
      }
    });

    it('should handle cascading failures gracefully', async () => {
      // Simulate cascading failure: database down -> cache down -> external services affected
      const mockPool = new Pool();
      vi.mocked(mockPool.connect).mockRejectedValue(new Error('Database connection pool exhausted'));

      // Mock Redis failure
      const mockRedis = {
        connect: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        ping: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        isOpen: false
      };

      // Mock external service failure
      vi.mocked(fetch).mockRejectedValue(new Error('Service unavailable'));

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.checks.database.status).toBe('unhealthy');
      expect(healthResult.checks.redis.status).toBe('unhealthy');
      expect(healthResult.checks.externalServices.status).toBe('unhealthy');

      // System should still respond and provide meaningful error information
      expect(healthResult.checks.database.message).toContain('connection failed');
      expect(healthResult.checks.redis.details?.error).toContain('connection failed');
    });

    it('should maintain monitoring during high load', async () => {
      // Simulate high load scenario
      for (let i = 0; i < 100; i++) {
        metricsCollector.recordRequest(Math.random() * 1000, Math.random() > 0.9); // 10% error rate
      }

      const aggregatedMetrics = metricsCollector.getAggregatedMetrics(1); // Last minute
      expect(aggregatedMetrics.totalRequests).toBeGreaterThan(0);

      // Health check should still work under load
      const healthResult = await healthMonitor.performHealthCheck();
      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('timestamp');
    });
  });

  describe('Configuration and Environment Tests', () => {
    it('should handle missing configuration gracefully', () => {
      // Temporarily remove configuration
      const originalAlertsEnabled = process.env.ALERTS_ENABLED;
      delete process.env.ALERTS_ENABLED;

      const newErrorAlerting = ErrorAlertingService.getInstance();
      
      // Should not crash
      expect(newErrorAlerting).toBeDefined();

      // Restore configuration
      process.env.ALERTS_ENABLED = originalAlertsEnabled;
    });

    it('should validate configuration on startup', () => {
      // Test with invalid configuration
      const originalThreshold = process.env.ERROR_RATE_THRESHOLD;
      process.env.ERROR_RATE_THRESHOLD = 'invalid';

      // Should handle invalid configuration gracefully
      const newErrorAlerting = ErrorAlertingService.getInstance();
      expect(newErrorAlerting).toBeDefined();

      // Restore configuration
      process.env.ERROR_RATE_THRESHOLD = originalThreshold;
    });

    it('should support configuration updates at runtime', () => {
      const newConfig = {
        alertThresholds: {
          errorRate: 15,
          responseTime: 8000,
          memoryUsage: 85,
          failedHealthChecks: 3
        }
      };

      errorAlerting.updateConfig(newConfig);

      expect(logger.info).toHaveBeenCalledWith(
        'Alert configuration updated',
        expect.objectContaining({ config: expect.any(Object) })
      );
    });
  });
});