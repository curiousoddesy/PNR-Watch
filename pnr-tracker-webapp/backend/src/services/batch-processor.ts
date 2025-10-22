/**
 * Batch Processing Service for Multiple PNRs
 * Migrated from check-pnr-status/checkAllPnrStatus.js
 */

import { IRCTCScraperService } from './irctc-scraper';
import { PNRStatusResult } from '../types';

export interface BatchProcessingOptions {
  requestDelay?: number; // Delay between requests in milliseconds
  maxRetries?: number; // Maximum retry attempts for failed requests
  retryDelay?: number; // Base delay for exponential backoff
  maxConcurrent?: number; // Maximum concurrent requests (for future enhancement)
}

export interface BatchProcessingResult {
  results: PNRStatusResult[];
  flushedPNRs: string[];
  errors: BatchProcessingError[];
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  processingTime: number;
}

export interface BatchProcessingError {
  pnr: string;
  error: string;
  retryCount: number;
}

/**
 * Batch Processing Service for handling multiple PNR status checks
 * Implements rate limiting, retry logic, and error handling
 */
export class BatchProcessorService {
  private static readonly DEFAULT_OPTIONS: Required<BatchProcessingOptions> = {
    requestDelay: 1000, // 1 second between requests
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds base delay
    maxConcurrent: 1 // Sequential processing to avoid rate limiting
  };

  /**
   * Processes multiple PNRs with rate limiting and error handling
   * Migrated from checkAllPnrStatus.js functionality
   * @param pnrs - Array of PNR numbers to process
   * @param options - Processing options
   * @param progressCallback - Optional callback for progress updates
   * @returns Promise with batch processing results
   */
  static async processBatch(
    pnrs: string[],
    options: BatchProcessingOptions = {},
    progressCallback?: (current: number, total: number, currentPnr: string) => void
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    const results: PNRStatusResult[] = [];
    const flushedPNRs: string[] = [];
    const errors: BatchProcessingError[] = [];
    
    let totalSuccessful = 0;
    let totalFailed = 0;

    // Process PNRs sequentially to avoid rate limiting
    for (let i = 0; i < pnrs.length; i++) {
      const pnr = pnrs[i];
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback(i + 1, pnrs.length, pnr);
      }

      try {
        const result = await this.processWithRetry(pnr, opts);
        results.push(result);
        
        // Check if PNR is flushed
        if (result.isFlushed) {
          flushedPNRs.push(pnr);
        }
        
        // Count as successful if no error
        if (!result.error) {
          totalSuccessful++;
        } else {
          totalFailed++;
          errors.push({
            pnr,
            error: result.error,
            retryCount: opts.maxRetries
          });
        }
      } catch (error) {
        totalFailed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Add error result
        results.push({
          pnr,
          from: '',
          to: '',
          date: '',
          status: 'Error',
          isFlushed: false,
          lastUpdated: new Date(),
          error: errorMessage
        });
        
        errors.push({
          pnr,
          error: errorMessage,
          retryCount: opts.maxRetries
        });
      }

      // Add delay between requests (except for the last one)
      if (i < pnrs.length - 1) {
        await this.delay(opts.requestDelay);
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      results,
      flushedPNRs,
      errors,
      totalProcessed: pnrs.length,
      totalSuccessful,
      totalFailed,
      processingTime
    };
  }

  /**
   * Processes a single PNR with retry logic and exponential backoff
   * @param pnr - PNR number to process
   * @param options - Processing options
   * @returns Promise with PNR status result
   */
  private static async processWithRetry(
    pnr: string,
    options: Required<BatchProcessingOptions>
  ): Promise<PNRStatusResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const result = await IRCTCScraperService.performRequest(pnr);
        
        // If we got a result without network errors, return it
        // Even if it has parsing errors, we don't retry those
        if (!result.error || !this.isRetryableError(result.error)) {
          return result;
        }
        
        // If it's a retryable error and we have attempts left, continue
        if (attempt < options.maxRetries) {
          lastError = new Error(result.error);
          await this.delay(this.calculateBackoffDelay(attempt, options.retryDelay));
          continue;
        }
        
        // Last attempt, return the result even with error
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If this is the last attempt, throw the error
        if (attempt === options.maxRetries) {
          throw lastError;
        }
        
        // Wait before retrying with exponential backoff
        await this.delay(this.calculateBackoffDelay(attempt, options.retryDelay));
      }
    }
    
    // This should never be reached, but just in case
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Determines if an error is retryable
   * @param error - Error message
   * @returns true if error should be retried
   */
  private static isRetryableError(error: string): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'HTTP 5', // 5xx server errors
      'Request failed'
    ];
    
    return retryableErrors.some(retryableError => 
      error.toLowerCase().includes(retryableError.toLowerCase())
    );
  }

  /**
   * Calculates exponential backoff delay
   * @param attempt - Current attempt number (0-based)
   * @param baseDelay - Base delay in milliseconds
   * @returns Delay in milliseconds
   */
  private static calculateBackoffDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff: baseDelay * (2 ^ attempt) + random jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Creates a delay promise
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Processes PNRs with throttling to respect rate limits
   * @param pnrs - Array of PNR numbers
   * @param requestsPerMinute - Maximum requests per minute
   * @param progressCallback - Optional progress callback
   * @returns Promise with batch processing results
   */
  static async processWithThrottling(
    pnrs: string[],
    requestsPerMinute: number = 30, // Conservative rate limit
    progressCallback?: (current: number, total: number, currentPnr: string) => void
  ): Promise<BatchProcessingResult> {
    const delayBetweenRequests = Math.ceil(60000 / requestsPerMinute); // Convert to milliseconds
    
    return this.processBatch(
      pnrs,
      {
        requestDelay: delayBetweenRequests,
        maxRetries: 3,
        retryDelay: 2000
      },
      progressCallback
    );
  }

  /**
   * Filters out flushed PNRs from a list
   * @param pnrs - Array of PNR numbers
   * @returns Promise with filtered PNR list and flushed PNRs
   */
  static async filterFlushedPNRs(pnrs: string[]): Promise<{
    activePNRs: string[];
    flushedPNRs: string[];
  }> {
    const result = await this.processBatch(pnrs, { requestDelay: 500 });
    
    const activePNRs = result.results
      .filter(r => !r.isFlushed && !r.error)
      .map(r => r.pnr);
    
    return {
      activePNRs,
      flushedPNRs: result.flushedPNRs
    };
  }
}