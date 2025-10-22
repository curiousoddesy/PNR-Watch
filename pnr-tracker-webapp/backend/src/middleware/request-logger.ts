/**
 * Request Logging Middleware
 * Logs HTTP requests and responses with structured information
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger';
import { metricsCollector } from '../services/metrics-collector';

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Generate unique request ID and add to request object
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

/**
 * Log incoming requests and outgoing responses
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = req.startTime || Date.now();
  
  // Log incoming request
  logger.http('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: (req as any).user?.id
  });

  // Override res.end to capture response details
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: any, cb?: any): any {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    // Record metrics
    metricsCollector.recordRequest(duration, isError);
    
    // Log response
    logger.logRequest(
      req.method,
      req.url,
      res.statusCode,
      duration,
      {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
        responseSize: res.get('Content-Length')
      }
    );

    // Log slow requests as warnings
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }

    // Call original end method
    return originalEnd(chunk, encoding, cb);
  };

  next();
};

/**
 * Log sensitive operations (authentication, data changes)
 */
export const sensitiveOperationLogger = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    logger.logSecurity(`Sensitive operation: ${operation}`, {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      operation
    });
    
    next();
  };
};

/**
 * Log failed authentication attempts
 */
export const authFailureLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Log failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.logSecurity('Authentication/Authorization failure', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        error: body.error
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Log rate limit violations
 */
export const rateLimitLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Log rate limit violations
    if (res.statusCode === 429) {
      logger.logSecurity('Rate limit exceeded', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: body.error
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};