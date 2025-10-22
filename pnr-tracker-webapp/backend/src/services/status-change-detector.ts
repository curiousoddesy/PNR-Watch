import { TrackedPNR } from '../models/TrackedPNR';
import { PNRStatusHistory } from '../models/PNRStatusHistory';
import { NotificationQueue } from './notification-queue';
import { PNRStatusResult } from '../types';

export interface StatusChangeEvent {
  trackedPNRId: string;
  userId: string;
  pnr: string;
  oldStatus: string;
  newStatus: string;
  statusData: PNRStatusResult;
  timestamp: Date;
}

export class StatusChangeDetector {
  private notificationQueue: NotificationQueue;

  constructor(notificationQueue: NotificationQueue) {
    this.notificationQueue = notificationQueue;
  }

  /**
   * Check for status changes and trigger notifications
   */
  async checkStatusChange(
    trackedPNRId: string,
    newStatusData: PNRStatusResult
  ): Promise<StatusChangeEvent | null> {
    try {
      // Get the tracked PNR
      const trackedPNR = await TrackedPNR.findById(trackedPNRId);
      if (!trackedPNR) {
        throw new Error(`Tracked PNR not found: ${trackedPNRId}`);
      }

      // Get the current status
      const currentStatus = trackedPNR.currentStatus;
      const oldStatus = currentStatus.status;
      const newStatus = newStatusData.status;

      // Check if status actually changed
      const hasStatusChanged = this.hasSignificantStatusChange(currentStatus, newStatusData);
      
      // Always save the status history entry
      await PNRStatusHistory.create({
        trackedPnrId: trackedPNRId,
        statusData: newStatusData,
        statusChanged: hasStatusChanged
      });

      // Update the tracked PNR with new status
      await trackedPNR.updateStatus(newStatusData);

      // If status changed significantly, trigger notifications
      if (hasStatusChanged) {
        const statusChangeEvent: StatusChangeEvent = {
          trackedPNRId,
          userId: trackedPNR.userId,
          pnr: trackedPNR.pnr,
          oldStatus,
          newStatus,
          statusData: newStatusData,
          timestamp: new Date()
        };

        // Queue notification for processing
        await this.notificationQueue.queueStatusChangeNotification(
          trackedPNR.userId,
          {
            trackedPNRId,
            oldStatus,
            newStatus
          }
        );

        console.log(`Status change detected for PNR ${trackedPNR.pnr}: ${oldStatus} -> ${newStatus}`);
        return statusChangeEvent;
      }

      return null;
    } catch (error) {
      console.error('Error checking status change:', error);
      throw error;
    }
  }

  /**
   * Determine if there's a significant status change worth notifying about
   */
  private hasSignificantStatusChange(
    oldStatusData: PNRStatusResult,
    newStatusData: PNRStatusResult
  ): boolean {
    // Check if the main status text changed
    if (oldStatusData.status !== newStatusData.status) {
      return true;
    }

    // Check for waitlist position changes (extract numbers from status)
    const oldWaitlistPosition = this.extractWaitlistPosition(oldStatusData.status);
    const newWaitlistPosition = this.extractWaitlistPosition(newStatusData.status);
    
    if (oldWaitlistPosition !== newWaitlistPosition && 
        (oldWaitlistPosition > 0 || newWaitlistPosition > 0)) {
      return true;
    }

    // Check for confirmation status changes
    const oldIsConfirmed = this.isConfirmedStatus(oldStatusData.status);
    const newIsConfirmed = this.isConfirmedStatus(newStatusData.status);
    
    if (oldIsConfirmed !== newIsConfirmed) {
      return true;
    }

    // Check for cancellation status changes
    const oldIsCancelled = this.isCancelledStatus(oldStatusData.status);
    const newIsCancelled = this.isCancelledStatus(newStatusData.status);
    
    if (oldIsCancelled !== newIsCancelled) {
      return true;
    }

    // Check for chart preparation status
    const oldIsChartPrepared = this.isChartPreparedStatus(oldStatusData.status);
    const newIsChartPrepared = this.isChartPreparedStatus(newStatusData.status);
    
    if (oldIsChartPrepared !== newIsChartPrepared) {
      return true;
    }

    // Check if PNR became flushed
    if (!oldStatusData.isFlushed && newStatusData.isFlushed) {
      return true;
    }

    return false;
  }

