import { describe, it, expect, beforeAll, vi } from 'vitest';
import { AuthService } from '../services/auth';
import { User } from '../models/User';
import bcrypt from 'bcrypt';

// Mock the database connection
vi.mock('../config/database', () => ({
  default: {
    getInstance: () => ({
      query: vi.fn().mockResolvedValue({ rows: [] })
    })
  }
}));

describe('Authentication Service Tests', () => {
  let authService: AuthService;
  
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  beforeAll(() => {
    authService = AuthService.getInstance();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await User.hashPassword(password);
      
      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await User.hashPassword(password);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token Generation and Validation', () => {
    const mockUser = new User({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: testUser.email,
      name: testUser.name,
      passwordHash: 'mock-hash'
    });

    it('should generate valid access token', () => {
      const token = authService.generateAccessToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate valid refresh token', () => {
      const token = authService.generateRefreshToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should reject invalid access token', async () => {
      await expect(authService.verifyAccessToken('invalid-token'))
        .rejects.toThrow('Invalid or expired token');
    });

    it('should reject malformed access token', async () => {
      await expect(authService.verifyAccessToken('not.a.jwt'))
        .rejects.toThrow('Invalid or expired token');
    });

    it('should reject refresh token used as access token', async () => {
      const refreshToken = authService.generateRefreshToken(mockUser);
      await expect(authService.verifyAccessToken(refreshToken))
        .rejects.toThrow('Invalid or expired token');
    });
  });

  describe('Token Cleanup', () => {
    it('should clean up expired tokens without error', async () => {
      // This test verifies the cleanup method runs without error
      await expect(authService.cleanupExpiredTokens()).resolves.not.toThrow();
    });
  });
});