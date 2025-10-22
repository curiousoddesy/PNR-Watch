/**
 * Comprehensive Error Handling Middleware
 * Implements global error handling for API endpoints with user-friendly messages
 * and structured logging for system administrators
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'joi';
import winston from 'winston';

// Custom error classes for different error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errorCode?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      503,
      true,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, true, 'DATABASE_ERROR');
  }
}

// Error logger configuration
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// User-friendly error messages mapping
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'AUTHENTICATION_ERROR': 'Please log in to access this resource',
  'AUTHORIZATION_ERROR': 'You do not have permission to access this resource',
  'INVALID_TOKEN': 'Your session has expired. Please log in again',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again',
  
  // Validation errors
  'VALIDATION_ERROR': 'The provided data is invalid',
  'INVALID_PNR': 'Please enter a valid 10-digit PNR number',
  'INVALID_EMAIL': 'Please enter a valid email address',
  'WEAK_PASSWORD': 'Password must be at least 8 characters long with uppercase, lowercase, and numbers',
  
  // Resource errors
  'NOT_FOUND_ERROR': 'The requested resource was not found',
  'PNR_NOT_FOUND': 'PNR not found in your tracking list',
  'USER_NOT_FOUND': 'User account not found',
  
  // Conflict errors
  'CONFLICT_ERROR': 'This operation conflicts with existing data',
  'EMAIL_EXISTS': 'An account with this email already exists',
  'PNR_ALREADY_TRACKED': 'This PNR is already being tracked',
  
  // Rate limiting
  'RATE_LIMIT_ERROR': 'Too many requests. Please try again later',
  'AUTH_RATE_LIMIT': 'Too many login attempts. Please try again in 15 minutes',
  
  // External service errors
  'IRCTC_UNAVAILABLE': 'Railway service is temporarily unavailable. Please try again later',
  'EMAIL_SERVICE_ERROR': 'Unable to send email notification. Please try again later',
  'PUSH_SERVICE_ERROR': 'Unable to send push notification',
  
  // Database errors
  'DATABASE_ERROR': 'A database error occurred. Please try again',
  'CONNECTION_ERROR': 'Unable to connect to the database',
  
  // Generic errors
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later',
  'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later'
};

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: AppError | Error): string {
  if (error instanceof AppError && error.errorCode) {
    return ERROR_MESSAGES[error.errorCode] || error.message;
  }
  
  // Handle specific error patterns
  if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
    return ERROR_MESSAGES['EMAIL_EXISTS'];
  }
  
  if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
    return ERROR_MESSAGES['CONNECTION_ERROR'];
  }
  
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again';
  }
  
  return ERROR_MESSAGES['INTERNAL_ERROR'];
}

/**
 * Log error with structured information
 */
function logError(error: Error, req: Request, additionalInfo?: any): void {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode;
    errorInfo.errorCode = error.errorCode;
    errorInfo.isOperational = error.isOperational;
    errorInfo.details = error.details;
  }

  errorLogger.error('Application Error', errorInfo);
}

/**
 * Handle Joi validation errors
 */
function handleValidationError(error: ValidationError): AppError {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));

  return new ValidationAppError(
    'Validation failed',
    { validationErrors: details }
  );
}

/**
 * Handle database errors
 */
function handleDatabaseError(error: Error): AppError {
  // PostgreSQL error codes
  if (error.message.includes('23505')) { // Unique violation
    return new ConflictError('This record already exists');
  }
  
  if (error.message.includes('23503')) { // Foreign key violation
    return new ValidationAppError('Referenced record does not exist');
  }
  
  if (error.message.includes('23502')) { // Not null violation
    return new ValidationAppError('Required field is missing');
  }
  
  if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
    return new DatabaseError('Unable to connect to database');
  }

  return new DatabaseError('Database operation failed');
}

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError: AppError;

  // Convert known error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'ValidationError') {
    appError = handleValidationError(error as ValidationError);
  } else if (error.message.includes('pg_') || error.message.includes('database')) {
    appError = handleDatabaseError(error);
  } else if (error.name === 'JsonWebTokenError') {
    appError = new AuthenticationError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    appError = new AuthenticationError('Token expired');
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    appError = new ValidationAppError('Invalid JSON format');
  } else {
    // Unknown error - treat as internal server error
    appError = new AppError(
      'Internal server error',
      500,
      false,
      'INTERNAL_ERROR'
    );
  }

  // Log the error
  logError(error, req, {
    originalError: error.name,
    convertedTo: appError.constructor.name
  });

  // Send error response
  const response = {
    success: false,
    error: getUserFriendlyMessage(appError),
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        originalMessage: error.message,
        errorCode: appError.errorCode,
        stack: error.stack
      }
    })
  };

  res.status(appError.statusCode).json(response);
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError('API endpoint');
  
  logError(error, req, {
    type: 'Route not found'
  });

  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.path} not found`
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Graceful shutdown handler for uncaught exceptions
 */
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    errorLogger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    errorLogger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });
    
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
};