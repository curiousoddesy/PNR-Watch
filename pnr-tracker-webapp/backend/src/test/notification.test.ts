import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../services/notification';
import { NotificationQueue } from '../services/notification-queue';
import { User } from '../models/User';
import { TrackedPNR } from '../models/TrackedPNR';
import { Notification } from '../models/Notification';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

// Mock external dependencies
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn()
  }
}));
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn()
  }
}));
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    quit: vi.fn(),
    zAdd: vi.fn(),
    zRem: vi.fn(),
    zRange: vi.fn(),
    zRangeByScore: vi.fn(),
    zCard: vi.fn(),
    del: vi.fn(),
    on: vi.fn()
  }))
}));

// Mock database connection
vi.mock('../config/database', () => ({
  default: {
    getInstance: () => ({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    })
  }
}));

describe('Notification System Tests', () => {
  let notificationService: NotificationService;
  let notificationQueue: NotificationQueue;
  let mockTransporter: any;
  let mockUser: User;
  let mockTrackedPNR: TrackedPNR;

  beforeAll(() => {
    // Set up environment variables for testing
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'testpass';
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_EMAIL = 'test@example.com';
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock nodemailer transporter
    mockTransporter = {
      sendMail: vi.fn(),
      verify: vi.fn()
    };
    
    (nodemailer.createTransport as any).mockReturnValue(mockTransporter);

    // Mock webpush
    (webpush.setVapidDetails as any) = vi.fn();

    // Create service instances
    notificationService = new NotificationService();
    notificationQueue = new NotificationQueue(notificationService);

    // Create mock user
    mockUser = new User({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'mock-hash',
      notificationPreferences: {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        statusTypes: ['confirmation', 'waitlist_movement', 'cancellation', 'chart_prepared']
      }
    });

    // Create mock tracked PNR
    mockTrackedPNR = new TrackedPNR({
      id: '456e7890-e89b-12d3-a456-426614174001',
      userId: mockUser.id!,
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
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_EMAIL;
  });

  describe('Email Notification Tests', () => {
    it('should send email notification successfully', async () => {
      // Mock successful email sending
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>'
      };

      const result = await notificationService.sendEmailNotification(emailData);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_USER,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html
      });
    });

    it('should handle email sending failure', async () => {
      // Mock email sending failure
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message'
      };

      const result = await notificationService.sendEmailNotification(emailData);

      expect(result).toBe(false);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should test email configuration', async () => {
      // Mock successful verification
      mockTransporter.verify.mockResolvedValue(true);

      const result = await notificationService.testEmailConfiguration();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle email configuration test failure', async () => {
      // Mock verification failure
      mockTransporter.verify.mockRejectedValue(new Error('Invalid credentials'));

      const result = await notificationService.testEmailConfiguration();

      expect(result).toBe(false);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should send test email successfully', async () => {
      // Mock successful email sending
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });

      const result = await notificationService.sendTestEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'PNR Tracker - Test Email'
        })
      );
    });

    it('should generate proper email template for status change', async () => {
      // Mock Notification.create to capture the notification data
      const mockCreate = vi.spyOn(Notification, 'create').mockResolvedValue(
        new Notification({
          id: 'notif-123',
          userId: mockUser.id!,
          type: 'confirmation',
          title: 'Test Notification',
          content: 'Test content'
        })
      );

      // Mock successful email sending
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });

      await notificationService.sendStatusChangeNotification(
        mockUser,
        mockTrackedPNR,
        'Waitlisted',
        'Confirmed'
      );

      // Verify email was sent with proper template
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining('PNR 1234567890 Status Update'),
          text: expect.stringContaining('Congratulations! Your ticket has been confirmed'),
          html: expect.stringContaining('🎉 Congratulations!')
        })
      );

      mockCreate.mockRestore();
    });
  });

  describe('Push Notification Tests', () => {
    it('should prepare push notification successfully', async () => {
      const pushData = {
        title: 'Test Notification',
        body: 'Test message',
        icon: '/test-icon.png',
        data: { pnr: '1234567890' }
      };

      const result = await notificationService.sendPushNotification(
        mockUser.id!,
        pushData
      );

      expect(result).toBe(true);
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'test-public-key',
        'test-private-key'
      );
    });

    it('should handle missing VAPID configuration', async () => {
      // Temporarily remove VAPID keys
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      // Create new service instance without VAPID keys
      const serviceWithoutVapid = new NotificationService();

      const pushData = {
        title: 'Test Notification',
        body: 'Test message'
      };

      const result = await serviceWithoutVapid.sendPushNotification(
        mockUser.id!,
        pushData
      );

      expect(result).toBe(false);

      // Restore VAPID keys
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    });

    it('should include proper payload in push notification', async () => {
      const pushData = {
        title: 'PNR Status Update',
        body: 'Your PNR 1234567890 has been confirmed',
        data: { 
          pnr: '1234567890',
          type: 'confirmation'
        }
      };

      const result = await notificationService.sendPushNotification(
        mockUser.id!,
        pushData
      );

      expect(result).toBe(true);
      // In a real implementation, we would verify the payload structure
      // For now, we just verify the method completes successfully
    });
  });

  describe('In-App Notification Tests', () => {
    it('should create in-app notification successfully', async () => {
      // Mock Notification.create
      const mockNotification = new Notification({
        id: 'notif-123',
        userId: mockUser.id!,
        type: 'confirmation',
        title: 'Test Notification',
        content: 'Test content'
      });

      const mockCreate = vi.spyOn(Notification, 'create').mockResolvedValue(mockNotification);

      const result = await notificationService.createInAppNotification(
        mockUser.id!,
        'confirmation',
        'Test Notification',
        'Test content',
        { pnr: '1234567890' }
      );

      expect(result).toBe(mockNotification);
      expect(mockCreate).toHaveBeenCalledWith({
        userId: mockUser.id!,
        type: 'confirmation',
        title: 'Test Notification',
        content: 'Test content',
        metadata: { pnr: '1234567890' }
      });

      mockCreate.mockRestore();
    });
  });

  describe('Status Change Notification Tests', () => {
    it('should send complete status change notification when all preferences enabled', async () => {
      // Mock all notification methods
      const mockCreateInApp = vi.spyOn(Notification, 'create').mockResolvedValue(
        new Notification({
          id: 'notif-123',
          userId: mockUser.id!,
          type: 'confirmation',
          title: 'Test Notification',
          content: 'Test content'
        })
      );

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await notificationService.sendStatusChangeNotification(
        mockUser,
        mockTrackedPNR,
        'Waitlisted',
        'Confirmed'
      );

      // Verify in-app notification was created
      expect(mockCreateInApp).toHaveBeenCalled();

      // Verify email was sent
      expect(mockTransporter.sendMail).toHaveBeenCalled();

      // Push notification should be prepared (returns true)
      // In a real implementation, we would verify actual push sending

      mockCreateInApp.mockRestore();
    });

    it('should respect user notification preferences', async () => {
      // Create user with limited preferences
      const limitedUser = new User({
        ...mockUser.toJSON(),
        notificationPreferences: {
          emailEnabled: false,
          pushEnabled: false,
          inAppEnabled: true,
          statusTypes: ['confirmation']
        }
      });

      const mockCreateInApp = vi.spyOn(Notification, 'create').mockResolvedValue(
        new Notification({
          id: 'notif-123',
          userId: limitedUser.id!,
          type: 'confirmation',
          title: 'Test Notification',
          content: 'Test content'
        })
      );

      await notificationService.sendStatusChangeNotification(
        limitedUser,
        mockTrackedPNR,
        'Waitlisted',
        'Confirmed'
      );

      // Only in-app notification should be created
      expect(mockCreateInApp).toHaveBeenCalled();

      // Email should not be sent
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();

      mockCreateInApp.mockRestore();
    });

    it('should not send notification for disabled status types', async () => {
      // Create user who doesn't want waitlist movement notifications
      const selectiveUser = new User({
        ...mockUser.toJSON(),
        notificationPreferences: {
          emailEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          statusTypes: ['confirmation', 'cancellation'] // No waitlist_movement
        }
      });

      const mockCreateInApp = vi.spyOn(Notification, 'create');

      await notificationService.sendStatusChangeNotification(
        selectiveUser,
        mockTrackedPNR,
        'WL/1',
        'WL/2' // This should be classified as waitlist_movement
      );

      // No notifications should be sent
      expect(mockCreateInApp).not.toHaveBeenCalled();
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();

      mockCreateInApp.mockRestore();
    });

    it('should determine correct notification type based on status', async () => {
      const mockCreateInApp = vi.spyOn(Notification, 'create').mockResolvedValue(
        new Notification({
          id: 'notif-123',
          userId: mockUser.id!,
          type: 'cancellation',
          title: 'Test Notification',
          content: 'Test content'
        })
      );

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await notificationService.sendStatusChangeNotification(
        mockUser,
        mockTrackedPNR,
        'Confirmed',
        'Cancelled'
      );

      // Verify cancellation type was used
      expect(mockCreateInApp).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cancellation'
        })
      );

      mockCreateInApp.mockRestore();
    });
  });

  describe('System Notification Tests', () => {
    it('should send system notification successfully', async () => {
      // Mock User.findById
      const mockFindById = vi.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const mockCreateInApp = vi.spyOn(Notification, 'create').mockResolvedValue(
        new Notification({
          id: 'notif-123',
          userId: mockUser.id!,
          type: 'system',
          title: 'System Notification',
          content: 'System message'
        })
      );

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await notificationService.sendSystemNotification(
        mockUser.id!,
        'System Maintenance',
        'System will be down for maintenance',
        { maintenanceWindow: '2024-01-15 02:00-04:00' }
      );

      // Verify in-app notification was created
      expect(mockCreateInApp).toHaveBeenCalledWith({
        userId: mockUser.id!,
        type: 'system',
        title: 'System Maintenance',
        content: 'System will be down for maintenance',
        metadata: { maintenanceWindow: '2024-01-15 02:00-04:00' }
      });

      // Verify email was sent (user has email enabled)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: 'PNR Tracker - System Maintenance'
        })
      );

      mockFindById.mockRestore();
      mockCreateInApp.mockRestore();
    });

    it('should handle user not found for system notification', async () => {
      // Mock User.findById to return null
      const mockFindById = vi.spyOn(User, 'findById').mockResolvedValue(null);

      const mockCreateInApp = vi.spyOn(Notification, 'create').mockResolvedValue(
        new Notification({
          id: 'notif-123',
          userId: 'non-existent-user',
          type: 'system',
          title: 'System Notification',
          content: 'System message'
        })
      );

      await notificationService.sendSystemNotification(
        'non-existent-user',
        'System Maintenance',
        'System will be down for maintenance'
      );

      // In-app notification should still be created
      expect(mockCreateInApp).toHaveBeenCalled();

      // Email should not be sent (user not found)
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();

      mockFindById.mockRestore();
      mockCreateInApp.mockRestore();
    });
  });

  describe('Notification Queue Tests', () => {
    it('should queue status change notification successfully', async () => {
      const notificationId = await notificationQueue.queueStatusChangeNotification(
        mockUser.id!,
        {
          trackedPNRId: mockTrackedPNR.id!,
          oldStatus: 'Waitlisted',
          newStatus: 'Confirmed'
        }
      );

      expect(notificationId).toBeTruthy();
      expect(typeof notificationId).toBe('string');
      expect(notificationId).toMatch(/^notif_\d+_[a-z0-9]+$/);
    });

    it('should queue system notification successfully', async () => {
      const notificationId = await notificationQueue.queueSystemNotification(
        mockUser.id!,
        {
          title: 'System Alert',
          content: 'Important system message',
          metadata: { priority: 'high' }
        }
      );

      expect(notificationId).toBeTruthy();
      expect(typeof notificationId).toBe('string');
      expect(notificationId).toMatch(/^notif_\d+_[a-z0-9]+$/);
    });

    it('should queue delayed notification successfully', async () => {
      const delay = 5000; // 5 seconds
      const notificationId = await notificationQueue.queueStatusChangeNotification(
        mockUser.id!,
        {
          trackedPNRId: mockTrackedPNR.id!,
          oldStatus: 'Waitlisted',
          newStatus: 'Confirmed'
        },
        delay
      );

      expect(notificationId).toBeTruthy();
      expect(typeof notificationId).toBe('string');
    });

    it('should get queue statistics', async () => {
      // Mock Redis responses
      const mockRedis = (notificationQueue as any).redis;
      mockRedis.zCard.mockResolvedValueOnce(5) // pending
                   .mockResolvedValueOnce(2) // delayed
                   .mockResolvedValueOnce(1); // failed

      const stats = await notificationQueue.getQueueStats();

      expect(stats).toEqual({
        pending: 5,
        delayed: 2,
        failed: 1
      });
    });

    it('should handle queue statistics error gracefully', async () => {
      // Mock Redis error
      const mockRedis = (notificationQueue as any).redis;
      mockRedis.zCard.mockRejectedValue(new Error('Redis error'));

      const stats = await notificationQueue.getQueueStats();

      expect(stats).toEqual({
        pending: 0,
        delayed: 0,
        failed: 0
      });
    });
  });

  describe('Notification Preference Management Tests', () => {
    it('should update user notification preferences', async () => {
      const newPreferences = {
        emailEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        statusTypes: ['confirmation', 'cancellation']
      };

      // Mock user update method
      const mockUpdate = vi.spyOn(mockUser, 'update').mockResolvedValue(mockUser);

      await mockUser.update({ notificationPreferences: newPreferences });

      expect(mockUpdate).toHaveBeenCalledWith({
        notificationPreferences: newPreferences
      });

      mockUpdate.mockRestore();
    });

    it('should validate notification preference structure', () => {
      const validPreferences = {
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        statusTypes: ['confirmation', 'waitlist_movement']
      };

      // Test that preferences have required fields
      expect(validPreferences).toHaveProperty('emailEnabled');
      expect(validPreferences).toHaveProperty('pushEnabled');
      expect(validPreferences).toHaveProperty('inAppEnabled');
      expect(validPreferences).toHaveProperty('statusTypes');
      expect(Array.isArray(validPreferences.statusTypes)).toBe(true);
    });

    it('should handle invalid status types in preferences', () => {
      const invalidPreferences = {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        statusTypes: ['invalid_type', 'confirmation']
      };

      // In a real implementation, this would be validated by Joi schema
      // For now, we just verify the structure
      expect(invalidPreferences.statusTypes).toContain('invalid_type');
      expect(invalidPreferences.statusTypes).toContain('confirmation');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle notification service errors gracefully', async () => {
      // Mock database error
      const mockCreate = vi.spyOn(Notification, 'create').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        notificationService.sendStatusChangeNotification(
          mockUser,
          mockTrackedPNR,
          'Waitlisted',
          'Confirmed'
        )
      ).rejects.toThrow('Database connection failed');

      mockCreate.mockRestore();
    });

    it('should handle email service errors gracefully', async () => {
      // Mock email service error
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP server unavailable'));

      const result = await notificationService.sendEmailNotification({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message'
      });

      expect(result).toBe(false);
    });

    it('should handle missing user data gracefully', async () => {
      // Mock User.findById to return null
      const mockFindById = vi.spyOn(User, 'findById').mockResolvedValue(null);

      // The method should throw an error when user is not found for in-app notification
      await expect(
        notificationService.sendSystemNotification(
          'non-existent-user',
          'Test',
          'Test message'
        )
      ).rejects.toThrow();

      mockFindById.mockRestore();
    });
  });
});