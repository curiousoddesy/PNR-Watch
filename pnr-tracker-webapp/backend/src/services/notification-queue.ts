import { createClient, RedisClientType } from 'redis';
import { NotificationService } from './notification';
import { User } from '../models/User';
import { TrackedPNR } from '../models/TrackedPNR';

export interface QueuedNotification {
  id: string;
  type: 'status_change' | 'system' | 'test';
  userId: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  lastAttemptAt?: Date;
  error?: string;
}

export interface StatusChangeNotificationData {
  trackedPNRId: string;
  oldStatus: string;
  newStatus: string;
}

export interface SystemNotificationData {
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export class NotificationQueue {
  private redis: RedisClientType;
  private notificationService: NotificationService;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redis.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.redis.on('connect', () => {
        console.log('Connected to Redis for notification queue');
      });

      await this.redis.connect();
    } catch (error) {
      console.error('Failed to initialize Redis for notification queue:', error);
      throw error;
    }
  }

  /**
   * Add status change notification to queue
   */
  async queueStatusChangeNotification(
    userId: string,
    data: StatusChangeNotificationData,
    delay: number = 0
  ): Promise<string> {
    const notification: QueuedNotification = {
      id: this.generateId(),
      type: 'status_change',
      userId,
      data,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      scheduledAt: delay > 0 ? new Date(Date.now() + delay) : undefined
    };

    await this.addToQueue(notification);
    return notification.id;
  }

  /**
   * Add system notification to queue
   */
  async queueSystemNotification(
    userId: string,
    data: SystemNotificationData,
    delay: number = 0
  ): Promise<string> {
    const notification: QueuedNotification = {
      id: this.generateId(),
      type: 'system',
      userId,
      data,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      scheduledAt: delay > 0 ? new Date(Date.now() + delay) : undefined
    };

    await this.addToQueue(notification);
    return notification.id;
  }

  /**
   * Add notification to Redis queue
   */
  private async addToQueue(notification: QueuedNotification): Promise<void> {
    try {
      const queueKey = notification.scheduledAt ? 'notifications:delayed' : 'notifications:pending';
      const score = notification.scheduledAt ? notification.scheduledAt.getTime() : Date.now();
      
      await this.redis.zAdd(queueKey, {
        score,
        value: JSON.stringify(notification)
      });

      console.log(`Notification ${notification.id} added to queue: ${queueKey}`);
    } catch (error) {
      console.error('Failed to add notification to queue:', error);
      throw error;
    }
  }

  /**
   * Start processing notifications from queue
   */
  async startProcessing(intervalMs: number = 5000): Promise<void> {
    if (this.isProcessing) {
      console.log('Notification queue processing is already running');
      return;
    }

    this.isProcessing = true;
    console.log('Starting notification queue processing...');

    this.processingInterval = setInterval(async () => {
      try {
        await this.processDelayedNotifications();
        await this.processPendingNotifications();
      } catch (error) {
        console.error('Error processing notification queue:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop processing notifications
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('Notification queue processing stopped');
  }

  /**
   * Process delayed notifications that are ready to be sent
   */
  private async processDelayedNotifications(): Promise<void> {
    try {
      const now = Date.now();
      const delayedNotifications = await this.redis.zRangeByScore(
        'notifications:delayed',
        0,
        now,
        { LIMIT: { offset: 0, count: 10 } }
      );

      for (const notificationStr of delayedNotifications) {
        const notification: QueuedNotification = JSON.parse(notificationStr);
        
        // Move to pending queue
        await this.redis.zRem('notifications:delayed', notificationStr);
        await this.redis.zAdd('notifications:pending', {
          score: Date.now(),
          value: notificationStr
        });
      }

      if (delayedNotifications.length > 0) {
        console.log(`Moved ${delayedNotifications.length} delayed notifications to pending queue`);
      }
    } catch (error) {
      console.error('Error processing delayed notifications:', error);
    }
  }

  /**
   * Process pending notifications
   */
  private async processPendingNotifications(): Promise<void> {
    try {
      const pendingNotifications = await this.redis.zRange(
        'notifications:pending',
        0,
        9 // Process up to 10 notifications at a time
      );

      for (const notificationStr of pendingNotifications) {
        const notification: QueuedNotification = JSON.parse(notificationStr);
        
        try {
          await this.processNotification(notification);
          
          // Remove from pending queue on success
          await this.redis.zRem('notifications:pending', notificationStr);
          console.log(`Successfully processed notification ${notification.id}`);
          
        } catch (error) {
          console.error(`Failed to process notification ${notification.id}:`, error);
          
          // Update notification with error and attempt count
          notification.attempts++;
          notification.lastAttemptAt = new Date();
          notification.error = error instanceof Error ? error.message : String(error);
          
          // Remove from pending queue
          await this.redis.zRem('notifications:pending', notificationStr);
          
          if (notification.attempts >= notification.maxAttempts) {
            // Move to failed queue
            await this.redis.zAdd('notifications:failed', {
              score: Date.now(),
              value: JSON.stringify(notification)
            });
            console.log(`Notification ${notification.id} moved to failed queue after ${notification.attempts} attempts`);
          } else {
            // Retry with exponential backoff
            const retryDelay = Math.pow(2, notification.attempts) * 1000; // 2s, 4s, 8s...
            notification.scheduledAt = new Date(Date.now() + retryDelay);
            
            await this.redis.zAdd('notifications:delayed', {
              score: notification.scheduledAt.getTime(),
              value: JSON.stringify(notification)
            });
            console.log(`Notification ${notification.id} scheduled for retry in ${retryDelay}ms`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  /**
   * Process individual notification
   */
  private async processNotification(notification: QueuedNotification): Promise<void> {
    switch (notification.type) {
      case 'status_change':
        await this.processStatusChangeNotification(notification);
        break;
      case 'system':
        await this.processSystemNotification(notification);
        break;
      case 'test':
        await this.processTestNotification(notification);
        break;
      default:
        throw new Error(`Unknown notification type: ${notification.type}`);
    }
  }

  /**
   * Process status change notification
   */
  private async processStatusChangeNotification(notification: QueuedNotification): Promise<void> {
    const { trackedPNRId, oldStatus, newStatus } = notification.data as StatusChangeNotificationData;
    
    // Get user and tracked PNR
    const user = await User.findById(notification.userId);
    if (!user) {
      throw new Error(`User not found: ${notification.userId}`);
    }

    const trackedPNR = await TrackedPNR.findById(trackedPNRId);
    if (!trackedPNR) {
      throw new Error(`Tracked PNR not found: ${trackedPNRId}`);
    }

    // Send notification
    await this.notificationService.sendStatusChangeNotification(
      user,
      trackedPNR,
      oldStatus,
      newStatus
    );
  }

  /**
   * Process system notification
   */
  private async processSystemNotification(notification: QueuedNotification): Promise<void> {
    const { title, content, metadata } = notification.data as SystemNotificationData;
    
    await this.notificationService.sendSystemNotification(
      notification.userId,
      title,
      content,
      metadata
    );
  }

  /**
   * Process test notification
   */
  private async processTestNotification(notification: QueuedNotification): Promise<void> {
    const user = await User.findById(notification.userId);
    if (!user) {
      throw new Error(`User not found: ${notification.userId}`);
    }

    await this.notificationService.sendTestEmail(user.email);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    delayed: number;
    failed: number;
  }> {
    try {
      const [pending, delayed, failed] = await Promise.all([
        this.redis.zCard('notifications:pending'),
        this.redis.zCard('notifications:delayed'),
        this.redis.zCard('notifications:failed')
      ]);

      return { pending, delayed, failed };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { pending: 0, delayed: 0, failed: 0 };
    }
  }

  /**
   * Get failed notifications
   */
  async getFailedNotifications(limit: number = 50): Promise<QueuedNotification[]> {
    try {
      const failedNotifications = await this.redis.zRange(
        'notifications:failed',
        0,
        limit - 1,
        { REV: true } // Most recent first
      );

      return failedNotifications.map(str => JSON.parse(str));
    } catch (error) {
      console.error('Error getting failed notifications:', error);
      return [];
    }
  }

  /**
   * Retry failed notification
   */
  async retryFailedNotification(notificationId: string): Promise<boolean> {
    try {
      const failedNotifications = await this.redis.zRange('notifications:failed', 0, -1);
      
      for (const notificationStr of failedNotifications) {
        const notification: QueuedNotification = JSON.parse(notificationStr);
        
        if (notification.id === notificationId) {
          // Reset attempts and move back to pending
          notification.attempts = 0;
          notification.error = undefined;
          notification.lastAttemptAt = undefined;
          notification.scheduledAt = undefined;
          
          await this.redis.zRem('notifications:failed', notificationStr);
          await this.redis.zAdd('notifications:pending', {
            score: Date.now(),
            value: JSON.stringify(notification)
          });
          
          console.log(`Notification ${notificationId} moved back to pending queue for retry`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error retrying failed notification:', error);
      return false;
    }
  }

  /**
   * Clear failed notifications
   */
  async clearFailedNotifications(): Promise<number> {
    try {
      const count = await this.redis.zCard('notifications:failed');
      await this.redis.del('notifications:failed');
      console.log(`Cleared ${count} failed notifications`);
      return count;
    } catch (error) {
      console.error('Error clearing failed notifications:', error);
      return 0;
    }
  }

  /**
   * Generate unique ID for notification
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup - close Redis connection
   */
  async cleanup(): Promise<void> {
    this.stopProcessing();
    if (this.redis) {
      await this.redis.quit();
    }
  }
}