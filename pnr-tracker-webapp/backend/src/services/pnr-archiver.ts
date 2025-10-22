/**
 * PNR Archiver Service
 * Handles automatic archiving of PNRs after travel date completion
 */

import { TrackedPNR } from '../models/TrackedPNR';
import { PNRStatusResult } from '../types';

export interface ArchivingConfig {
  enabled: boolean;
  daysAfterTravel: number; // Days to wait after travel date before archiving
  batchSize: number; // Number of PNRs to process in each batch
}

export interface ArchivingStats {
  totalProcessed: number;
  archivedCount: number;
  errors: string[];
  processingTime: number;
}

export class PNRArchiverService {
  private static readonly DEFAULT_CONFIG: ArchivingConfig = {
    enabled: process.env.ARCHIVER_ENABLED === 'true',
    daysAfterTravel: parseInt(process.env.ARCHIVER_DAYS_AFTER_TRAVEL || '7'), // 7 days after travel
    batchSize: parseInt(process.env.ARCHIVER_BATCH_SIZE || '100')
  };

  private config: ArchivingConfig;

  constructor(config?: Partial<ArchivingConfig>) {
    this.config = { ...PNRArchiverService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Parse travel date from various date formats used by IRCTC
   * @param dateString - Date string from IRCTC response
   * @returns Date object or null if parsing fails
   */
  private parseTravelDate(dateString: string): Date | null {
    if (!dateString || dateString.trim() === '') {
      return null;
    }

    try {
      // Common IRCTC date formats:
      // "DD-MM-YYYY", "DD/MM/YYYY", "DD.MM.YYYY", "DD MMM YYYY"
      const cleanDate = dateString.trim();
      
      // Try different date formats
      const formats = [
        // DD-MM-YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        // DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // DD.MM.YYYY
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
      ];

      for (const format of formats) {
        const match = cleanDate.match(format);
        if (match) {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // JavaScript months are 0-based
          const year = parseInt(match[3]);
          
          const date = new Date(year, month, day);
          
          // Validate the date
          if (date.getFullYear() === year && 
              date.getMonth() === month && 
              date.getDate() === day) {
            return date;
          }
        }
      }

      // Try parsing month names (e.g., "15 Jan 2024")
      const monthNameMatch = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
      if (monthNameMatch) {
        const day = parseInt(monthNameMatch[1]);
        const monthName = monthNameMatch[2].toLowerCase();
        const year = parseInt(monthNameMatch[3]);
        
        const monthMap: { [key: string]: number } = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        const month = monthMap[monthName];
        if (month !== undefined) {
          const date = new Date(year, month, day);
          if (date.getFullYear() === year && 
              date.getMonth() === month && 
              date.getDate() === day) {
            return date;
          }
        }
      }

      // Fallback: try native Date parsing
      const fallbackDate = new Date(cleanDate);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
      }

      return null;
    } catch (error) {
      console.warn(`Failed to parse travel date: ${dateString}`, error);
      return null;
    }
  }

  /**
   * Check if a PNR should be archived based on travel date
   * @param statusData - Current PNR status data
   * @returns true if PNR should be archived
   */
  private shouldArchivePNR(statusData: PNRStatusResult): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Parse travel date
    const travelDate = this.parseTravelDate(statusData.date);
    if (!travelDate) {
      // If we can't parse the travel date, don't archive
      return false;
    }

    // Calculate cutoff date (travel date + configured days)
    const cutoffDate = new Date(travelDate);
    cutoffDate.setDate(cutoffDate.getDate() + this.config.daysAfterTravel);

    // Check if current date is past the cutoff
    const now = new Date();
    return now > cutoffDate;
  }

  /**
   * Check if PNR is in a final state (completed journey)
   * @param status - PNR status string
   * @returns true if journey is completed
   */
  private isJourneyCompleted(status: string): boolean {
    const completedStatuses = [
      'chart prepared',
      'chart prep',
      'cp',
      'journey completed',
      'completed',
      'travelled'
    ];

    const statusLower = status.toLowerCase();
    return completedStatuses.some(completedStatus => 
      statusLower.includes(completedStatus)
    );
  }

