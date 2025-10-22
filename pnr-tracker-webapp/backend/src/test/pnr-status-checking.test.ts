/**
 * Comprehensive tests for PNR Status Checking functionality
 * Tests status checking endpoints with mocked IRCTC responses
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { CacheService } from '../services/cache';
import { IRCTCScraperService } from '../services/irctc-scraper';
import { BatchProcessorService } from '../services/batch-processor';
import { PNRStatusResult } from '../types';

// Mock services
vi.mock('../services/irctc-scraper', () => ({
  IRCTCScraperService: {
    performRequest: vi.fn()
  }
}));

vi.mock('../services/batch-processor', () => ({
  BatchProcessorService: {
    processBatch: vi.fn()
  }
}));

// Mock notification service to avoid VAPID key issues
vi.mock('../services/notification', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendStatusChangeNotification: vi.fn(),
    sendEmailNotification: vi.fn(),
    sendPushNotification: vi.fn(),
    createInAppNotification: vi.fn()
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

// Mock database connection
vi.mock('../config/database', () => ({
  default: {
    getInstance: () => ({
      query: vi.fn().mockResolvedValue({ rows: [] })
    })
  }
}));

describe('PNR Status Checking API Endpoints', () => {
  let authToken: string;
  let trackedPnrId: string;
  let secondTrackedPnrId: string;

  // Mock PNR status responses
  const mockConfirmedStatus: PNRStatusResult = {
    pnr: '1234567890',
    from: 'NEW DELHI',
    to: 'MUMBAI CENTRAL',
    date: '2024-01-15',
    status: 'CNF/S1/25',
    isFlushed: false,
    lastUpdated: new Date()
  };

  const mockWaitlistStatus: PNRStatusResult = {
    pnr: '2345678901',
    from: 'CHENNAI CENTRAL',
    to: 'BANGALORE',
    date: '2024-01-20',
    status: 'WL/15',
    isFlushed: false,
    lastUpdated: new Date()
  };

  const mockFlushedStatus: PNRStatusResult = {
    pnr: '3456789012',
    from: 'Unknown',
    to: 'Unknown',
    date: 'Unknown',
    status: 'Flushed PNR',
    isFlushed: true,
    lastUpdated: new Date()
  };

  beforeAll(async () => {
    // Initialize cache service for testing
    await CacheService.initialize();
  });

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Register test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword123',
        name: 'Test User'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.data.accessToken;

    // Setup default mock for IRCTC scraper
    vi.mocked(IRCTCScraperService.performRequest).mockResolvedValue(mockConfirmedStatus);

    // Add test PNRs
    const addPnr1Response = await request(app)
      .post('/api/pnrs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        pnr: '1234567890'
      });
    trackedPnrId = addPnr1Response.body.data.id;

    // Mock different status for second PNR
    vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(mockWaitlistStatus);
    
    const addPnr2Response = await request(app)
      .post('/api/pnrs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        pnr: '2345678901'
      });
    secondTrackedPnrId = addPnr2Response.body.data.id;
  });

  afterAll(async () => {
    // Clean up cache service
    await CacheService.close();
    vi.restoreAllMocks();
  });

  describe('GET /api/pnrs/:id/status - Individual PNR Status', () => {
    it('should get current status for confirmed PNR', async () => {
      vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(mockConfirmedStatus);

      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pnr).toBe('1234567890');
      expect(response.body.data.status).toBe('CNF/S1/25');
      expect(response.body.data.from).toBe('NEW DELHI');
      expect(response.body.data.to).toBe('MUMBAI CENTRAL');
      expect(response.body.data.isFlushed).toBe(false);
      expect(response.body.message).toBe('PNR status retrieved successfully');
    });

    it('should get current status for waitlisted PNR', async () => {
      vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(mockWaitlistStatus);

      const response = await request(app)
        .get(`/api/pnrs/${secondTrackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pnr).toBe('2345678901');
      expect(response.body.data.status).toBe('WL/15');
      expect(response.body.data.from).toBe('CHENNAI CENTRAL');
      expect(response.body.data.to).toBe('BANGALORE');
    });

    it('should handle flushed PNR status', async () => {
      vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(mockFlushedStatus);

      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFlushed).toBe(true);
      expect(response.body.data.status).toBe('Flushed PNR');
    });

    it('should use cached status when available', async () => {
      // First request - should call IRCTC
      vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(mockConfirmedStatus);
      
      const firstResponse = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.status).toBe(200);
      expect(IRCTCScraperService.performRequest).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      const secondResponse = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.pnr).toBe(firstResponse.body.data.pnr);
      // Should not call IRCTC again due to caching
      expect(IRCTCScraperService.performRequest).toHaveBeenCalledTimes(1);
    });

    it('should fallback to database status when IRCTC fails', async () => {
      vi.mocked(IRCTCScraperService.performRequest).mockRejectedValueOnce(
        new Error('IRCTC service unavailable')
      );

      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pnr');
      expect(response.body.data).toHaveProperty('error');
      expect(response.body.data.error).toBe('IRCTC service unavailable');
    });

    it('should return 404 for non-existent PNR', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/pnrs/${fakeId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PNR not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pnrs/check-all - Batch Status Checking', () => {
    beforeEach(() => {
      // Setup batch processor mock
      vi.mocked(BatchProcessorService.processBatch).mockResolvedValue({
        results: [mockConfirmedStatus, mockWaitlistStatus],
        flushedPNRs: [],
        errors: []
      });
    });

    it('should check all user PNRs when no specific IDs provided', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verify batch processor was called
      expect(BatchProcessorService.processBatch).toHaveBeenCalledWith(
        expect.arrayContaining(['1234567890', '2345678901']),
        expect.objectContaining({
          requestDelay: 1000,
          maxRetries: 2,
          retryDelay: 2000
        })
      );

      // Check response structure
      response.body.data.forEach((result: any) => {
        expect(result).toHaveProperty('pnr');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('lastUpdated');
      });
    });

    it('should check specific PNRs when IDs provided', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnrIds: [trackedPnrId]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2); // Mock returns 2 results
      
      // Verify batch processor was called with single PNR
      expect(BatchProcessorService.processBatch).toHaveBeenCalledWith(
        ['1234567890'], // Only the specific PNR
        expect.any(Object)
      );
    });

    it('should handle batch processing with flushed PNRs', async () => {
      vi.mocked(BatchProcessorService.processBatch).mockResolvedValueOnce({
        results: [mockConfirmedStatus, mockFlushedStatus],
        flushedPNRs: ['3456789012'],
        errors: []
      });

      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should include flushed PNR in results
      const flushedResult = response.body.data.find((r: any) => r.isFlushed === true);
      expect(flushedResult).toBeDefined();
    });

    it('should handle batch processing errors gracefully', async () => {
      vi.mocked(BatchProcessorService.processBatch).mockRejectedValueOnce(
        new Error('Batch processing failed')
      );

      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should return database statuses when batch processing fails
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Results should have error information
      response.body.data.forEach((result: any) => {
        expect(result).toHaveProperty('error');
        expect(result.error).toBe('Batch processing failed');
      });
    });

    it('should return empty array when user has no PNRs', async () => {
      // Create new user with no PNRs
      const newUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'testpassword123',
          name: 'New User'
        });

      const newUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'testpassword123'
        });

      const newUserToken = newUserLogin.body.data.accessToken;

      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.message).toBe('No PNRs found to check');
    });

    it('should use cached batch results when available', async () => {
      // First request - should process batch
      const firstResponse = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(firstResponse.status).toBe(200);
      expect(BatchProcessorService.processBatch).toHaveBeenCalledTimes(1);

      // Second request - should use cache (for all PNRs, not specific ones)
      const secondResponse = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(secondResponse.status).toBe(200);
      // Should not call batch processor again due to caching
      expect(BatchProcessorService.processBatch).toHaveBeenCalledTimes(1);
    });

    it('should not use cache for specific PNR requests', async () => {
      // First request for all PNRs
      await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Second request for specific PNRs - should not use cache
      const specificResponse = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnrIds: [trackedPnrId]
        });

      expect(specificResponse.status).toBe(200);
      // Should call batch processor twice (once for all, once for specific)
      expect(BatchProcessorService.processBatch).toHaveBeenCalledTimes(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should validate request body structure', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnrIds: 'invalid-format' // Should be array
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate limiting and throttling', () => {
    it('should respect rate limiting in batch processing', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      
      // Verify batch processor was called with rate limiting options
      expect(BatchProcessorService.processBatch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          requestDelay: 1000, // 1 second between requests
          maxRetries: 2,
          retryDelay: 2000
        })
      );
    });
  });

  describe('Status change detection', () => {
    it('should detect and update status changes', async () => {
      // First check with confirmed status
      vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(mockConfirmedStatus);
      
      const firstResponse = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.body.data.status).toBe('CNF/S1/25');

      // Clear cache to force new request
      await CacheService.clearPNRStatus(mockConfirmedStatus.pnr);

      // Second check with different status
      const updatedStatus = { ...mockConfirmedStatus, status: 'CNF/S1/24' };
      vi.mocked(IRCTCScraperService.performRequest).mockResolvedValueOnce(updatedStatus);
      
      const secondResponse = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(secondResponse.body.data.status).toBe('CNF/S1/24');
    });
  });
});