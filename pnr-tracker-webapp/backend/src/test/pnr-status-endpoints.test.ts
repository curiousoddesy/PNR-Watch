/**
 * Test for PNR Status Checking Endpoints
 * Tests the new endpoints: GET /api/pnrs/:id/status and POST /api/pnrs/check-all
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { CacheService } from '../services/cache';

describe('PNR Status Checking Endpoints', () => {
  let authToken: string;
  let trackedPnrId: string;

  beforeAll(async () => {
    // Initialize cache service for testing
    await CacheService.initialize();
    
    // Register a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.data.accessToken;

    // Add a test PNR
    const addPnrResponse = await request(app)
      .post('/api/pnrs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        pnr: '1234567890'
      });

    trackedPnrId = addPnrResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up cache service
    await CacheService.close();
  });

  describe('GET /api/pnrs/:id/status', () => {
    it('should get status for a specific PNR', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pnr');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('lastUpdated');
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

  describe('POST /api/pnrs/check-all', () => {
    it('should check all PNRs for authenticated user', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check that each result has required properties
      response.body.data.forEach((result: any) => {
        expect(result).toHaveProperty('pnr');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('lastUpdated');
      });
    });

    it('should check specific PNRs when pnrIds provided', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pnrIds: [trackedPnrId]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    it('should return empty array when no PNRs to check', async () => {
      // Create a new user with no PNRs
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

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/pnrs/check-all')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/pnrs/:id/history', () => {
    it('should get paginated history for a specific PNR', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should return 404 for non-existent PNR history', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/pnrs/${fakeId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PNR not found');
    });

    it('should use default pagination when not specified', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/history`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/pnrs/export/history', () => {
    it('should export user history in JSON format', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should export user history in CSV format', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('PNR,From,To,Date,Status');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/pnrs/export/history');

      expect(response.status).toBe(401);
    });
  });

  describe('Caching functionality', () => {
    it('should use cache for repeated requests', async () => {
      // First request - should fetch from IRCTC
      const firstResponse = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.status).toBe(200);

      // Second request - should use cache (faster response)
      const secondResponse = await request(app)
        .get(`/api/pnrs/${trackedPnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.pnr).toBe(firstResponse.body.data.pnr);
    });
  });
});