  /**
   * Archive eligible PNRs based on travel date completion
   * @returns Archiving statistics
   */
  async archiveCompletedPNRs(): Promise<ArchivingStats> {
    const startTime = Date.now();
    const stats: ArchivingStats = {
      totalProcessed: 0,
      archivedCount: 0,
      errors: [],
      processingTime: 0
    };

    if (!this.config.enabled) {
      console.log('PNR archiving is disabled');
      stats.processingTime = Date.now() - startTime;
      return stats;
    }

    try {
      console.log('Starting PNR archiving process...');

      // Get all active PNRs
      const activePNRs = await TrackedPNR.getAllActivePNRs();
      stats.totalProcessed = activePNRs.length;

      if (activePNRs.length === 0) {
        console.log('No active PNRs to process for archiving');
        stats.processingTime = Date.now() - startTime;
        return stats;
      }

      console.log(`Processing ${activePNRs.length} active PNRs for archiving...`);

      // Process PNRs in batches
      const batches = this.createBatches(activePNRs, this.config.batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing archiving batch ${i + 1}/${batches.length} (${batch.length} PNRs)`);

        for (const trackedPNR of batch) {
          try {
            if (!trackedPNR.currentStatus) {
              continue;
            }

            // Check if PNR should be archived
            const shouldArchive = this.shouldArchivePNR(trackedPNR.currentStatus);
            const isCompleted = this.isJourneyCompleted(trackedPNR.currentStatus.status);

            if (shouldArchive || isCompleted) {
              await trackedPNR.deactivate();
              stats.archivedCount++;
              
              console.log(`Archived PNR ${trackedPNR.pnr} (Travel date: ${trackedPNR.currentStatus.date}, Status: ${trackedPNR.currentStatus.status})`);
            }

          } catch (error) {
            const errorMessage = `Failed to process PNR ${trackedPNR.pnr}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            stats.errors.push(errorMessage);
            console.error(errorMessage);
          }
        }

        // Small delay between batches to avoid overwhelming the database
        if (i < batches.length - 1) {
          await this.delay(100);
        }
      }

      stats.processingTime = Date.now() - startTime;

      console.log(`PNR archiving completed:`, {
        totalProcessed: stats.totalProcessed,
        archivedCount: stats.archivedCount,
        errors: stats.errors.length,
        processingTime: `${stats.processingTime}ms`
      });

      return stats;

    } catch (error) {
      const errorMessage = `PNR archiving process failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      stats.errors.push(errorMessage);
      console.error(errorMessage);
      
      stats.processingTime = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Get PNRs that are eligible for archiving (for preview/testing)
   * @returns List of PNRs that would be archived
   */
  async getEligiblePNRsForArchiving(): Promise<Array<{
    pnr: string;
    userId: string;
    travelDate: string;
    status: string;
    reason: 'date_completed' | 'journey_completed';
  }>> {
    const eligiblePNRs: Array<{
      pnr: string;
      userId: string;
      travelDate: string;
      status: string;
      reason: 'date_completed' | 'journey_completed';
    }> = [];

    try {
      const activePNRs = await TrackedPNR.getAllActivePNRs();

      for (const trackedPNR of activePNRs) {
        if (!trackedPNR.currentStatus) {
          continue;
        }

        const shouldArchive = this.shouldArchivePNR(trackedPNR.currentStatus);
        const isCompleted = this.isJourneyCompleted(trackedPNR.currentStatus.status);

        if (shouldArchive || isCompleted) {
          eligiblePNRs.push({
            pnr: trackedPNR.pnr,
            userId: trackedPNR.userId,
            travelDate: trackedPNR.currentStatus.date,
            status: trackedPNR.currentStatus.status,
            reason: isCompleted ? 'journey_completed' : 'date_completed'
          });
        }
      }

      return eligiblePNRs;
    } catch (error) {
      console.error('Error getting eligible PNRs for archiving:', error);
      return [];
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
   * Update archiver configuration
   */
  updateConfig(newConfig: Partial<ArchivingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ArchivingConfig {
    return { ...this.config };
  }

  /**
   * Test travel date parsing with various formats
   * @param dateString - Date string to test
   * @returns Parsed date or null
   */
  testDateParsing(dateString: string): Date | null {
    return this.parseTravelDate(dateString);
  }
}