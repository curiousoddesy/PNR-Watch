import * as cron from 'node-cron';
import { TrackedPNR } from '../models/TrackedPNR';
import { BatchProcessorService } from './batch-processor';
import { StatusChangeDetector } from './status-change-detector';
import { NotificationQueue } from './notification-queue';
import { NotificationService } from './notification';
import { PNRArchiverService, ArchivingStats } from './pnr-archiver';
import { PNRStatusResult } from '../types';

export interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string;
  batchSize: number;
  requestDelay: number;
  maxRetries: number;
  archivingEnabled: boolean;
}

export interface ArchivingRunStats {
  totalProcessed: number;
  archivedCount: number;
  errors: number;
  processingTime: number;
}

export interface SchedulerStats {
  isRunning: boolean;
  lastRunTime?: Date;
  nextRunTime?: Date;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunStats?: {
    totalPNRs: number;
    successfulChecks: number;
    failedChecks: number;
    statusChanges: number;
    processingTime: number;
  };
  lastArchivingStats?: ArchivingRunStats;
}

export class BackgroundScheduler {
  private static instance: BackgroundScheduler;
  private cronJob: cron.ScheduledTask | null = null;
  private statusChangeDetector: StatusChangeDetector;
  private notificationQueue: NotificationQueue;
  private notificationService: NotificationService;
  private pnrArchiver: PNRArchiverService;
  private isRunning: boolean = false;
  private stats: SchedulerStats;
  
