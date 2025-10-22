/**
 * PNR Management Service
 * Migrated and enhanced from check-pnr-status addPnr.js, getPnrs.js, deletePnrs.js
 * This version will be enhanced to work with database instead of Configstore
 */

import { PNRValidatorService } from './pnr-validator';
import { IRCTCScraperService } from './irctc-scraper';
import { BatchProcessorService } from './batch-processor';
import { PNRStatusResult, TrackedPNR, PNRStatusHistory } from '../types';

/**
 * PNR Management Service
 * Handles CRUD operations for tracked PNRs
 * Note: This is a service layer that will be enhanced with database operations in later tasks
 */
export class PNRManagementService {
  // Temporary in-memory storage (will be replaced with database in later tasks)
  private static trackedPNRs: Map<string, TrackedPNR[]> = new Map();

  /**
   * Adds a PNR to user's tracking list
   * Migrated from addPnr.js functionality
   * @param userId - User ID
   * @param pnr - PNR number to add
   * @returns Promise with tracked PNR
   */
  static async addPNR(userId: string, pnr: string): Promise<TrackedPNR> {
    // Validate PNR format
    PNRValidatorService.validatePnr(pnr);

    // Get user's existing PNRs
    const userPNRs = this.trackedPNRs.get(userId) || [];

    // Check for duplicates
    const existingPNR = userPNRs.find(tracked => tracked.pnr === pnr && tracked.isActive);
    if (existingPNR) {
      throw new Error('PNR already exists in tracking list');
    }

    // Get initial status
    const initialStatus = await IRCTCScraperService.performRequest(pnr);

    // Create tracked PNR
    const trackedPNR: TrackedPNR = {
      id: this.generateId(),
      userId,
      pnr,
      currentStatus: initialStatus,
      statusHistory: [{
        id: this.generateId(),
        trackedPnrId: '', // Will be set after creation
        statusData: initialStatus,
        checkedAt: new Date(),
        statusChanged: true // First entry is always a change
      }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Set the tracked PNR ID in history
    trackedPNR.statusHistory[0].trackedPnrId = trackedPNR.id;

    // Add to user's list
    userPNRs.push(trackedPNR);
    this.trackedPNRs.set(userId, userPNRs);

    return trackedPNR;
  }

  /**
   * Removes a PNR from user's tracking list
   * Migrated from deletePnrs.js functionality
   * @param userId - User ID
   * @param pnrId - Tracked PNR ID to remove
   */
  static async removePNR(userId: string, pnrId: string): Promise<void> {
    const userPNRs = this.trackedPNRs.get(userId) || [];
    const pnrIndex = userPNRs.findIndex(tracked => tracked.id === pnrId);

    if (pnrIndex === -1) {
      throw new Error('PNR not found in tracking list');
    }

    // Mark as inactive instead of deleting (soft delete)
    userPNRs[pnrIndex].isActive = false;
    userPNRs[pnrIndex].updatedAt = new Date();

    this.trackedPNRs.set(userId, userPNRs);
  }

  /**
   * Gets all tracked PNRs for a user
   * Migrated from getPnrs.js functionality
   * @param userId - User ID
   * @returns Promise with array of tracked PNRs
   */
  static async getUserPNRs(userId: string): Promise<TrackedPNR[]> {
    const userPNRs = this.trackedPNRs.get(userId) || [];
    return userPNRs.filter(tracked => tracked.isActive);
  }

  /**
   * Updates PNR status and adds to history
   * @param pnrId - Tracked PNR ID
   * @param newStatus - New status result
   */
  static async updatePNRStatus(pnrId: string, newStatus: PNRStatusResult): Promise<void> {
    // Find the tracked PNR across all users (in real implementation, this would be a database query)
    let foundPNR: TrackedPNR | null = null;
    let userId: string | null = null;

    for (const [uid, pnrs] of this.trackedPNRs.entries()) {
      const pnr = pnrs.find(p => p.id === pnrId && p.isActive);
      if (pnr) {
        foundPNR = pnr;
        userId = uid;
        break;
      }
    }

    if (!foundPNR || !userId) {
      throw new Error('Tracked PNR not found');
    }

    // Check if status actually changed
    const statusChanged = this.hasStatusChanged(foundPNR.currentStatus, newStatus);

    // Add to history
    const historyEntry: PNRStatusHistory = {
      id: this.generateId(),
      trackedPnrId: pnrId,
      statusData: newStatus,
      checkedAt: new Date(),
      statusChanged
    };

    foundPNR.statusHistory.push(historyEntry);
    foundPNR.currentStatus = newStatus;
    foundPNR.updatedAt = new Date();

    // Update in storage
    const userPNRs = this.trackedPNRs.get(userId)!;
    this.trackedPNRs.set(userId, userPNRs);
  }

  /**
   * Checks multiple PNRs for a user and updates their statuses
   * Migrated from checkAllPnrStatus.js functionality with enhanced batch processing
   * @param userId - User ID
   * @param progressCallback - Optional callback for progress updates
   * @returns Promise with updated PNR results
   */
  static async checkAllUserPNRs(
    userId: string,
    progressCallback?: (current: number, total: number, currentPnr: string) => void
  ): Promise<PNRStatusResult[]> {
    const userPNRs = await this.getUserPNRs(userId);
    const pnrNumbers = userPNRs.map(tracked => tracked.pnr);

    if (pnrNumbers.length === 0) {
      return [];
    }

    // Use batch processor for better rate limiting and error handling
    const batchResult = await BatchProcessorService.processBatch(
      pnrNumbers,
      {
        requestDelay: 1000, // 1 second between requests
        maxRetries: 3,
        retryDelay: 2000
      },
      progressCallback
    );

    // Update statuses for successful results
    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i];
      const trackedPNR = userPNRs.find(p => p.pnr === result.pnr);
      
      if (trackedPNR) {
        try {
          await this.updatePNRStatus(trackedPNR.id, result);
        } catch (error) {
          console.error(`Failed to update status for PNR ${result.pnr}:`, error);
        }
      }
    }

    // Handle flushed PNRs - mark them for user attention
    if (batchResult.flushedPNRs.length > 0) {
      console.log(`Found ${batchResult.flushedPNRs.length} flushed PNRs:`, batchResult.flushedPNRs);
      // In a real implementation, this would trigger notifications to the user
    }

    return batchResult.results;
  }

  /**
   * Gets PNR status history
   * @param pnrId - Tracked PNR ID
   * @returns Promise with status history
   */
  static async getPNRHistory(pnrId: string): Promise<PNRStatusHistory[]> {
    // Find the tracked PNR across all users
    for (const pnrs of this.trackedPNRs.values()) {
      const pnr = pnrs.find(p => p.id === pnrId && p.isActive);
      if (pnr) {
        return pnr.statusHistory;
      }
    }

    throw new Error('Tracked PNR not found');
  }

  /**
   * Checks if PNR status has meaningfully changed
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @returns true if status changed
   */
  private static hasStatusChanged(oldStatus: PNRStatusResult, newStatus: PNRStatusResult): boolean {
    return (
      oldStatus.status !== newStatus.status ||
      oldStatus.from !== newStatus.from ||
      oldStatus.to !== newStatus.to ||
      oldStatus.date !== newStatus.date ||
      oldStatus.isFlushed !== newStatus.isFlushed
    );
  }

  /**
   * Generates a unique ID (will be replaced with proper UUID in database implementation)
   * @returns Unique ID string
   */
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}