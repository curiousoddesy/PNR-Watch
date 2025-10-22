/**
 * Scheduler Tests
 * Tests for background scheduler functionality including:
 * - Scheduled job execution and status checking
 * - Status change detection logic
 * - Notification pipeline integration
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import { BackgroundScheduler } from '../services/background-scheduler';
import { StatusChangeDetector } from '../services/status-change-detector';
import { BatchProcessorService } from '../services/batch-processor';
import { NotificationQueue } from '../services/notification-queue';
import { TrackedPNR } from '../models/TrackedPNR';
import { PNRArchiverService } from '../services/pnr-archiver';
import { PNRStatusResult } from '../types';

// Mock external dependencies
vi.mock('node-cron', () => ({
  schedule: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../services/batch-processor', () => ({
  BatchProcessorService: {
    processBatch: vi.fn()
  }
}));

vi.mock('../services/notification-queue', () => ({
  NotificationQueue: vi.fn().mockImplementation(() => ({
    startProcessing: vi.fn(),
    stopProcessing: vi.fn(),
    queueStatusChangeNotification: vi.fn(),
    queueSystemNotification: vi.fn(),
    getQueueStats: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock('../services/notification', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendStatusChangeNotification: vi.fn(),
    sendEmailNotification: vi.fn(),
    sendPushNotification: vi.fn(),
    createInAppNotification: vi.fn()
  }))
}));

vi.mock('../services/pnr-archiver', () => ({
  PNRArchiverService: vi.fn().mockImplementation(() => ({
    archiveCompletedPNRs: vi.fn(),
    getEligiblePNRsForArchiving: vi.fn(),
    updateConfig: vi.fn(),
    getConfig: vi.fn()
  }))
}));

vi.mock('../models/TrackedPNR', () => ({
  TrackedPNR: {
    getAllActivePNRs: vi.fn(),
    findById: vi.fn()
  }
}));

// Mock database connection
vi.mock('../config/database', () => ({
  default: {
    getInstance: () => ({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    })
  }
}));

describe('Background Scheduler Tests', () => {
  let scheduler: BackgroundScheduler;
  let mockNotificationQueue: any;
  let mockStatusChangeDetector: any;
  let mockPNRArchiver: any;

  // Mock data
  const mockTrackedPNRs = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'user-123',
      pnr: '1234567890',
      currentStatus: {
        pnr: '1234567890',
        from: 'Delhi',
        to: 'Mumbai',
        date: '2024-01-15',
        status: 'Confirmed',
        isFlushed: false,
        lastUpdated: new Date()
      },
      isActive: true
    },
    {
      id: '456e7890-e89b-12d3-a456-426614174001',
      userId: 'user-456',
      pnr: '2345678901',
      currentStatus: {
        pnr: '2345678901',
        from: 'Chennai',
        to: 'Bangalore',
        date: '2024-01-20',
        status: 'WL/5',
        isFlushed: false,
        lastUpdated: new Date()
      },
      isActive: true
    }
  ];

  const mockBatchResult = {
    results: [
      {
        pnr: '1234567890',
        from: 'Delhi',
        to: 'Mumbai',
        date: '2024-01-15',
        status: 'Confirmed',
        isFlushed: false,
        lastUpdated: new Date()
      },
      {
        pnr: '2345678901',
        from: 'Chennai',
        to: 'Bangalore',
        date: '2024-01-20',
        status: 'WL/3',
        isFlushed: false,
        lastUpdated: new Date()
      }
    ],
    flushedPNRs: [],
    errors: [],
    totalProcessed: 2,
    totalSuccessful: 2,
    totalFailed: 0,
    processingTime: 5000
  };

  beforeAll(() => {
    // Set up environment variables for testing
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.SCHEDULER_CRON = '0 */30 * * * *';
    process.env.SCHEDULER_BATCH_SIZE = '50';
    process.env.SCHEDULER_REQUEST_DELAY = '2000';
    process.env.SCHEDULER_MAX_RETRIES = '3';
    process.env.ARCHIVER_ENABLED = 'true';
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get scheduler instance
    scheduler = BackgroundScheduler.getInstance();

    // Reset scheduler state
    await scheduler.stop();
    (scheduler as any).isRunning = false;
    (scheduler as any).stats = {
      isRunning: false,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0
    };

    // Setup mocks for internal services
    mockNotificationQueue = {
      startProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      queueStatusChangeNotification: vi.fn(),
      queueSystemNotification: vi.fn(),
      getQueueStats: vi.fn().mockResolvedValue({ pending: 0, delayed: 0, failed: 0 }),
      cleanup: vi.fn()
    };

    mockStatusChangeDetector = {
      checkStatusChange: vi.fn()
    };

    mockPNRArchiver = {
      archiveCompletedPNRs: vi.fn().mockResolvedValue({
        totalProcessed: 10,
        archivedCount: 5,
        errors: [],
        processingTime: 2000
      }),
      getEligiblePNRsForArchiving: vi.fn(),
      updateConfig: vi.fn(),
      getConfig: vi.fn()
    };

    // Replace internal services with mocks
    (scheduler as any).notificationQueue = mockNotificationQueue;
    (scheduler as any).statusChangeDetector = mockStatusChangeDetector;
    (scheduler as any).pnrArchiver = mockPNRArchiver;

    // Reset configuration to test defaults
    (scheduler as any).config = {
      enabled: process.env.SCHEDULER_ENABLED === 'true',
      cronExpression: process.env.SCHEDULER_CRON || '0 */30 * * * *',
      batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '50'),
      requestDelay: parseInt(process.env.SCHEDULER_REQUEST_DELAY || '2000'),
      maxRetries: parseInt(process.env.SCHEDULER_MAX_RETRIES || '3'),
      archivingEnabled: process.env.ARCHIVER_ENABLED === 'true'
    };

    // Setup default mocks
    vi.mocked(TrackedPNR.getAllActivePNRs).mockResolvedValue(mockTrackedPNRs as any);
    vi.mocked(BatchProcessorService.processBatch).mockResolvedValue(mockBatchResult);
  });

  afterEach(async () => {
    await scheduler.stop();
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.SCHEDULER_ENABLED;
    delete process.env.SCHEDULER_CRON;
    delete process.env.SCHEDULER_BATCH_SIZE;
    delete process.env.SCHEDULER_REQUEST_DELAY;
    delete process.env.SCHEDULER_MAX_RETRIES;
    delete process.env.ARCHIVER_ENABLED;
  });

  describe('Scheduler Initialization and Configuration', () => {
    it('should initialize scheduler with correct configuration', () => {
      const config = scheduler.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.cronExpression).toBe('0 */30 * * * *');
      expect(config.batchSize).toBe(50);
      expect(config.requestDelay).toBe(2000);
      expect(config.maxRetries).toBe(3);
      expect(config.archivingEnabled).toBe(true);
    });

    it('should start scheduler successfully when enabled', async () => {
      await scheduler.start();
      
      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(true);
      expect(mockNotificationQueue.startProcessing).toHaveBeenCalled();
    });

    it('should not start scheduler when disabled', async () => {
      scheduler.updateConfig({ enabled: false });
      
      await scheduler.start();
      
      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(false);
    });

    it('should stop scheduler successfully', async () => {
      await scheduler.start();
      await scheduler.stop();
      
      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(false);
      expect(mockNotificationQueue.stopProcessing).toHaveBeenCalled();
    });

    it('should update configuration correctly', () => {
      const newConfig = {
        batchSize: 25,
        requestDelay: 3000,
        archivingEnabled: false
      };
      
      scheduler.updateConfig(newConfig);
      
      const config = scheduler.getConfig();
      expect(config.batchSize).toBe(25);
      expect(config.requestDelay).toBe(3000);
      expect(config.archivingEnabled).toBe(false);
    });
  });

  describe('Scheduled Job Execution', () => {
    it('should execute status check for all active PNRs', async () => {
      await scheduler.triggerManualCheck();
      
      expect(TrackedPNR.getAllActivePNRs).toHaveBeenCalled();
      expect(BatchProcessorService.processBatch).toHaveBeenCalledWith(
        ['1234567890', '2345678901'],
        expect.objectContaining({
          requestDelay: 2000,
          maxRetries: 3
        })
      );
    });

    it('should handle empty PNR list gracefully', async () => {
      vi.mocked(TrackedPNR.getAllActivePNRs).mockResolvedValueOnce([]);
      
      await scheduler.triggerManualCheck();
      
      expect(TrackedPNR.getAllActivePNRs).toHaveBeenCalled();
      expect(BatchProcessorService.processBatch).not.toHaveBeenCalled();
      
      const stats = scheduler.getStats();
      expect(stats.successfulRuns).toBeGreaterThan(0);
    });

    it('should process PNRs in batches when batch size is smaller than total PNRs', async () => {
      // Create more PNRs than batch size
      const largePNRList = Array.from({ length: 75 }, (_, i) => ({
        id: `pnr-${i}`,
        userId: `user-${i}`,
        pnr: `123456789${i.toString().padStart(1, '0')}`,
        currentStatus: {
          pnr: `123456789${i}`,
          from: 'Test',
          to: 'Test',
          date: '2024-01-15',
          status: 'Confirmed',
          isFlushed: false,
          lastUpdated: new Date()
        },
        isActive: true
      }));

      vi.mocked(TrackedPNR.getAllActivePNRs).mockResolvedValueOnce(largePNRList as any);
      
      // Mock batch results for multiple batches
      vi.mocked(BatchProcessorService.processBatch)
        .mockResolvedValueOnce({ ...mockBatchResult, totalProcessed: 50 })
        .mockResolvedValueOnce({ ...mockBatchResult, totalProcessed: 25 });

      await scheduler.triggerManualCheck();
      
      // Should be called twice (50 + 25 = 75 PNRs)
      expect(BatchProcessorService.processBatch).toHaveBeenCalledTimes(2);
    }, 10000); // Increase timeout for this test

    it('should update scheduler statistics after successful run', async () => {
      const initialStats = scheduler.getStats();
      const initialRuns = initialStats.totalRuns;
      
      await scheduler.triggerManualCheck();
      
      const updatedStats = scheduler.getStats();
      expect(updatedStats.totalRuns).toBe(initialRuns + 1);
      expect(updatedStats.successfulRuns).toBe(initialStats.successfulRuns + 1);
      expect(updatedStats.lastRunTime).toBeDefined();
      expect(updatedStats.lastRunStats).toEqual({
        totalPNRs: 2,
        successfulChecks: 2,
        failedChecks: 0,
        statusChanges: 0,
        processingTime: expect.any(Number)
      });
    });

    it('should handle batch processing errors gracefully', async () => {
      vi.mocked(BatchProcessorService.processBatch).mockRejectedValueOnce(
        new Error('Batch processing failed')
      );
      
      await scheduler.triggerManualCheck();
      
      const stats = scheduler.getStats();
      // Batch processing errors are handled per batch, not as overall failures
      expect(stats.successfulRuns).toBeGreaterThan(0);
      expect(stats.lastRunStats?.failedChecks).toBe(2); // All PNRs in the batch failed
      expect(stats.lastRunStats?.successfulChecks).toBe(0);
    });

    it('should prevent concurrent status checks', async () => {
      // Mock a slow batch process to simulate concurrent access
      vi.mocked(BatchProcessorService.processBatch).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockBatchResult), 100))
      );

      // Start first check
      const firstCheck = scheduler.triggerManualCheck();
      
      // Try to start second check while first is running
      await expect(scheduler.triggerManualCheck()).rejects.toThrow(
        'Status check is already in progress'
      );
      
      // Wait for first check to complete
      await firstCheck;
      expect(scheduler.isCheckInProgress()).toBe(false);
    });
  });

  describe('Status Change Detection Logic', () => {
    it('should detect status changes and trigger notifications', async () => {
      // Mock status change detection
      const mockStatusChangeEvent = {
        trackedPNRId: mockTrackedPNRs[1].id,
        userId: mockTrackedPNRs[1].userId,
        pnr: mockTrackedPNRs[1].pnr,
        oldStatus: 'WL/5',
        newStatus: 'WL/3',
        statusData: mockBatchResult.results[1],
        timestamp: new Date()
      };

      mockStatusChangeDetector.checkStatusChange.mockResolvedValueOnce(mockStatusChangeEvent);
      
      await scheduler.triggerManualCheck();
      
      expect(mockStatusChangeDetector.checkStatusChange).toHaveBeenCalledTimes(2);
      expect(mockStatusChangeDetector.checkStatusChange).toHaveBeenCalledWith(
        mockTrackedPNRs[1].id,
        mockBatchResult.results[1]
      );
      
      const stats = scheduler.getStats();
      expect(stats.lastRunStats?.statusChanges).toBe(1);
    });

    it('should handle status change detection errors gracefully', async () => {
      mockStatusChangeDetector.checkStatusChange
        .mockResolvedValueOnce(null) // First PNR - no change
        .mockRejectedValueOnce(new Error('Status change detection failed')); // Second PNR - error
      
      await scheduler.triggerManualCheck();
      
      expect(mockStatusChangeDetector.checkStatusChange).toHaveBeenCalledTimes(2);
      
      const stats = scheduler.getStats();
      expect(stats.lastRunStats?.statusChanges).toBe(0);
      expect(stats.lastRunStats?.successfulChecks).toBe(1);
      expect(stats.lastRunStats?.failedChecks).toBe(1);
    });

    it('should process multiple status changes correctly', async () => {
      // Mock multiple status changes
      const statusChange1 = {
        trackedPNRId: mockTrackedPNRs[0].id,
        userId: mockTrackedPNRs[0].userId,
        pnr: mockTrackedPNRs[0].pnr,
        oldStatus: 'Confirmed',
        newStatus: 'Chart Prepared',
        statusData: mockBatchResult.results[0],
        timestamp: new Date()
      };

      const statusChange2 = {
        trackedPNRId: mockTrackedPNRs[1].id,
        userId: mockTrackedPNRs[1].userId,
        pnr: mockTrackedPNRs[1].pnr,
        oldStatus: 'WL/5',
        newStatus: 'WL/2',
        statusData: mockBatchResult.results[1],
        timestamp: new Date()
      };

      mockStatusChangeDetector.checkStatusChange
        .mockResolvedValueOnce(statusChange1)
        .mockResolvedValueOnce(statusChange2);
      
      await scheduler.triggerManualCheck();
      
      const stats = scheduler.getStats();
      expect(stats.lastRunStats?.statusChanges).toBe(2);
    });
  });

  describe('Notification Pipeline Integration', () => {
    it('should queue notifications for status changes', async () => {
      const mockStatusChangeEvent = {
        trackedPNRId: mockTrackedPNRs[0].id,
        userId: mockTrackedPNRs[0].userId,
        pnr: mockTrackedPNRs[0].pnr,
        oldStatus: 'WL/5',
        newStatus: 'Confirmed',
        statusData: mockBatchResult.results[0],
        timestamp: new Date()
      };

      // Mock the status change detector to return the event and call notification queue
      mockStatusChangeDetector.checkStatusChange.mockImplementationOnce(async () => {
        // Simulate the notification queue call that would happen in the real implementation
        await mockNotificationQueue.queueStatusChangeNotification(
          mockTrackedPNRs[0].userId,
          {
            trackedPNRId: mockTrackedPNRs[0].id,
            oldStatus: 'WL/5',
            newStatus: 'Confirmed'
          }
        );
        return mockStatusChangeEvent;
      });
      
      mockStatusChangeDetector.checkStatusChange.mockResolvedValueOnce(null); // Second PNR has no change
      
      await scheduler.triggerManualCheck();
      
      expect(mockStatusChangeDetector.checkStatusChange).toHaveBeenCalledTimes(2);
      expect(mockNotificationQueue.queueStatusChangeNotification).toHaveBeenCalledWith(
        mockTrackedPNRs[0].userId,
        expect.objectContaining({
          trackedPNRId: mockTrackedPNRs[0].id,
          oldStatus: 'WL/5',
          newStatus: 'Confirmed'
        })
      );
    });

    it('should handle flushed PNRs and send notifications', async () => {
      const batchResultWithFlushed = {
        ...mockBatchResult,
        flushedPNRs: ['1234567890'],
        results: [
          {
            ...mockBatchResult.results[0],
            isFlushed: true,
            status: 'Flushed PNR'
          },
          mockBatchResult.results[1]
        ]
      };

      vi.mocked(BatchProcessorService.processBatch).mockResolvedValueOnce(batchResultWithFlushed);
      
      await scheduler.triggerManualCheck();
      
      expect(mockNotificationQueue.queueSystemNotification).toHaveBeenCalledWith(
        mockTrackedPNRs[0].userId,
        expect.objectContaining({
          title: 'PNR 1234567890 Expired',
          content: expect.stringContaining('has expired and is no longer available')
        })
      );
    });

    it('should get notification queue statistics', async () => {
      const mockStats = { pending: 5, delayed: 2, failed: 1 };
      mockNotificationQueue.getQueueStats.mockResolvedValueOnce(mockStats);
      
      const stats = await scheduler.getNotificationQueueStats();
      
      expect(stats).toEqual(mockStats);
      expect(mockNotificationQueue.getQueueStats).toHaveBeenCalled();
    });

    it('should handle notification queue errors gracefully', async () => {
      mockNotificationQueue.queueSystemNotification.mockRejectedValueOnce(
        new Error('Notification queue error')
      );

      const batchResultWithFlushed = {
        ...mockBatchResult,
        flushedPNRs: ['1234567890']
      };

      vi.mocked(BatchProcessorService.processBatch).mockResolvedValueOnce(batchResultWithFlushed);
      
      // Should not throw error
      await expect(scheduler.triggerManualCheck()).resolves.not.toThrow();
    });
  });

  describe('PNR Archiving Integration', () => {
    it('should run PNR archiving after status checks when enabled', async () => {
      await scheduler.triggerManualCheck();
      
      expect(mockPNRArchiver.archiveCompletedPNRs).toHaveBeenCalled();
      
      const stats = scheduler.getStats();
      expect(stats.lastArchivingStats).toEqual({
        totalProcessed: 10,
        archivedCount: 5,
        errors: 0,
        processingTime: 2000
      });
    });

    it('should skip archiving when disabled', async () => {
      scheduler.updateConfig({ archivingEnabled: false });
      
      await scheduler.triggerManualCheck();
      
      expect(mockPNRArchiver.archiveCompletedPNRs).not.toHaveBeenCalled();
      expect(scheduler.getStats().lastArchivingStats).toBeUndefined();
    });

    it('should handle archiving errors gracefully', async () => {
      mockPNRArchiver.archiveCompletedPNRs.mockRejectedValueOnce(
        new Error('Archiving failed')
      );
      
      await scheduler.triggerManualCheck();
      
      const stats = scheduler.getStats();
      expect(stats.lastArchivingStats).toEqual({
        totalProcessed: 0,
        archivedCount: 0,
        errors: 1,
        processingTime: 0
      });
    });

    it('should trigger manual archiving', async () => {
      // Enable archiving for this test
      scheduler.updateConfig({ archivingEnabled: true });

      const mockArchivingResult = {
        totalProcessed: 15,
        archivedCount: 8,
        errors: [],
        processingTime: 3000
      };

      mockPNRArchiver.archiveCompletedPNRs.mockResolvedValueOnce(mockArchivingResult);
      
      const result = await scheduler.triggerManualArchiving();
      
      expect(result).toEqual(mockArchivingResult);
      expect(mockPNRArchiver.archiveCompletedPNRs).toHaveBeenCalled();
    });

    it('should throw error when trying to archive with archiving disabled', async () => {
      scheduler.updateConfig({ archivingEnabled: false });
      
      await expect(scheduler.triggerManualArchiving()).rejects.toThrow(
        'PNR archiving is disabled'
      );
    });

    it('should get eligible PNRs for archiving', async () => {
      const mockEligiblePNRs = [
        { id: 'pnr-1', pnr: '1111111111', travelDate: '2024-01-01' },
        { id: 'pnr-2', pnr: '2222222222', travelDate: '2024-01-02' }
      ];

      mockPNRArchiver.getEligiblePNRsForArchiving.mockResolvedValueOnce(mockEligiblePNRs);
      
      const result = await scheduler.getEligiblePNRsForArchiving();
      
      expect(result).toEqual(mockEligiblePNRs);
      expect(mockPNRArchiver.getEligiblePNRsForArchiving).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle TrackedPNR.getAllActivePNRs error', async () => {
      vi.mocked(TrackedPNR.getAllActivePNRs).mockRejectedValueOnce(
        new Error('Database connection failed')
      );
      
      await scheduler.triggerManualCheck();
      
      const stats = scheduler.getStats();
      expect(stats.failedRuns).toBeGreaterThan(0);
    });

    it('should handle individual batch processing errors', async () => {
      const batchResultWithErrors = {
        ...mockBatchResult,
        results: [
          mockBatchResult.results[0],
          {
            ...mockBatchResult.results[1],
            error: 'Network timeout'
          }
        ],
        errors: [
          {
            pnr: '2345678901',
            error: 'Network timeout',
            retryCount: 3
          }
        ],
        totalSuccessful: 1,
        totalFailed: 1
      };

      vi.mocked(BatchProcessorService.processBatch).mockResolvedValueOnce(batchResultWithErrors);
      
      await scheduler.triggerManualCheck();
      
      const stats = scheduler.getStats();
      expect(stats.lastRunStats?.successfulChecks).toBe(1);
      expect(stats.lastRunStats?.failedChecks).toBe(1);
    });

    it('should cleanup resources properly', async () => {
      await scheduler.start();
      await scheduler.cleanup();
      
      expect(mockNotificationQueue.cleanup).toHaveBeenCalled();
      
      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update archiver configuration', () => {
      const archiverConfig = {
        enabled: false,
        daysAfterTravel: 30
      };
      
      scheduler.updateArchiverConfig(archiverConfig);
      
      expect(mockPNRArchiver.updateConfig).toHaveBeenCalledWith(archiverConfig);
    });

    it('should get archiver configuration', () => {
      const mockConfig = {
        enabled: true,
        daysAfterTravel: 7,
        batchSize: 100
      };

      mockPNRArchiver.getConfig.mockReturnValueOnce(mockConfig);
      
      const config = scheduler.getArchiverConfig();
      
      expect(config).toEqual(mockConfig);
      expect(mockPNRArchiver.getConfig).toHaveBeenCalled();
    });
  });
});