  /**
   * Extract waitlist position from status string
   */
  private extractWaitlistPosition(status: string): number {
    // Look for patterns like "WL 5", "WL/5", "Waitlist 5", etc.
    const waitlistMatch = status.match(/(?:WL|Waitlist)[\s\/]*(\d+)/i);
    return waitlistMatch ? parseInt(waitlistMatch[1]) : 0;
  }

  /**
   * Check if status indicates confirmation
   */
  private isConfirmedStatus(status: string): boolean {
    const confirmationKeywords = ['confirm', 'cnf', 'confirmed'];
    return confirmationKeywords.some(keyword => 
      status.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if status indicates cancellation
   */
  private isCancelledStatus(status: string): boolean {
    const cancellationKeywords = ['cancel', 'cancelled', 'can'];
    return cancellationKeywords.some(keyword => 
      status.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if status indicates chart preparation
   */
  private isChartPreparedStatus(status: string): boolean {
    const chartKeywords = ['chart prepared', 'chart', 'cp'];
    return chartKeywords.some(keyword => 
      status.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Batch check status changes for multiple PNRs
   */
  async batchCheckStatusChanges(
    statusUpdates: Array<{ trackedPNRId: string; statusData: PNRStatusResult }>
  ): Promise<StatusChangeEvent[]> {
    const statusChangeEvents: StatusChangeEvent[] = [];

    for (const update of statusUpdates) {
      try {
        const event = await this.checkStatusChange(update.trackedPNRId, update.statusData);
        if (event) {
          statusChangeEvents.push(event);
        }
      } catch (error) {
        console.error(`Error checking status change for ${update.trackedPNRId}:`, error);
        // Continue with other updates even if one fails
      }
    }

    return statusChangeEvents;
  }

  /**
   * Get status change history for a PNR
   */
  async getStatusChangeHistory(
    trackedPNRId: string,
    limit: number = 50
  ): Promise<PNRStatusHistory[]> {
    return await PNRStatusHistory.findByTrackedPNRId(trackedPNRId, limit);
  }

  /**
   * Get recent status changes across all PNRs for a user
   */
  async getRecentStatusChanges(
    userId: string,
    limit: number = 20
  ): Promise<StatusChangeEvent[]> {
    try {
      // Get user's tracked PNRs
      const trackedPNRs = await TrackedPNR.findByUserId(userId);
      
      if (trackedPNRs.length === 0) {
        return [];
      }

      // Get recent status changes for all PNRs
      const statusChangeEvents: StatusChangeEvent[] = [];
      
      for (const trackedPNR of trackedPNRs) {
        const history = await PNRStatusHistory.findByTrackedPNRId(trackedPNR.id!, 10);
        
        // Find status changes in history
        for (let i = 0; i < history.length - 1; i++) {
          const current = history[i];
          const previous = history[i + 1];
          
          if (current.statusChanged) {
            statusChangeEvents.push({
              trackedPNRId: trackedPNR.id!,
              userId: trackedPNR.userId,
              pnr: trackedPNR.pnr,
              oldStatus: previous.statusData.status,
              newStatus: current.statusData.status,
              statusData: current.statusData,
              timestamp: current.checkedAt
            });
          }
        }
      }

      // Sort by timestamp (most recent first) and limit
      return statusChangeEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting recent status changes:', error);
      return [];
    }
  }

  /**
   * Get status change statistics for a user
   */
  async getStatusChangeStats(userId: string): Promise<{
    totalChanges: number;
    confirmations: number;
    cancellations: number;
    waitlistMovements: number;
    chartPreparations: number;
  }> {
    try {
      const recentChanges = await this.getRecentStatusChanges(userId, 1000); // Get more for stats
      
      const stats = {
        totalChanges: recentChanges.length,
        confirmations: 0,
        cancellations: 0,
        waitlistMovements: 0,
        chartPreparations: 0
      };

      for (const change of recentChanges) {
        if (this.isConfirmedStatus(change.newStatus)) {
          stats.confirmations++;
        } else if (this.isCancelledStatus(change.newStatus)) {
          stats.cancellations++;
        } else if (this.isChartPreparedStatus(change.newStatus)) {
          stats.chartPreparations++;
        } else {
          stats.waitlistMovements++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting status change stats:', error);
      return {
        totalChanges: 0,
        confirmations: 0,
        cancellations: 0,
        waitlistMovements: 0,
        chartPreparations: 0
      };
    }
  }
}