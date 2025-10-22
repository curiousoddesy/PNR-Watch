import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';
import { User } from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Authentication middleware to protect routes
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Invalid token format. Use Bearer <token>'
      });
      return;
    }

    const authService = AuthService.getInstance();
    const user = await authService.verifyAccessToken(token);
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const authService = AuthService.getInstance();
        const user = await authService.verifyAccessToken(token);
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(rateLimitStore).forEach(key => {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    });
    
    if (!rateLimitStore[clientId]) {
      rateLimitStore[clientId] = {
        count: 1,
        resetTime: now + windowMs
      };
      next();
      return;
    }
    
    const clientData = rateLimitStore[clientId];
    
    if (clientData.resetTime < now) {
      // Reset window
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      next();
      return;
    }
    
    if (clientData.count >= maxAttempts) {
      const remainingTime = Math.ceil((clientData.resetTime - now) / 1000 / 60);
      res.status(429).json({
        success: false,
        error: `Too many authentication attempts. Try again in ${remainingTime} minutes.`
      });
      return;
    }
    
    clientData.count++;
    next();
  };
};

/**
 * Middleware to ensure user owns the resource
 */
export const ensureOwnership = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const resourceUserId = req.params[userIdParam];
    
    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        error: 'User ID parameter is required'
      });
      return;
    }
    
    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.'
      });
      return;
    }
    
    next();
  };
};