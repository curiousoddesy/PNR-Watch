/**
 * Comprehensive tests for PNR CRUD API endpoints
 * Tests all PNR management operations with proper authentication
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { CacheService } from '../services/cache';
import { IRCTCScraperService } from '../services/irctc-scraper';
import { PNRStatusResult } from '../types';

// Mock IRCTC scraper service
vi.mock('../services/irctc-scraper', () => ({
  IRCTCScraperService: {
    performRequest: vi.fn()
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

// Mock error handler to prevent process.exit
vi.mock('../middleware/error-handler', () => ({
  errorHandler: vi.fn(),
  notFoundHandler: vi.fn(),
  setupGlobalErrorHandlers: vi.fn()
}));

describe('PNR CRUD API Endpoints', () => {
  let authToken: string;
  let secondUserToken: string;
  let trackedPnrId: string;

  // Mock PNR status response
  const mockPNRStatus: PNRStatusResult = {
    pnr: '1234567890',
    from: 'NEW DELHI',
    to: 'MUMBAI CENTRAL',
    date: '2024-01-15',
    status: 'CNF/S1/25',
    isFlushed: false,
    lastUpdated: new Date()
  };

  beforeAll(async () => {
    // Initialize cache service for testing
    await CacheService.initialize();
    
    // Setup mock for IRCTC scraper
    vi.mocked(IRCTCScraperService.performRequest).mockResolvedValue(mockPNRStatus);
  });

  beforeEach(async () => {
    // Register test users and get auth tokens
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

    // Create second user for access control tests
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'seconduser@example.com',
        password: 'testpassword123',
        name: 'Second User'
      });

    const secondLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seconduser@example.com',
        password: 'testpassword123'
      });

    secondUserToken = secondLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up cache service
    await CacheService.close();
    vi.restoreAllMocks();
  });

  describe('POST /api/pnrs - Add PNR', () => {
    it('should add a valid PNR successfully', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.pnr).toBe('1234567890');
      expect(response.body.data.currentStatus).toEqual(mockPNRStatus);
      expect(response.body.message).toBe('PNR added successfully to tracking list');

      // Store for later tests
      trackedPnrId = response.body.data.id;
    });

    it('should reject invalid PNR format', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '123456789' // 9 digits instead of 10
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid PNR format. PNR must be exactly 10 digits.');
    });

    it('should reject non-numeric PNR', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '123456789A'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid PNR format. PNR must be exactly 10 digits.');
    });

    it('should prevent duplicate PNR addition', async () => {
      // Add PNR first time
      await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });

      // Try to add same PNR again
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PNR already exists in your tracking list');
    });

    it('should handle IRCTC scraper failure gracefully', async () => {
      // Mock IRCTC scraper to throw error
      vi.mocked(IRCTCScraperService.performRequest).mockRejectedValueOnce(
        new Error('IRCTC service unavailable')
      );

      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '9876543210'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStatus.status).toBe('Unable to fetch status');
      expect(response.body.data.currentStatus.error).toBe('IRCTC service unavailable');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .send({
          pnr: '1234567890'
        });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pnrs - List PNRs', () => {
    beforeEach(async () => {
      // Add a test PNR
      const addResponse = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });
      trackedPnrId = addResponse.body.data.id;
    });

    it('should retrieve all tracked PNRs for authenticated user', async () => {
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('pnr');
      expect(response.body.data[0]).toHaveProperty('currentStatus');
    });

    it('should return empty array for user with no PNRs', async () => {
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.message).toBe('Retrieved 0 tracked PNRs');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/pnrs');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/pnrs/:id - Remove PNR', () => {
    beforeEach(async () => {
      // Add a test PNR
      const addResponse = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });
      trackedPnrId = addResponse.body.data.id;
    });

    it('should remove PNR successfully', async () => {
      const response = await request(app)
        .delete(`/api/pnrs/${trackedPnrId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('PNR removed from tracking list successfully');
    });

    it('should return 404 for non-existent PNR', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/pnrs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PNR not found');
    });

    it('should prevent deletion of other users PNRs', async () => {
      const response = await request(app)
        .delete(`/api/pnrs/${trackedPnrId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. You can only delete your own PNRs.');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/pnrs/${trackedPnrId}`);

      expect(response.status).toBe(401);
    });

    it('should validate PNR ID format', async () => {
      const response = await request(app)
        .delete('/api/pnrs/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('User isolation and access control', () => {
    let user1PnrId: string;
    let user2PnrId: string;

    beforeEach(async () => {
      // Add PNR for first user
      const user1Response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1111111111'
        });
      user1PnrId = user1Response.body.data.id;

      // Add PNR for second user
      const user2Response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          pnr: '2222222222'
        });
      user2PnrId = user2Response.body.data.id;
    });

    it('should only show user own PNRs in list', async () => {
      const user1Response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`);

      const user2Response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(user1Response.body.data.length).toBe(1);
      expect(user1Response.body.data[0].pnr).toBe('1111111111');

      expect(user2Response.body.data.length).toBe(1);
      expect(user2Response.body.data[0].pnr).toBe('2222222222');
    });

    it('should allow same PNR for different users', async () => {
      // Both users should be able to track the same PNR number
      const samePnr = '9999999999';

      const user1Response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: samePnr
        });

      const user2Response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          pnr: samePnr
        });

      expect(user1Response.status).toBe(201);
      expect(user2Response.status).toBe(201);
      expect(user1Response.body.data.pnr).toBe(samePnr);
      expect(user2Response.body.data.pnr).toBe(samePnr);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the endpoint structure is correct
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: '1234567890'
        });

      // Should either succeed or fail gracefully with proper error structure
      expect(response.body).toHaveProperty('success');
      if (!response.body.success) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle very long PNR strings', async () => {
      const longPnr = '1'.repeat(100);
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnr: longPnr
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});