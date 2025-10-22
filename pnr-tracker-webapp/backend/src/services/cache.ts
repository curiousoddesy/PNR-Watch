/**
 * Cache Service
 * Provides Redis-based caching for PNR status to reduce IRCTC request frequency
 */

import { createClient, RedisClientType } from 'redis';
import { PNRStatusResult } from '../types';
import { logger } from './logger';

export class CacheService {
  private static client: RedisClientType | null = null;
  private static isConnected = false;

  // Cache TTL in seconds (30 minutes for PNR status)
  private static readonly PNR_STATUS_TTL = 30 * 60; // 30 minutes
  private static readonly BATCH_CHECK_TTL = 10 * 60; // 10 minutes for batch results

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after 10 retries', { retries });
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Don't throw error - app should work without cache
    }
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if cache is available
   */
  static isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get cached PNR status
   * @param pnr - PNR number
   * @returns Cached status or null if not found
   */
  static async getPNRStatus(pnr: string): Promise<PNRStatusResult | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = `pnr:status:${pnr}`;
      const cached = await this.client!.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached) as PNRStatusResult;
        // Convert lastUpdated back to Date object
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        
        logger.info('Cache hit for PNR status', { pnr });
        return parsed;
      }
      
      logger.info('Cache miss for PNR status', { pnr });
      return null;
    } catch (error) {
      logger.error('Error getting cached PNR status', { 
        pnr, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Cache PNR status
   * @param pnr - PNR number
   * @param status - Status to cache
   */
  static async setPNRStatus(pnr: string, status: PNRStatusResult): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const key = `pnr:status:${pnr}`;
      const value = JSON.stringify(status);
      
      await this.client!.setEx(key, this.PNR_STATUS_TTL, value);
      logger.info('Cached PNR status', { pnr, ttl: this.PNR_STATUS_TTL });
    } catch (error) {
      logger.error('Error caching PNR status', { 
        pnr, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get cached batch check result
   * @param userId - User ID
   * @returns Cached batch result or null
   */
  static async getBatchCheckResult(userId: string): Promise<PNRStatusResult[] | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = `batch:check:${userId}`;
      const cached = await this.client!.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached) as PNRStatusResult[];
        // Convert lastUpdated back to Date objects
        parsed.forEach(result => {
          result.lastUpdated = new Date(result.lastUpdated);
        });
        
        logger.info('Cache hit for batch check', { userId });
        return parsed;
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting cached batch result', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Cache batch check result
   * @param userId - User ID
   * @param results - Results to cache
   */
  static async setBatchCheckResult(userId: string, results: PNRStatusResult[]): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const key = `batch:check:${userId}`;
      const value = JSON.stringify(results);
      
      await this.client!.setEx(key, this.BATCH_CHECK_TTL, value);
      logger.info('Cached batch check result', { userId, count: results.length });
    } catch (error) {
      logger.error('Error caching batch result', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Invalidate cached PNR status
   * @param pnr - PNR number
   */
  static async invalidatePNRStatus(pnr: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const key = `pnr:status:${pnr}`;
      await this.client!.del(key);
      logger.info('Invalidated cached PNR status', { pnr });
    } catch (error) {
      logger.error('Error invalidating cached PNR status', { 
        pnr, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Invalidate user's batch check cache
   * @param userId - User ID
   */
  static async invalidateBatchCheckResult(userId: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const key = `batch:check:${userId}`;
      await this.client!.del(key);
      logger.info('Invalidated batch check cache', { userId });
    } catch (error) {
      logger.error('Error invalidating batch check cache', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{ connected: boolean; info?: any }> {
    if (!this.isAvailable()) {
      return { connected: false };
    }

    try {
      const info = await this.client!.info();
      return { connected: true, info };
    } catch (error) {
      return { connected: false };
    }
  }
}