import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { Notification, NotificationFilters } from '../models/Notification';
import { User } from '../models/User';
import { notificationService } from '../services/notification';
import { ApiResponse, PaginatedResponse } from '../types';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const notificationFiltersSchema = Joi.object({
  type: Joi.string().valid('confirmation', 'waitlist_movement', 'cancellation', 'chart_prepared', 'system', 'error').optional(),
  isRead: Joi.boolean().optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const notificationPreferencesSchema = Joi.object({
  emailEnabled: Joi.boolean().required(),
  pushEnabled: Joi.boolean().required(),
  inAppEnabled: Joi.boolean().required(),
  statusTypes: Joi.array().items(
    Joi.string().valid('confirmation', 'waitlist_movement', 'cancellation', 'chart_prepared')
  ).required()
});

const testEmailSchema = Joi.object({
  email: Joi.string().email().optional()
});

/**
 * GET /api/notifications
 * Get user's notifications with filtering and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = notificationFiltersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        message: error.details[0].message
      } as ApiResponse);
    }

    const { type, isRead, fromDate, toDate, page, limit } = value;
    const userId = req.user!.id;
    const offset = (page - 1) * limit;

    // Build filters
    const filters: NotificationFilters = {};
    if (type !== undefined) filters.type = type;
    if (isRead !== undefined) filters.isRead = isRead;
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);

    // Get notifications and total count
    const [notifications, totalCount] = await Promise.all([
      Notification.findByUserId(userId, filters, limit, offset),
      Notification.countByUserId(userId, filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: notifications.map(n => n.toJSON()),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages
      }
    } as PaginatedResponse<typeof notifications[0]>);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch notifications'
    } as ApiResponse);
  }
});

/**
 * GET /api/notifications/unread
 * Get user's unread notifications
 */
router.get('/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const notifications = await Notification.getUnreadNotifications(userId, limit);

    res.json({
      success: true,
      data: notifications.map(n => n.toJSON())
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch unread notifications'
    } as ApiResponse);
  }
});

/**
 * GET /api/notifications/count
 * Get user's notification counts
 */
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [unreadCount, totalCount] = await Promise.all([
      Notification.getUnreadCount(userId),
      Notification.countByUserId(userId)
    ]);

    res.json({
      success: true,
      data: {
        unread: unreadCount,
        total: totalCount
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch notification counts'
    } as ApiResponse);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user!.id;

    // Find the notification
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      } as ApiResponse);
    }

    // Check if notification belongs to the user
    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as ApiResponse);
    }

    // Mark as read
    await notification.markAsRead();

    res.json({
      success: true,
      data: notification.toJSON(),
      message: 'Notification marked as read'
    } as ApiResponse);

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to mark notification as read'
    } as ApiResponse);
  }
});

/**
 * PUT /api/notifications/:id/unread
 * Mark a specific notification as unread
 */
router.put('/:id/unread', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user!.id;

    // Find the notification
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      } as ApiResponse);
    }

    // Check if notification belongs to the user
    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as ApiResponse);
    }

    // Mark as unread
    await notification.markAsUnread();

    res.json({
      success: true,
      data: notification.toJSON(),
      message: 'Notification marked as unread'
    } as ApiResponse);

  } catch (error) {
    console.error('Error marking notification as unread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to mark notification as unread'
    } as ApiResponse);
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for the user
 */
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const updatedCount = await Notification.markAllAsReadForUser(userId);

    res.json({
      success: true,
      data: { updatedCount },
      message: `${updatedCount} notifications marked as read`
    } as ApiResponse);

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to mark all notifications as read'
    } as ApiResponse);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user!.id;

    // Find the notification
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      } as ApiResponse);
    }

    // Check if notification belongs to the user
    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as ApiResponse);
    }

    // Delete the notification
    await notification.delete();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete notification'
    } as ApiResponse);
  }
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: user.notificationPreferences
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch notification preferences'
    } as ApiResponse);
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { error, value } = notificationPreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification preferences',
        message: error.details[0].message
      } as ApiResponse);
    }

    const userId = req.user!.id;
    const preferences = value;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }

    // Update preferences
    await user.update({ notificationPreferences: preferences });

    res.json({
      success: true,
      data: user.notificationPreferences,
      message: 'Notification preferences updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update notification preferences'
    } as ApiResponse);
  }
});

/**
 * POST /api/notifications/test-email
 * Send a test email notification
 */
router.post('/test-email', authenticateToken, async (req, res) => {
  try {
    const { error, value } = testEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        message: error.details[0].message
      } as ApiResponse);
    }

    const userId = req.user!.id;
    const testEmail = value.email;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }

    // Use provided email or user's email
    const emailAddress = testEmail || user.email;

    // Send test email
    const success = await notificationService.sendTestEmail(emailAddress);

    if (success) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${emailAddress}`
      } as ApiResponse);
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        message: 'Please check email configuration'
      } as ApiResponse);
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to send test email'
    } as ApiResponse);
  }
});

/**
 * GET /api/notifications/recent
 * Get recent notifications for the user
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const notifications = await Notification.getRecentNotifications(userId, limit);

    res.json({
      success: true,
      data: notifications.map(n => n.toJSON())
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch recent notifications'
    } as ApiResponse);
  }
});

export default router;