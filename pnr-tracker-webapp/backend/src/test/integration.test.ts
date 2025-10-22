import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { pool } from '../config/database';

describe('API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let pnrId: string;
  
  const testUser = {
    name: 'Integration Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  beforeAll(async () => {
    // Ensure database is ready
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await pool.end();
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should access protected route with valid token', async () => {
      await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should reject access without token', async () => {
      await request(app)
        .get('/api/pnrs')
        .expect(401);
    });
  });

  describe('PNR Management Flow', () => {
    const testPNR = '1234567890';

    it('should add a new PNR', async () => {
      const response = await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pnr: testPNR })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.pnr).toBe(testPNR);
      expect(response.body.userId).toBe(userId);
      
      pnrId = response.body.id;
    });

    it('should reject invalid PNR format', async () => {
      await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pnr: '123' })
        .expect(400);
    });

    it('should prevent duplicate PNRs', async () => {
      await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pnr: testPNR })
        .expect(409);
    });

    it('should retrieve user PNRs', async () => {
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('pnr', testPNR);
    });

    it('should check PNR status (may fail due to invalid test PNR)', async () => {
      // This test may fail due to IRCTC validation, but should not crash
      const response = await request(app)
        .get(`/api/pnrs/${pnrId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      // Accept either success or validation error
      expect([200, 400, 404]).toContain(response.status);
    });

    it('should get PNR history', async () => {
      const response = await request(app)
        .get(`/api/pnrs/${pnrId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should delete PNR', async () => {
      await request(app)
        .delete(`/api/pnrs/${pnrId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify PNR is deleted
      const response = await request(app)
        .get('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedPNR = response.body.find((p: any) => p.id === pnrId);
      expect(deletedPNR).toBeUndefined();
    });
  });

  describe('Notification System', () => {
    it('should retrieve notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Health and Monitoring', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('application');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' }) // missing name and password
        .expect(400);
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject requests with invalid tokens', async () => {
      await request(app)
        .get('/api/pnrs')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Data Validation', () => {
    it('should validate email format in registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'TestPassword123!'
        })
        .expect(400);
    });

    it('should validate password strength', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123' // too weak
        })
        .expect(400);
    });

    it('should validate PNR format', async () => {
      await request(app)
        .post('/api/pnrs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pnr: 'invalid-pnr' })
        .expect(400);
    });
  });
});