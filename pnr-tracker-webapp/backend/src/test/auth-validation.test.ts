import { describe, it, expect } from 'vitest';
import Joi from 'joi';
import { 
  userRegistrationSchema, 
  userLoginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  validateRequest
} from '../validation/auth';

describe('Authentication Validation Tests', () => {
  describe('User Registration Validation', () => {
    it('should validate correct user registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!'
      };

      const { error, value } = userRegistrationSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value).toEqual(expect.objectContaining(validData));
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email address');
    });

    it('should reject weak password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('at least 8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepass123!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SECUREPASS123!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('lowercase letter');
    });

    it('should reject password without number', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('number');
    });

    it('should reject password without special character', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('special character');
    });

    it('should reject invalid name with numbers', () => {
      const invalidData = {
        name: 'John123',
        email: 'john@example.com',
        password: 'SecurePass123!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('letters and spaces');
    });

    it('should reject name that is too short', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        password: 'SecurePass123!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('at least 2 characters');
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'A'.repeat(51),
        email: 'john@example.com',
        password: 'SecurePass123!'
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('cannot exceed 50 characters');
    });

    it('should handle optional notification preferences', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!'
      };

      const { error, value } = userRegistrationSchema.validate(validData);
      expect(error).toBeUndefined();
      // notificationPreferences is optional, so it may not be present
      expect(value).toEqual(expect.objectContaining(validData));
    });

    it('should accept custom notification preferences', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        notificationPreferences: {
          emailEnabled: false,
          pushEnabled: true,
          inAppEnabled: false,
          statusTypes: ['confirmation']
        }
      };

      const { error, value } = userRegistrationSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value.notificationPreferences).toEqual(validData.notificationPreferences);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        email: 'john@example.com'
        // missing name and password
      };

      const { error } = userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details.length).toBeGreaterThanOrEqual(1); // At least one missing field
      
      // Check that it specifically mentions missing required fields
      const errorMessages = error?.details.map(detail => detail.message) || [];
      expect(errorMessages.some(msg => msg.includes('required'))).toBe(true);
    });
  });

  describe('User Login Validation', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'anypassword'
      };

      const { error, value } = userLoginSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'anypassword'
      };

      const { error } = userLoginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email address');
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'anypassword'
      };

      const { error } = userLoginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Email is required');
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'john@example.com'
      };

      const { error } = userLoginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Password is required');
    });
  });

  describe('Password Reset Request Validation', () => {
    it('should validate correct password reset request', () => {
      const validData = {
        email: 'john@example.com'
      };

      const { error, value } = passwordResetRequestSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email'
      };

      const { error } = passwordResetRequestSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email address');
    });

    it('should reject missing email', () => {
      const invalidData = {};

      const { error } = passwordResetRequestSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Email is required');
    });
  });

  describe('Password Reset Validation', () => {
    it('should validate correct password reset data', () => {
      const validData = {
        token: 'valid-reset-token',
        password: 'NewSecurePass123!'
      };

      const { error, value } = passwordResetSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should reject missing token', () => {
      const invalidData = {
        password: 'NewSecurePass123!'
      };

      const { error } = passwordResetSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Reset token is required');
    });

    it('should reject weak password', () => {
      const invalidData = {
        token: 'valid-reset-token',
        password: '123'
      };

      const { error } = passwordResetSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('at least 8 characters');
    });

    it('should reject password without required complexity', () => {
      const invalidData = {
        token: 'valid-reset-token',
        password: 'simplepassword'
      };

      const { error } = passwordResetSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('uppercase letter');
    });
  });

  describe('Validation Middleware', () => {
    it('should pass valid data through middleware', () => {
      const mockReq = {
        body: {
          email: 'john@example.com',
          password: 'anypassword'
        }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const mockNext = vi.fn();

      const middleware = validateRequest(userLoginSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should reject invalid data in middleware', () => {
      const mockReq = {
        body: {
          email: 'invalid-email',
          password: 'anypassword'
        }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const mockNext = vi.fn();

      const middleware = validateRequest(userLoginSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('valid email address')
        ])
      });
    });

    it('should sanitize and strip unknown fields', () => {
      const mockReq = {
        body: {
          email: 'john@example.com',
          password: 'anypassword',
          unknownField: 'should be removed'
        }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const mockNext = vi.fn();

      const middleware = validateRequest(userLoginSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        email: 'john@example.com',
        password: 'anypassword'
      });
      expect(mockReq.body).not.toHaveProperty('unknownField');
    });

    it('should return multiple validation errors', () => {
      const mockReq = {
        body: {
          email: 'invalid-email'
          // missing password
        }
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const mockNext = vi.fn();

      const middleware = validateRequest(userLoginSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.stringContaining('valid email address'),
          expect.stringContaining('Password is required')
        ])
      });
    });
  });
});