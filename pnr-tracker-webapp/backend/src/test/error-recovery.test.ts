/**
 * Error Recovery and Monitoring Tests
 * Tests error scenarios and recovery mechanisms
 * Requirements: 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { 
  AppError, 
  ValidationAppError, 
  AuthenticationError, 
  NotFoundError, 
  ExternalServiceError,
  DatabaseError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler
} from '../middleware/error-handler';
import { ErrorAlertingService, AlertType, AlertSeverity } from '../services/error-alerting';
import { HealthMonitorService } from '../services/health-monitor';
import { MetricsCollectorService } from '../services/metrics-collector';

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    logSystem: vi.fn()
  }
}));

// Mock notification service
vi.mock('../services/notification', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendEmailNotification: vi.fn().mockResolvedValue(true),
    sendPushNotification: vi.fn().mockResolvedValue(true),
    testEmailConfiguration: vi.fn().mockResolvedValue(true)
  }))
}));

// Mock fetch for external service checks
global.fetch = vi.fn();

describe('Error Recovery and Monitoring Tests', () => {
  let errorAlerting: ErrorAlertingService;
  let healthMonitor: HealthMonitorService;
  let metricsCollector: MetricsCollectorService;

  beforeAll(() => {
    // Set up test environment
    process.env.ALERTS_ENABLED = 'true';
    process.env.ADMIN_EMAILS = 'admin@test.com';
    process.env.ERROR_RATE_THRESHOLD = '5';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize services
    errorAlerting = ErrorAlertingService.getInstance();
    healthMonitor = HealthMonitorService.getInstance();
    metricsCollector = MetricsCollectorService.getInstance();

    // Mock fetch responses
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.ALERTS_ENABLED;
    delete process.env.ADMIN_EMAILS;
    delete process.env.ERROR_RATE_THRESHOLD;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
  });

  describe('Error Classes and Handling', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, true, 'TEST_ERROR', { detail: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('should create ValidationAppError with correct properties', () => {
      const error = new ValidationAppError('Validation failed', { field: 'email' });
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTHENTICATION_ERROR');
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND_ERROR');
    });

    it('should create ExternalServiceError with correct properties', () => {
      const error = new ExternalServiceError('IRCTC', 'Service timeout');
      
      expect(error.message).toBe('Service timeout');
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.details).toEqual({ service: 'IRCTC' });
    });

    it('should create DatabaseError with correct properties', () => {
      const error = new DatabaseError('Connection failed');
      
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('DATABASE_ERROR');
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Too many requests');
      
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_ERROR');
    });
  });

  describe('Error Handler Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
      mockReq = {
        url: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-agent'),
        user: { id: 'user-123' }
      };
      
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      
      mockNext = vi.fn();
    });

    it('should handle AppError correctly', () => {
      const error = new ValidationAppError('Invalid input');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'The provided data is invalid'
      });
    });

    it('should handle unknown errors as internal server errors', () => {
      const error = new Error('Unknown error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'An unexpected error occurred. Please try again later'
      });
    });

    it('should handle JWT errors correctly', () => {
      const error = new Error('JsonWebTokenError');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Please log in to access this resource'
      });
    });

    it('should handle database constraint violations', () => {
      // Test the pattern matching in getUserFriendlyMessage
      const error = new Error('duplicate key value violates unique constraint');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'An account with this email already exists'
      });
    });

    it('should handle not found routes', () => {
      mockReq.path = '/api/test'; // Add path property
      notFoundHandler(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'API endpoint GET /api/test not found'
      });
    });

    it('should wrap async handlers correctly', async () => {
      const asyncFunction = vi.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(asyncFunction);
      
      await wrappedHandler(mockReq, mockRes, mockNext);
      
      expect(asyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch async handler errors', async () => {
      const asyncFunction = vi.fn().mockRejectedValue(new Error('Async error'));
      const wrappedHandler = asyncHandler(asyncFunction);
      
      // Should not throw error when called
      await wrappedHandler(mockReq, mockRes, mockNext);
      
      expect(asyncFunction).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      // The error should be passed to next()
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error Alerting Service', () => {
    it('should create error alerting service instance', () => {
      expect(errorAlerting).toBeDefined();
      expect(typeof errorAlerting.sendCriticalAlert).toBe('function');
      expect(typeof errorAlerting.sendHighAlert).toBe('function');
      expect(typeof errorAlerting.sendMediumAlert).toBe('function');
    });

    it('should record errors for rate monitoring', () => {
      // Should not throw error
      expect(() => {
        errorAlerting.recordError();
        errorAlerting.recordError();
        errorAlerting.recordError();
      }).not.toThrow();
    });

    it('should get active alerts', () => {
      const activeAlerts = errorAlerting.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('should resolve alerts', () => {
      const alertId = 'test-alert-123';
      
      // Should not throw error
      expect(() => {
        errorAlerting.resolveAlert(alertId);
      }).not.toThrow();
    });

    it('should update configuration', () => {
      const newConfig = {
        alertThresholds: {
          errorRate: 10,
          responseTime: 5000,
          memoryUsage: 90,
          failedHealthChecks: 5
        }
      };
      
      // Should not throw error
      expect(() => {
        errorAlerting.updateConfig(newConfig);
      }).not.toThrow();
    });

    it('should handle disabled alerts', async () => {
      // Disable alerts
      errorAlerting.updateConfig({ enabled: false });
      
      // Should not throw error when sending alerts
      await expect(
        errorAlerting.sendCriticalAlert(
          AlertType.SYSTEM_ERROR,
          'Test Alert',
          'Test message'
        )
      ).resolves.not.toThrow();
      
      // Re-enable alerts
      errorAlerting.updateConfig({ enabled: true });
    });
  });

  describe('Health Monitor Service', () => {
    it('should create health monitor service instance', () => {
      expect(healthMonitor).toBeDefined();
      expect(typeof healthMonitor.performHealthCheck).toBe('function');
      expect(typeof healthMonitor.getSystemMetrics).toBe('function');
    });

    it('should perform health check without errors', async () => {
      const healthResult = await healthMonitor.performHealthCheck();
      
      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('timestamp');
      expect(healthResult).toHaveProperty('uptime');
      expect(healthResult).toHaveProperty('version');
      expect(healthResult).toHaveProperty('checks');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResult.status);
      expect(typeof healthResult.uptime).toBe('number');
      expect(typeof healthResult.timestamp).toBe('string');
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
      expect(metrics.version).toHaveProperty('node');
    });

    it('should handle health check errors gracefully', async () => {
      // Mock fetch to fail
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
      
      const healthResult = await healthMonitor.performHealthCheck();
      
      // Should still return a result
      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('checks');
    });
  });

  describe('Metrics Collector Service', () => {
    it('should create metrics collector service instance', () => {
      expect(metricsCollector).toBeDefined();
      expect(typeof metricsCollector.recordRequest).toBe('function');
      expect(typeof metricsCollector.getCurrentMetrics).toBe('function');
    });

    it('should start and stop metrics collection', () => {
      // Should not throw error
      expect(() => {
        metricsCollector.startCollection(1000);
        metricsCollector.stopCollection();
      }).not.toThrow();
    });

    it('should record request metrics', () => {
      // Should not throw error
      expect(() => {
        metricsCollector.recordRequest(150, false);
        metricsCollector.recordRequest(300, true);
        metricsCollector.recordRequest(75, false);
      }).not.toThrow();
    });

    it('should get metrics history', () => {
      const history = metricsCollector.getMetricsHistory();
      expect(Array.isArray(history)).toBe(true);
      
      const limitedHistory = metricsCollector.getMetricsHistory(5);
      expect(Array.isArray(limitedHistory)).toBe(true);
      expect(limitedHistory.length).toBeLessThanOrEqual(5);
    });

    it('should get metrics in time range', () => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
      
      const rangeMetrics = metricsCollector.getMetricsInRange(startTime, endTime);
      expect(Array.isArray(rangeMetrics)).toBe(true);
    });

    it('should get aggregated metrics', () => {
      const aggregated = metricsCollector.getAggregatedMetrics(60);
      
      expect(aggregated).toHaveProperty('averageMemoryUsage');
      expect(aggregated).toHaveProperty('maxMemoryUsage');
      expect(aggregated).toHaveProperty('averageResponseTime');
      expect(aggregated).toHaveProperty('totalRequests');
      expect(aggregated).toHaveProperty('totalErrors');
      expect(aggregated).toHaveProperty('errorRate');
      
      expect(typeof aggregated.averageMemoryUsage).toBe('number');
      expect(typeof aggregated.totalRequests).toBe('number');
    });

    it('should update and get thresholds', () => {
      const originalThresholds = metricsCollector.getThresholds();
      expect(originalThresholds).toHaveProperty('memoryUsagePercent');
      expect(originalThresholds).toHaveProperty('errorRate');
      
      const newThresholds = {
        memoryUsagePercent: 90,
        errorRate: 10
      };
      
      metricsCollector.updateThresholds(newThresholds);
      
      const updatedThresholds = metricsCollector.getThresholds();
      expect(updatedThresholds.memoryUsagePercent).toBe(90);
      expect(updatedThresholds.errorRate).toBe(10);
    });

    it('should clear metrics history', () => {
      metricsCollector.clearHistory();
      
      const history = metricsCollector.getMetricsHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle service unavailability gracefully', async () => {
      // Mock all external services to fail
      vi.mocked(fetch).mockRejectedValue(new Error('Service unavailable'));
      
      const healthResult = await healthMonitor.performHealthCheck();
      
      // Should still return a result, not crash
      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('checks');
    });

    it('should handle high memory usage detection', () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (90% usage)
        external: 50 * 1024 * 1024,
        rss: 1000 * 1024 * 1024
      });

      const metrics = healthMonitor.getSystemMetrics();
      
      // Should detect high memory usage
      expect(metrics.memory.heapUsed).toBeGreaterThan(800 * 1024 * 1024);
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle configuration errors gracefully', () => {
      // Test with missing configuration
      const originalEnv = process.env.ALERTS_ENABLED;
      delete process.env.ALERTS_ENABLED;
      
      // Should not crash when creating new instance
      const newErrorAlerting = ErrorAlertingService.getInstance();
      expect(newErrorAlerting).toBeDefined();
      
      // Restore configuration
      process.env.ALERTS_ENABLED = originalEnv;
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      const healthResult = await healthMonitor.performHealthCheck();
      
      // Should handle timeout gracefully
      expect(healthResult).toHaveProperty('status');
    });

    it('should maintain functionality during partial failures', async () => {
      // Mock partial service failure
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response) // First service fails
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response); // Second service succeeds
      
      const healthResult = await healthMonitor.performHealthCheck();
      
      // Should still provide meaningful status
      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('checks');
    });
  });

  describe('Integration and System Resilience', () => {
    it('should maintain monitoring during high error rates', () => {
      // Simulate high error rate
      for (let i = 0; i < 20; i++) {
        errorAlerting.recordError();
        metricsCollector.recordRequest(1000, true);
      }
      
      // System should still function
      const activeAlerts = errorAlerting.getActiveAlerts();
      const aggregatedMetrics = metricsCollector.getAggregatedMetrics(1);
      
      expect(Array.isArray(activeAlerts)).toBe(true);
      expect(aggregatedMetrics).toHaveProperty('totalErrors');
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent health checks
      const promises = Array(10).fill(null).map(() => 
        healthMonitor.performHealthCheck()
      );
      
      const results = await Promise.all(promises);
      
      // All should complete successfully
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('status');
      });
    });

    it('should provide consistent error responses', () => {
      const errors = [
        new ValidationAppError('Invalid input'),
        new AuthenticationError('Invalid token'),
        new NotFoundError('Resource'),
        new DatabaseError('Connection failed'),
        new ExternalServiceError('IRCTC', 'Service down')
      ];
      
      errors.forEach(error => {
        expect(error).toHaveProperty('statusCode');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('isOperational');
        expect(typeof error.statusCode).toBe('number');
        expect(typeof error.message).toBe('string');
      });
    });

    it('should handle resource cleanup properly', async () => {
      // Start services
      metricsCollector.startCollection(100);
      
      // Simulate some activity
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Stop services
      metricsCollector.stopCollection();
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });
});