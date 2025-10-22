/**
 * Comprehensive tests for PNR History Endpoints
 * Tests history retrieval and pagination functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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

describe('PNR History API Endpoints', () => {
  let authToken: string;
  let secondUserToken: string;
  let trackedPnrId: string;

  // Mock PNR status for creating history
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

    // Add a test PNR to create history
    const addPnrResponse = await request(app)
      .post('/api/pnrs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        pnr: '1234567890'
      });

    trackedPnrId = addPnrResponse.body.data.id;

    // Generate some history by checking status multiple times
    await request(app)
      .get(`/api/pnrs/${trackedPnrId}/status`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  afterAll(async () => {
    // Clean up cache service
    await CacheService.close();
    vi.restoreAllMocks();
  });

  describe('GET /api/pnrs/:id/history - PNR History Retrieval', () => {
    it('should get paginated history for a specific PNR', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      
      // Check pagination structure
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should use default pagination when not specified', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20); // Default limit
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 0, limit: -1 }); // Invalid values

      expect(response.status).toBe(400);
    });

    it('should handle large page numbers gracefully', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 999, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]); // No data on page 999
      expect(response.body.pagination.page).toBe(999);
    });

    it('should return proper history entry structure', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.data.length > 0) {
        const historyEntry = response.body.data[0];
        expect(historyEntry).toHaveProperty('id');
        expect(historyEntry).toHaveProperty('trackedPnrId');
        expect(historyEntry).toHaveProperty('statusData');
        expect(historyEntry).toHaveProperty('checkedAt');
        expect(historyEntry).toHaveProperty('statusChanged');
        
        // Check statusData structure
        expect(historyEntry.statusData).toHaveProperty('pnr');
        expect(historyEntry.statusData).toHaveProperty('from');
        expect(historyEntry.statusData).toHaveProperty('to');
        expect(historyEntry.statusData).toHaveProperty('status');
        expect(historyEntry.statusData).toHaveProperty('lastUpdated');
      }
    });

    it('should return 404 for non-existent PNR', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/pnrs/${fakeId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PNR not found');
    });

    it('should prevent access to other users PNR history', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. You can only view history for your own PNRs.');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`);

      expect(response.status).toBe(401);
    });

    it('should validate PNR ID format', async () => {
      const response = await request(app)
        .get('/api/pnrs/invalid-id/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pnrs/export/history - History Export', () => {
    it('should export user history in JSON format', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.json');
      
      expect(response.body).toHaveProperty('metadata');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check metadata structure
      expect(response.body.metadata).toHaveProperty('exportedAt');
      expect(response.body.metadata).toHaveProperty('userId');
      expect(response.body.metadata).toHaveProperty('totalPNRs');
      expect(response.body.metadata).toHaveProperty('totalHistoryEntries');
      expect(response.body.metadata.format).toBe('json');
    });

    it('should export user history in CSV format', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
      
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('PNR,From,To,Date,Status,Checked At,Status Changed,Is Active');
      
      // Should contain the test PNR data
      expect(response.text).toContain('1234567890');
    });

    it('should default to JSON format when format not specified', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata.format).toBe('json');
    });

    it('should handle unsupported export formats gracefully', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'xml' });

      // Should default to JSON for unsupported formats
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should return 404 when user has no history to export', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No PNR history found to export');
    });

    it('should include inactive PNRs in export', async () => {
      // Delete the PNR (soft delete)
      await request(app)
        .delete(`/api/pnrs/${trackedPnrId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Export should still include the deleted PNR's history
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should include the inactive PNR
      const inactivePnr = response.body.data.find((pnrData: any) => 
        pnrData.pnr.pnr === '1234567890' && !pnrData.pnr.isActive
      );
      expect(inactivePnr).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history');

      expect(response.status).toBe(401);
    });

    it('should generate proper filename with date', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      
      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(/pnr-history-.*-\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe('Pagination edge cases', () => {
    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 1000 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(1000);
    });

    it('should calculate total pages correctly', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      
      const { total, limit, totalPages } = response.body.pagination;
      expect(totalPages).toBe(Math.ceil(total / limit));
    });

    it('should handle string pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: '2', limit: '5' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('History data integrity', () => {
    it('should maintain chronological order in history', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 100 });

      expect(response.status).toBe(200);
      
      if (response.body.data.length > 1) {
        // History should be ordered by checkedAt descending (newest first)
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = new Date(response.body.data[i].checkedAt);
          const next = new Date(response.body.data[i + 1].checkedAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should include status change indicators', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.data.length > 0) {
        response.body.data.forEach((entry: any) => {
          expect(entry).toHaveProperty('statusChanged');
          expect(typeof entry.statusChanged).toBe('boolean');
        });
      }
    });
  });
});