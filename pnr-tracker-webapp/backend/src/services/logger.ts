/**
 * Structured Logging Service
 * Provides centralized logging with different levels and structured output
 */

import winston from 'winston';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// Log categories for better organization
export enum LogCategory {
  AUTH = 'auth',
  PNR = 'pnr',
  NOTIFICATION = 'notification',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  SCHEDULER = 'scheduler',
  SYSTEM = 'system',
  SECURITY = 'security'
}

interface LogMetadata {
  category?: LogCategory;
  userId?: string;
  pnr?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

class LoggerService {
  private logger: winston.Logger;
  private static instance: LoggerService;

  private constructor() {
    this.logger = this.createLogger();
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private createLogger(): winston.Logger {
    const logDir = 'logs';
    
    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, category, ...meta } = info;
        return JSON.stringify({
          timestamp,
          level,
          category: category || LogCategory.SYSTEM,
          message,
          ...meta
        });
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf((info) => {
        const { timestamp, level, message, category } = info;
        return `${timestamp} [${level}] ${category ? `[${category}]` : ''} ${message}`;
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: customFormat,
      transports: [
        // Error log file
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Combined log file
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 10,
          tailable: true
        }),
        
        // Auth-specific log file
        new winston.transports.File({
          filename: path.join(logDir, 'auth.log'),
          level: 'info',
          maxsize: 5242880, // 5MB
          maxFiles: 3,
          tailable: true,
          format: winston.format.combine(
            customFormat,
            winston.format((info) => {
              return info.category === LogCategory.AUTH ? info : false;
            })()
          )
        }),
        
        // Security log file
        new winston.transports.File({
          filename: path.join(logDir, 'security.log'),
          level: 'warn',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true,
          format: winston.format.combine(
            customFormat,
            winston.format((info) => {
              return info.category === LogCategory.SECURITY ? info : false;
            })()
          )
        }),
        
        // Console output
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat
        })
      ]
    });
  }

  /**
   * Log error message
   */
  public error(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, metadata);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, metadata);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, metadata);
  }

  /**
   * Log HTTP request
   */
  public http(message: string, metadata?: LogMetadata): void {
    this.logger.http(message, metadata);
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, metadata);
  }

  /**
   * Log authentication events
   */
  public logAuth(event: string, metadata?: LogMetadata): void {
    this.info(`Auth: ${event}`, {
      ...metadata,
      category: LogCategory.AUTH
    });
  }

  /**
   * Log PNR operations
   */
  public logPNR(event: string, metadata?: LogMetadata): void {
    this.info(`PNR: ${event}`, {
      ...metadata,
      category: LogCategory.PNR
    });
  }

  /**
   * Log notification events
   */
  public logNotification(event: string, metadata?: LogMetadata): void {
    this.info(`Notification: ${event}`, {
      ...metadata,
      category: LogCategory.NOTIFICATION
    });
  }

  /**
   * Log database operations
   */
  public logDatabase(event: string, metadata?: LogMetadata): void {
    this.info(`Database: ${event}`, {
      ...metadata,
      category: LogCategory.DATABASE
    });
  }

  /**
   * Log external API calls
   */
  public logExternalAPI(event: string, metadata?: LogMetadata): void {
    this.info(`External API: ${event}`, {
      ...metadata,
      category: LogCategory.EXTERNAL_API
    });
  }

  /**
   * Log scheduler events
   */
  public logScheduler(event: string, metadata?: LogMetadata): void {
    this.info(`Scheduler: ${event}`, {
      ...metadata,
      category: LogCategory.SCHEDULER
    });
  }

  /**
   * Log security events
   */
  public logSecurity(event: string, metadata?: LogMetadata): void {
    this.warn(`Security: ${event}`, {
      ...metadata,
      category: LogCategory.SECURITY
    });
  }

  /**
   * Log system events
   */
  public logSystem(event: string, metadata?: LogMetadata): void {
    this.info(`System: ${event}`, {
      ...metadata,
      category: LogCategory.SYSTEM
    });
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, duration: number, metadata?: LogMetadata): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, {
      ...metadata,
      duration,
      category: LogCategory.SYSTEM
    });
  }

  /**
   * Log request/response cycle
   */
  public logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    metadata?: LogMetadata
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;
    
    this.logger.log(level, `${method} ${url} ${statusCode} - ${duration}ms`, {
      ...metadata,
      method,
      url,
      statusCode,
      duration,
      category: LogCategory.SYSTEM
    });
  }

  /**
   * Create child logger with default metadata
   */
  public child(defaultMetadata: LogMetadata): winston.Logger {
    return this.logger.child(defaultMetadata);
  }

  /**
   * Get the underlying winston logger instance
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();

// Export types for use in other modules
export { LogMetadata };