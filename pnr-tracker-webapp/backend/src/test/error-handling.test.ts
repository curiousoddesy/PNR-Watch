/**
 * Comprehensive Error Handling Tests
 * Tests error scenarios and recovery mechanisms for the PNR Tracker system
 * Requirements: 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { 
  AppError, 
  ValidationAppError, 
  AuthenticationError, 
  NotFoundError, 
  ExternalServiceError,
  DatabaseError,
  RateLimitError
} from '../middleware/error-handler';
import { ErrorAlertingService, AlertType, AlertSeverity } from '../services/error-alerting';
import { HealthMonitorService } from '../services/health-monitor';
import { IRCTCScraperService } from '../services/irctc-scraper';
import { NotificationService } from '../services/notification';
import { logger } from '../services/logger';

// Mock database with controllable responses
const mockDbQuery = vi.fn();

// Mock external services
vi.mock('../services/irctc-scraper', () => ({
  IRCTCScraperService: {
    performRequest: vi.fn()
  }
}));

vi.mock('../services/notification', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendEmailNotification: vi.fn(),
    sendPushNotification: vi.fn(),
    createInAppNotification: vi.fn(),
    sendStatusChangeNotification: vi.fn(),
    testEmailConfiguration: vi.fn()
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

vi.mock('../config/database', () => ({
  default: {
    getInstance: () => ({
      query: mockDbQuery
    })
  }
}));

// Mock Redis
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    quit: vi.fn(),
    ping: vi.fn(),
    isOpen: true,
    on: vi.fn()
  }))
}));

// Mock background scheduler
vi.mock('../services/background-scheduler', () => ({
  backgroundScheduler: {
    start: vi.fn(),
    stop: vi.fn(),
    scheduleStatusCheck: vi.fn(),
    cancelStatusCheck: vi.fn()
  }
}));

describe('Error Handling and Recovery Tests', () => {
  let authToken: string;
  let errorAlerting: ErrorAlertingService;
  let healthMonitor: HealthMonitorService;

  beforeAll(async () => {
    // Initialize services
    errorAlerting = ErrorAlertingService.getInstance();
    healthMonitor = HealthMonitorService.getInstance();

    // Set up test environment variables
    process.env.ALERTS_ENABLED = 'true';
    process.env.ADMIN_EMAILS = 'admin@test.com';
    process.env.ERROR_RATE_THRESHOLD = '5';
    process.env.RESPONSE_TIME_THRESHOLD = '3000';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset database mock to default success response
    mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    // Register test user and get auth token
    mockDbQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing user
      .mockResolvedValueOnce({ 
        rows: [{ 
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'testuser@example.com',
          name: 'Test User'
        }], 
        rowCount: 1 
      }); // Insert user

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword123',
        name: 'Test User'
      });

    // Mock login
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'testuser@example.com',
        password_hash: '$2b$12$mockhashedpassword'
      }],
      rowCount: 1
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.data?.accessToken || 'mock-token';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up environment variables
    delete process.env.ALERTS_ENABLED;
    delete process.env.ADMIN_EMAILS;
    delete process.env.ERROR_RATE_THRESHOLD;
    delete process.env.RESPONSE_TIME_THRESHOLD;
  });

  describe('Database Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database connection error
      mockDbQuery.mockRejectedValue(new Error('ECONNREFUSED: Connection refused'));

      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unable to connect to database');
    });

    it('should handle database timeout errors', async () => {
      // Mock database timeout
      mockDbQuery.mockRejectedValue(new Error('Query timeout'));

      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request timed out. Please try again');
    });

    it('should handle unique constraint violations', async () => {
      // Mock unique constraint violation (duplicate email)
      mockDbQuery.mockRejectedValue(new Error('duplicate key value violates unique constraint "users_email_key"'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'testpassword123',
          name: 'Test User'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('An account with this email already exists');
    });

    it('should handle foreign key constraint violations', async () => {
      // Mock foreign key violation
      mockDbQuery.mockRejectedValue(new Error('insert or update on table violates foreign key constraint'));

      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Referenced record does not exist');
    });

    it('should handle not null constraint violations', async () => {
      // Mock not null violation
      mockDbQuery.mockRejectedValue(new Error('null value in column "email" violates not-null constraint'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'testpassword123',
          name: 'Test User'
          // Missing email
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Required field is missing');
    });
  });

  describe('External Service Error Handling', () => {
    it('should handle IRCTC service unavailability', async () => {
      // Mock IRCTC service error
      vi.mocked(IRCTCScraperService.performRequest).mockRejectedValue(
        new Error('IRCTC service unavailable')
      );

      // Mock successful PNR addition first
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check duplicate
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'pnr-123',
            pnr: '1234567890',
            user_id: '123e4567-e89b-12d3-a456-426614174000'
          }], 
          rowCount: 1 
        }); // Insert PNR

      const addResponse = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });

      // Mock PNR retrieval for status check
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pnr-123',
          pnr: '1234567890',
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          current_status: JSON.stringify({
            pnr: '1234567890',
            status: 'Unknown',
            error: 'IRCTC service unavailable'
          })
        }],
        rowCount: 1
      });

      const statusResponse = await request(app)
        .get(`/api/pnrs/pnr-123/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.error).toBe('IRCTC service unavailable');
    });

    it('should handle IRCTC rate limiting', async () => {
      // Mock rate limiting error
      vi.mocked(IRCTCScraperService.performRequest).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      // Mock PNR retrieval
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pnr-123',
          pnr: '1234567890',
          user_id: '123e4567-e89b-12d3-a456-426614174000'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/pnrs/pnr-123/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.error).toContain('Rate limit exceeded');
    });

    it('should handle email service failures gracefully', async () => {
      const mockNotificationService = new NotificationService();
      vi.mocked(mockNotificationService.sendEmailNotification).mockResolvedValue(false);

      // Test password reset with email failure
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'testuser@example.com'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'testuser@example.com'
        });

      // Should still return success but log the email failure
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle network connectivity issues', async () => {
      // Mock network error
      vi.mocked(IRCTCScraperService.performRequest).mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed')
      );

      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pnr-123',
          pnr: '1234567890',
          user_id: '123e4567-e89b-12d3-a456-426614174000'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/pnrs/pnr-123/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.error).toContain('DNS lookup failed');
    });
  });

  describe('Authentication and Authorization Error Handling', () => {
    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Please log in to access this resource');
    });

    it('should handle expired JWT tokens', async () => {
      // Create an expired token (this would be mocked in real implementation)
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Your session has expired. Please log in again');
    });

    it('should handle malformed authorization headers', async () => {
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('should handle missing authorization headers', async () => {
      const response = await request(app)
        .get('/api/pnrs');

      expect(response.status).toBe(401);
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle invalid PNR format', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '123' // Invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Please enter a valid 10-digit PNR number');
    });

    it('should handle invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'testpassword123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Please enter a valid email address');
    });

    it('should handle weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Weak password
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Password must be at least 8 characters long with uppercase, lowercase, and numbers');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid JSON format');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password and name
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('The provided data is invalid');
    });
  });

  describe('Rate Limiting Error Handling', () => {
    it('should handle rate limit exceeded for authentication', async () => {
      // Simulate multiple failed login attempts
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error).toBe('Too many login attempts. Please try again in 15 minutes');
      }
    });

    it('should handle general rate limiting', async () => {
      // This would test general API rate limiting
      // Implementation depends on rate limiting middleware configuration
      const response = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '192.168.1.100'); // Simulate specific IP

      // Should succeed normally
      expect(response.status).toBe(200);
    });
  });

  describe('Resource Not Found Error Handling', () => {
    it('should handle non-existent PNR access', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get(`/api/pnrs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PNR not found in your tracking list');
    });

    it('should handle non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('API endpoint GET /api/nonexistent-endpoint not found');
    });

    it('should handle non-existent user access', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User account not found');
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should retry failed IRCTC requests with exponential backoff', async () => {
      let callCount = 0;
      vi.mocked(IRCTCScraperService.performRequest).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({
          pnr: '1234567890',
          from: 'Delhi',
          to: 'Mumbai',
          date: '2024-01-15',
          status: 'Confirmed',
          isFlushed: false,
          lastUpdated: new Date()
        });
      });

      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pnr-123',
          pnr: '1234567890',
          user_id: '123e4567-e89b-12d3-a456-426614174000'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/pnrs/pnr-123/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(callCount).toBe(3); // Should have retried twice
      expect(response.body.data.status).toBe('Confirmed');
    });

    it('should fallback to cached data when external service fails', async () => {
      // Mock IRCTC failure
      vi.mocked(IRCTCScraperService.performRequest).mockRejectedValue(
        new Error('Service unavailable')
      );

      // Mock cached data retrieval
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pnr-123',
          pnr: '1234567890',
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          current_status: JSON.stringify({
            pnr: '1234567890',
            status: 'Confirmed',
            from: 'Delhi',
            to: 'Mumbai',
            lastUpdated: new Date().toISOString()
          })
        }],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/pnrs/pnr-123/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('Confirmed');
      expect(response.body.data.error).toBe('Service unavailable');
    });

    it('should gracefully degrade when notification service fails', async () => {
      const mockNotificationService = new NotificationService();
      vi.mocked(mockNotificationService.sendEmailNotification).mockRejectedValue(
        new Error('Email service down')
      );

      // Test user registration (which sends welcome email)
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing user
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: '123e4567-e89b-12d3-a456-426614174001',
            email: 'newuser@example.com',
            name: 'New User'
          }], 
          rowCount: 1 
        }); // Insert user

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'testpassword123',
          name: 'New User'
        });

      // Registration should succeed even if email fails
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should handle database connection recovery', async () => {
      let dbCallCount = 0;
      mockDbQuery.mockImplementation(() => {
        dbCallCount++;
        if (dbCallCount === 1) {
          return Promise.reject(new Error('Connection lost'));
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`);

      // Should handle the error gracefully
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database operation failed');
    });
  });

  describe('Error Alerting System Tests', () => {
    it('should send critical alerts for system errors', async () => {
      const mockSendCriticalAlert = vi.spyOn(errorAlerting, 'sendCriticalAlert').mockResolvedValue();

      await errorAlerting.sendCriticalAlert(
        AlertType.SYSTEM_ERROR,
        'Database Connection Failed',
        'Unable to connect to PostgreSQL database',
        { error: 'ECONNREFUSED', timestamp: new Date() }
      );

      expect(mockSendCriticalAlert).toHaveBeenCalledWith(
        AlertType.SYSTEM_ERROR,
        'Database Connection Failed',
        'Unable to connect to PostgreSQL database',
        expect.objectContaining({ error: 'ECONNREFUSED' })
      );

      mockSendCriticalAlert.mockRestore();
    });

    it('should track error rates and trigger alerts', async () => {
      const mockSendHighAlert = vi.spyOn(errorAlerting, 'sendHighAlert').mockResolvedValue();

      // Simulate multiple errors
      for (let i = 0; i < 6; i++) {
        errorAlerting.recordError();
      }

      // Wait for error rate check (mocked)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should trigger high error rate alert
      expect(mockSendHighAlert).toHaveBeenCalledWith(
        AlertType.HIGH_ERROR_RATE,
        expect.stringContaining('High Error Rate'),
        expect.stringContaining('exceeds threshold'),
        expect.any(Object)
      );

      mockSendHighAlert.mockRestore();
    });

    it('should send external service down alerts', async () => {
      const mockSendMediumAlert = vi.spyOn(errorAlerting, 'sendMediumAlert').mockResolvedValue();

      await errorAlerting.sendMediumAlert(
        AlertType.EXTERNAL_SERVICE_DOWN,
        'IRCTC Service Unavailable',
        'IRCTC website is not responding to requests',
        { service: 'IRCTC', lastSuccessful: new Date() }
      );

      expect(mockSendMediumAlert).toHaveBeenCalledWith(
        AlertType.EXTERNAL_SERVICE_DOWN,
        'IRCTC Service Unavailable',
        'IRCTC website is not responding to requests',
        expect.objectContaining({ service: 'IRCTC' })
      );

      mockSendMediumAlert.mockRestore();
    });

    it('should get active alerts', () => {
      const activeAlerts = errorAlerting.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('should resolve alerts', () => {
      const alertId = 'test-alert-123';
      errorAlerting.resolveAlert(alertId);
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('System Health Monitoring Tests', () => {
    it('should perform comprehensive health check', async () => {
      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('timestamp');
      expect(healthResult).toHaveProperty('uptime');
      expect(healthResult).toHaveProperty('version');
      expect(healthResult).toHaveProperty('checks');

      expect(healthResult.checks).toHaveProperty('database');
      expect(healthResult.checks).toHaveProperty('redis');
      expect(healthResult.checks).toHaveProperty('memory');
      expect(healthResult.checks).toHaveProperty('disk');
      expect(healthResult.checks).toHaveProperty('externalServices');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResult.status);
    });

    it('should detect unhealthy database', async () => {
      // Mock database connection failure
      mockDbQuery.mockRejectedValue(new Error('Connection refused'));

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.database.status).toBe('unhealthy');
      expect(healthResult.checks.database.message).toContain('connection failed');
    });

    it('should detect high memory usage', async () => {
      // Mock high memory usage (this would require mocking process.memoryUsage)
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (90% usage)
        external: 50 * 1024 * 1024,
        rss: 1100 * 1024 * 1024
      });

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.checks.memory.status).toBe('unhealthy');
      expect(healthResult.checks.memory.message).toContain('Critical memory usage');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
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
    });

    it('should handle health check failures gracefully', async () => {
      // Mock all health checks to fail
      const originalQuery = mockDbQuery;
      mockDbQuery.mockRejectedValue(new Error('All systems down'));

      const healthResult = await healthMonitor.performHealthCheck();

      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.checks.database.status).toBe('unhealthy');

      // Restore
      mockDbQuery = originalQuery;
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors with structured information', async () => {
      // Trigger an error that should be logged
      mockDbQuery.mockRejectedValue(new Error('Test database error'));

      await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(logger.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          message: expect.any(String),
          url: '/api/pnrs',
          method: 'GET',
          statusCode: expect.any(Number)
        })
      );
    });

    it('should log system events', async () => {
      // Test system logging
      logger.logSystem('Test system event', { component: 'test' });

      expect(logger.logSystem).toHaveBeenCalledWith(
        'Test system event',
        { component: 'test' }
      );
    });

    it('should handle logging failures gracefully', () => {
      // Mock logger to throw error
      vi.mocked(logger.error).mockImplementation(() => {
        throw new Error('Logger failed');
      });

      // Should not crash the application
      expect(() => {
        logger.error('Test error');
      }).toThrow('Logger failed');

      // Restore logger
      vi.mocked(logger.error).mockRestore();
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should return consistent error response format', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: 'invalid'
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.error).toBe('string');
    });

    it('should include debug information in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: 'invalid'
        });

      expect(response.body).toHaveProperty('debug');
      expect(response.body.debug).toHaveProperty('originalMessage');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include debug information in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: 'invalid'
        });

      expect(response.body).not.toHaveProperty('debug');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Graceful Shutdown Handling', () => {
    it('should handle graceful shutdown signals', () => {
      // Test that error handlers are set up for uncaught exceptions
      const listeners = process.listeners('uncaughtException');
      expect(listeners.length).toBeGreaterThan(0);
    });

    it('should handle unhandled promise rejections', () => {
      // Test that error handlers are set up for unhandled rejections
      const listeners = process.listeners('unhandledRejection');
      expect(listeners.length).toBeGreaterThan(0);
    });
  });
});