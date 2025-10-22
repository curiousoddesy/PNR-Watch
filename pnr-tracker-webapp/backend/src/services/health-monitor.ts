/**
 * Health Monitoring Service
 * Provides system health checks and monitoring capabilities
 */

import { Pool } from 'pg';
import { logger } from './logger';
import { createClient } from 'redis';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    externalServices: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: any;
}

export class HealthMonitorService {
  private static instance: HealthMonitorService;
  private dbPool: Pool;
  private redisClient: any;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
    this.initializeConnections();
  }

  public static getInstance(): HealthMonitorService {
    if (!HealthMonitorService.instance) {
      HealthMonitorService.instance = new HealthMonitorService();
    }
    return HealthMonitorService.instance;
  }

  private initializeConnections(): void {
    // Initialize database pool
    this.dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Minimal pool for health checks
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    // Initialize Redis client for health checks
    if (process.env.REDIS_URL) {
      this.redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000
        }
      });
    }
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    logger.debug('Starting health check');

    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkExternalServices()
    ]);

    const [database, redis, memory, disk, externalServices] = checks.map(
      (result) => result.status === 'fulfilled' ? result.value : this.createUnhealthyCheck('Check failed')
    );

    // Determine overall status
    const allChecks = [database, redis, memory, disk, externalServices];
    const unhealthyCount = allChecks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = allChecks.filter(check => check.status === 'degraded').length;

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database,
        redis,
        memory,
        disk,
        externalServices
      }
    };

    const duration = Date.now() - startTime;
    logger.logSystem(`Health check completed`, {
      status: overallStatus,
      duration,
      unhealthyChecks: unhealthyCount,
      degradedChecks: degradedCount
    });

    return result;
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const client = await this.dbPool.connect();
      
      try {
        // Simple query to test connectivity
        await client.query('SELECT 1');
        
        // Check connection pool status
        const poolStatus = {
          totalCount: this.dbPool.totalCount,
          idleCount: this.dbPool.idleCount,
          waitingCount: this.dbPool.waitingCount
        };
        
        const responseTime = Date.now() - startTime;
        
        // Consider degraded if response time > 1 second
        const status = responseTime > 1000 ? 'degraded' : 'healthy';
        
        return {
          status,
          responseTime,
          message: status === 'degraded' ? 'Database responding slowly' : 'Database connection healthy',
          details: poolStatus
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
      
      return this.createUnhealthyCheck('Database connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheck> {
    if (!this.redisClient) {
      return {
        status: 'healthy',
        message: 'Redis not configured'
      };
    }

    const startTime = Date.now();
    
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }
      
      await this.redisClient.ping();
      
      const responseTime = Date.now() - startTime;
      const status = responseTime > 500 ? 'degraded' : 'healthy';
      
      return {
        status,
        responseTime,
        message: status === 'degraded' ? 'Redis responding slowly' : 'Redis connection healthy'
      };
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.createUnhealthyCheck('Redis connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheck> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      let message: string;
      
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = 'Critical memory usage';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
        message = 'High memory usage';
      } else {
        status = 'healthy';
        message = 'Memory usage normal';
      }
      
      return {
        status,
        message,
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
          usagePercent: Math.round(memoryUsagePercent * 100) / 100
        }
      };
    } catch (error) {
      return this.createUnhealthyCheck('Memory check failed');
    }
  }

  /**
   * Check disk space (simplified check)
   */
  private async checkDisk(): Promise<HealthCheck> {
    try {
      // This is a simplified check - in production you might want to use a library
      // to check actual disk space
      return {
        status: 'healthy',
        message: 'Disk space check not implemented'
      };
    } catch (error) {
      return this.createUnhealthyCheck('Disk check failed');
    }
  }

  /**
   * Check external services (IRCTC, email service, etc.)
   */
  private async checkExternalServices(): Promise<HealthCheck> {
    try {
      const checks = await Promise.allSettled([
        this.checkIRCTCService(),
        this.checkEmailService()
      ]);
      
      const results = checks.map(result => 
        result.status === 'fulfilled' ? result.value : false
      );
      
      const failedServices = results.filter(result => !result).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      let message: string;
      
      if (failedServices === results.length) {
        status = 'unhealthy';
        message = 'All external services unavailable';
      } else if (failedServices > 0) {
        status = 'degraded';
        message = `${failedServices} external service(s) unavailable`;
      } else {
        status = 'healthy';
        message = 'All external services available';
      }
      
      return {
        status,
        message,
        details: {
          irctc: results[0] ? 'available' : 'unavailable',
          email: results[1] ? 'available' : 'unavailable'
        }
      };
    } catch (error) {
      return this.createUnhealthyCheck('External services check failed');
    }
  }

  /**
   * Check IRCTC service availability
   */
  private async checkIRCTCService(): Promise<boolean> {
    try {
      // Simple HTTP check to IRCTC website
      const response = await fetch('http://www.indianrail.gov.in', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check email service availability
   */
  private async checkEmailService(): Promise<boolean> {
    try {
      // This would depend on your email service provider
      // For now, just return true if SMTP settings are configured
      return !!(process.env.SMTP_HOST && process.env.SMTP_PORT);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create unhealthy check result
   */
  private createUnhealthyCheck(message: string, details?: any): HealthCheck {
    return {
      status: 'unhealthy',
      message,
      details
    };
  }

  /**
   * Get basic system metrics
   */
  public getSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      uptime: Date.now() - this.startTime,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: process.cpuUsage(),
      version: {
        node: process.version,
        app: process.env.npm_package_version || '1.0.0'
      }
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.quit();
      }
      
      await this.dbPool.end();
      
      logger.logSystem('Health monitor cleanup completed');
    } catch (error) {
      logger.error('Error during health monitor cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const healthMonitor = HealthMonitorService.getInstance();