  private config: SchedulerConfig = {
    enabled: process.env.SCHEDULER_ENABLED === 'true',
    cronExpression: process.env.SCHEDULER_CRON || '0 */30 * * * *', // Every 30 minutes
    batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '50'),
    requestDelay: parseInt(process.env.SCHEDULER_REQUEST_DELAY || '2000'),
    maxRetries: parseInt(process.env.SCHEDULER_MAX_RETRIES || '3'),
    archivingEnabled: process.env.ARCHIVER_ENABLED === 'true'
  };

  private constructor() {
    this.notificationService = new NotificationService();
    this.notificationQueue = new NotificationQueue(this.notificationService);
    this.statusChangeDetector = new StatusChangeDetector(this.notificationQueue);
    this.pnrArchiver = new PNRArchiverService();
    
    this.stats = {
      isRunning: false,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0
    };
  }

  public static getInstance(): BackgroundScheduler {
    if (!BackgroundScheduler.instance) {
      BackgroundScheduler.instance = new BackgroundScheduler();
    }
    return BackgroundScheduler.instance;
  }

  /**
   * Start the background scheduler
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Background scheduler is disabled');
      return;
    }

    if (this.cronJob) {
      console.log('Background scheduler is already running');
      return;
    }

    try {
      // Start notification queue processing
      await this.notificationQueue.startProcessing();

      // Schedule the cron job
      this.cronJob = cron.schedule(this.config.cronExpression, async () => {
        await this.runStatusCheck();
      }, {
        scheduled: false,
        timezone: process.env.TZ || 'UTC'
      });

      this.cronJob.start();
      this.stats.isRunning = true;
      
      console.log(`Background scheduler started with cron expression: ${this.config.cronExpression}`);
      
      // Run initial check if no PNRs have been checked recently
      const shouldRunInitialCheck = process.env.SCHEDULER_INITIAL_CHECK === 'true';
      if (shouldRunInitialCheck) {
        setTimeout(() => this.runStatusCheck(), 5000); // Run after 5 seconds
      }
      
    } catch (error) {
      console.error('Failed to start background scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the background scheduler
   */
  async stop(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.notificationQueue.stopProcessing();
    this.stats.isRunning = false;
    
    console.log('Background scheduler stopped');
  }

  /**
   * Run status check for all active PNRs
   */
  private async runStatusCheck(): Promise<void> {
    if (this.isRunning) {
      console.log('Status check already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('Starting scheduled PNR status check...');
      
      // Get all active PNRs
      const trackedPNRs = await TrackedPNR.getAllActivePNRs();
      
      if (trackedPNRs.length === 0) {
        console.log('No active PNRs to check');
        this.stats.successfulRuns++;
        return;
      }

      console.log(`Found ${trackedPNRs.length} active PNRs to check`);

      // Process PNRs in batches to avoid overwhelming the system
      const batches = this.createBatches(trackedPNRs, this.config.batchSize);
      let totalStatusChanges = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} PNRs)`);

        try {
          const batchResult = await this.processBatch(batch);
          totalStatusChanges += batchResult.statusChanges;
          totalSuccessful += batchResult.successful;
          totalFailed += batchResult.failed;

          // Add delay between batches to avoid rate limiting
          if (i < batches.length - 1) {
            await this.delay(5000); // 5 second delay between batches
          }
        } catch (error) {
          console.error(`Error processing batch ${i + 1}:`, error);
          totalFailed += batch.length;
        }
      }

      const processingTime = Date.now() - startTime;
      
      // Update stats
      this.stats.totalRuns++;
      this.stats.successfulRuns++;
      this.stats.lastRunTime = new Date();
      this.stats.lastRunStats = {
        totalPNRs: trackedPNRs.length,
        successfulChecks: totalSuccessful,
        failedChecks: totalFailed,
        statusChanges: totalStatusChanges,
        processingTime
      };

      console.log(`Scheduled status check completed:`, {
        totalPNRs: trackedPNRs.length,
        successful: totalSuccessful,
        failed: totalFailed,
        statusChanges: totalStatusChanges,
        processingTime: `${processingTime}ms`
      });

      // Run PNR archiving after status checks
      if (this.config.archivingEnabled) {
        try {
          console.log('Starting PNR archiving process...');
          const archivingStats = await this.pnrArchiver.archiveCompletedPNRs();
          
          this.stats.lastArchivingStats = {
            totalProcessed: archivingStats.totalProcessed,
            archivedCount: archivingStats.archivedCount,
            errors: archivingStats.errors.length,
            processingTime: archivingStats.processingTime
          };

          console.log(`PNR archiving completed:`, this.stats.lastArchivingStats);
        } catch (archivingError) {
          console.error('Error during PNR archiving:', archivingError);
          this.stats.lastArchivingStats = {
            totalProcessed: 0,
            archivedCount: 0,
            errors: 1,
            processingTime: 0
          };
        }
      }

    } catch (error) {
      console.error('Error during scheduled status check:', error);
      this.stats.failedRuns++;
      
      // Send system notification about the error
      try {
        await this.notificationQueue.queueSystemNotification(
          'system', // This would need to be handled differently for system-wide notifications
          {
            title: 'Scheduler Error',
            content: `Background PNR status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { error: String(error), timestamp: new Date().toISOString() }
          }
        );
      } catch (notificationError) {
        console.error('Failed to queue system notification:', notificationError);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a batch of tracked PNRs
   */
  private async processBatch(trackedPNRs: TrackedPNR[]): Promise<{
    statusChanges: number;
    successful: number;
    failed: number;
  }> {
    const pnrs = trackedPNRs.map(tp => tp.pnr);
    
    // Use batch processor to get status updates
    const batchResult = await BatchProcessorService.processBatch(pnrs, {
      requestDelay: this.config.requestDelay,
      maxRetries: this.config.maxRetries
    });

    let statusChanges = 0;
    let successful = 0;
    let failed = 0;

    // Process results and check for status changes
    for (const result of batchResult.results) {
      try {
        const trackedPNR = trackedPNRs.find(tp => tp.pnr === result.pnr);
        if (!trackedPNR) {
          console.warn(`Tracked PNR not found for ${result.pnr}`);
          continue;
        }

        if (result.error) {
          failed++;
          console.warn(`Failed to check PNR ${result.pnr}: ${result.error}`);
          continue;
        }

        // Check for status changes
        const statusChangeEvent = await this.statusChangeDetector.checkStatusChange(
          trackedPNR.id!,
          result
        );

        if (statusChangeEvent) {
          statusChanges++;
          console.log(`Status change detected for PNR ${result.pnr}`);
        }

        successful++;

      } catch (error) {
        failed++;
        console.error(`Error processing result for PNR ${result.pnr}:`, error);
      }
    }

    // Handle flushed PNRs
    if (batchResult.flushedPNRs.length > 0) {
      await this.handleFlushedPNRs(batchResult.flushedPNRs, trackedPNRs);
    }

    return { statusChanges, successful, failed };
  }

  /**
   * Handle flushed PNRs by notifying users and optionally deactivating them
   */
  private async handleFlushedPNRs(flushedPNRs: string[], trackedPNRs: TrackedPNR[]): Promise<void> {
    for (const pnr of flushedPNRs) {
      try {
        const trackedPNR = trackedPNRs.find(tp => tp.pnr === pnr);
        if (!trackedPNR) continue;

        // Queue notification about flushed PNR
        await this.notificationQueue.queueSystemNotification(
          trackedPNR.userId,
          {
            title: `PNR ${pnr} Expired`,
            content: `Your PNR ${pnr} has expired and is no longer available for status checking. You may want to remove it from your tracking list.`,
            metadata: { pnr, reason: 'flushed' }
          }
        );

        // Optionally deactivate flushed PNRs automatically
        const autoDeactivateFlushed = process.env.AUTO_DEACTIVATE_FLUSHED === 'true';
        if (autoDeactivateFlushed) {
          await trackedPNR.deactivate();
          console.log(`Automatically deactivated flushed PNR: ${pnr}`);
        }

      } catch (error) {
        console.error(`Error handling flushed PNR ${pnr}:`, error);
      }
    }
  }

  /**
   * Create batches from array of tracked PNRs
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Create delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return {
      ...this.stats,
      nextRunTime: this.cronJob ? new Date(Date.now() + 30 * 60 * 1000) : undefined // Approximate next run time
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update archiver config if archiving settings changed
    if (newConfig.archivingEnabled !== undefined) {
      this.pnrArchiver.updateConfig({ enabled: newConfig.archivingEnabled });
    }
    
    // If cron expression changed and scheduler is running, restart it
    if (newConfig.cronExpression && this.cronJob) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Manually trigger a status check
   */
  async triggerManualCheck(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Status check is already in progress');
    }
    
    console.log('Manual status check triggered');
    await this.runStatusCheck();
  }

  /**
   * Check if scheduler is currently running a status check
   */
  isCheckInProgress(): boolean {
    return this.isRunning;
  }

  /**
   * Get notification queue statistics
   */
  async getNotificationQueueStats() {
    return await this.notificationQueue.getQueueStats();
  }

  /**
   * Manually trigger PNR archiving
   */
  async triggerManualArchiving(): Promise<ArchivingStats> {
    if (!this.config.archivingEnabled) {
      throw new Error('PNR archiving is disabled');
    }
    
    console.log('Manual PNR archiving triggered');
    return await this.pnrArchiver.archiveCompletedPNRs();
  }

  /**
   * Get PNRs eligible for archiving (preview)
   */
  async getEligiblePNRsForArchiving() {
    return await this.pnrArchiver.getEligiblePNRsForArchiving();
  }

  /**
   * Update archiver configuration
   */
  updateArchiverConfig(config: Partial<import('./pnr-archiver').ArchivingConfig>): void {
    this.pnrArchiver.updateConfig(config);
  }

  /**
   * Get archiver configuration
   */
  getArchiverConfig() {
    return this.pnrArchiver.getConfig();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    await this.notificationQueue.cleanup();
  }
}

// Export singleton instance
export const backgroundScheduler = BackgroundScheduler.getInstance();