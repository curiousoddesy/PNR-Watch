import express, { Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { 
  validateRequest, 
  userRegistrationSchema, 
  userLoginSchema,
  passwordResetRequestSchema,
  passwordResetSchema
} from '../validation/auth';
import { authenticateToken, authRateLimit, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, AuthResult } from '../types';

const router = express.Router();
const authService = AuthService.getInstance();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', 
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  validateRequest(userRegistrationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result: AuthResult = await authService.registerUser(req.body);
      
      const response: ApiResponse<AuthResult> = {
        success: true,
        data: result,
        message: 'User registered successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };
      
      // Return 409 for duplicate email, 400 for other validation errors
      const statusCode = errorMessage.includes('already exists') ? 409 : 400;
      res.status(statusCode).json(response);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login',
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validateRequest(userLoginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result: AuthResult = await authService.authenticateUser(req.body);
      
      const response: ApiResponse<AuthResult> = {
        success: true,
        data: result,
        message: 'Login successful'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };
      
      res.status(401).json(response);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token is required'
      };
      res.status(400).json(response);
      return;
    }
    
    const newAccessToken = await authService.refreshAccessToken(refreshToken);
    
    const response: ApiResponse<{ accessToken: string }> = {
      success: true,
      data: { accessToken: newAccessToken },
      message: 'Token refreshed successfully'
    };
    
    res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    
    const response: ApiResponse = {
      success: false,
      error: errorMessage
    };
    
    res.status(401).json(response);
  }
});

/**
 * POST /api/auth/logout
 * Logout user by revoking refresh token
 */
router.post('/logout', 
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await authService.revokeRefreshToken(req.user.id!);
      
      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      
      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', 
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const response: ApiResponse = {
        success: true,
        data: req.user.toJSON(),
        message: 'User profile retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user profile';
      
      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
  authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  validateRequest(passwordResetRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      const resetToken = await authService.generatePasswordResetToken(email);
      
      // In a real application, you would send this token via email
      // For now, we'll return it in the response (NOT recommended for production)
      const response: ApiResponse<{ resetToken: string }> = {
        success: true,
        data: { resetToken },
        message: 'Password reset token generated. Check your email for instructions.'
      };
      
      res.status(200).json(response);
    } catch (error) {
      // Always return success to prevent email enumeration attacks
      const response: ApiResponse = {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };
      
      res.status(200).json(response);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password',
  authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  validateRequest(passwordResetSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      
      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      
      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };
      
      res.status(400).json(response);
    }
  }
);

/**
 * POST /api/auth/verify-reset-token
 * Verify if password reset token is valid
 */
router.post('/verify-reset-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Reset token is required'
      };
      res.status(400).json(response);
      return;
    }
    
    await authService.verifyPasswordResetToken(token);
    
    const response: ApiResponse = {
      success: true,
      message: 'Reset token is valid'
    };
    
    res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid reset token';
    
    const response: ApiResponse = {
      success: false,
      error: errorMessage
    };
    
    res.status(400).json(response);
  }
});

export default router;