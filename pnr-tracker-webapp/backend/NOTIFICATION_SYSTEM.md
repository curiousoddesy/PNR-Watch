# Notification System Implementation

This document describes the notification system implemented for the PNR Tracker application.

## Overview

The notification system provides comprehensive email, push, and in-app notifications for PNR status changes. It includes:

1. **Notification Service Infrastructure** - Core services for sending notifications
2. **Status Change Detection** - Background monitoring and change detection
3. **Notification Management API** - REST endpoints for managing notifications

## Components

### 1. Core Services

#### NotificationService (`src/services/notification.ts`)
- Email notifications using Nodemailer
- Push notifications using Web Push API
- In-app notification creation
- Template system for different notification types
- User preference-based notification dispatch

#### NotificationQueue (`src/services/notification-queue.ts`)
- Redis-based notification queue for reliable delivery
- Retry logic with exponential backoff
- Delayed notification scheduling
- Failed notification tracking and management

#### StatusChangeDetector (`src/services/status-change-detector.ts`)
- Intelligent status change detection
- Waitlist position tracking
- Confirmation/cancellation detection
- Status history management

#### BackgroundScheduler (`src/services/background-scheduler.ts`)
- Cron-based scheduled PNR status checking
- Batch processing with rate limiting
- Automatic flushed PNR handling
- Configurable scheduling and processing options

### 2. API Endpoints

#### Notification Management (`src/routes/notifications.ts`)
- `GET /api/notifications` - Get user notifications with filtering/pagination
- `GET /api/notifications/unread` - Get unread notifications
- `GET /api/notifications/count` - Get notification counts
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/:id/unread` - Mark notification as unread
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/preferences` - Get notification preferences
- `PUT /api/notifications/preferences` - Update notification preferences
- `POST /api/notifications/test-email` - Send test email
- `GET /api/notifications/recent` - Get recent notifications

#### Admin Management (`src/routes/admin.ts`)
- `GET /api/admin/scheduler/status` - Get scheduler status and stats
- `POST /api/admin/scheduler/trigger` - Manually trigger status check
- `PUT /api/admin/scheduler/config` - Update scheduler configuration

### 3. Database Models

#### Notification Model (`src/models/Notification.ts`)
- Enhanced with comprehensive CRUD operations
- Filtering and pagination support
- Status change notification creation helpers

#### User Model (`src/models/User.ts`)
- Notification preferences management
- Already implemented in previous tasks

#### TrackedPNR Model (`src/models/TrackedPNR.ts`)
- Added `updateStatus()` method for status updates
- Integration with status change detection

## Configuration

### Environment Variables

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@pnr-tracker.com

# Push Notification Configuration
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com

# Background Scheduler Configuration
SCHEDULER_ENABLED=true
SCHEDULER_CRON=0 */30 * * * *
SCHEDULER_BATCH_SIZE=50
SCHEDULER_REQUEST_DELAY=2000
SCHEDULER_MAX_RETRIES=3
SCHEDULER_INITIAL_CHECK=false
AUTO_DEACTIVATE_FLUSHED=false

# Admin Configuration
ADMIN_EMAILS=admin@example.com

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### Notification Types

- `confirmation` - Ticket confirmed
- `waitlist_movement` - Waitlist position changed
- `cancellation` - Ticket cancelled
- `chart_prepared` - Chart prepared
- `system` - System notifications
- `error` - Error notifications

### User Preferences

Users can configure:
- Email notifications (enabled/disabled)
- Push notifications (enabled/disabled)
- In-app notifications (enabled/disabled)
- Status types to receive notifications for

## Features

### Email Notifications
- HTML and text templates
- Type-specific styling and content
- Journey details included
- Configurable SMTP settings

### Push Notifications
- Web Push API integration
- VAPID key configuration
- Subscription management (to be implemented in frontend)

### In-App Notifications
- Real-time notification creation
- Read/unread status tracking
- Filtering and pagination
- Bulk operations

### Status Change Detection
- Intelligent change detection beyond simple string comparison
- Waitlist position tracking
- Confirmation status detection
- Flushed PNR handling

### Background Processing
- Scheduled status checking every 30 minutes (configurable)
- Batch processing with rate limiting
- Retry logic for failed requests
- Queue-based notification delivery

### Admin Features
- Scheduler status monitoring
- Manual status check triggering
- Configuration updates
- Queue statistics

## Usage

### Starting the System

The notification system starts automatically when the server starts:

```typescript
import { backgroundScheduler } from './services/background-scheduler';

// In your main application
await backgroundScheduler.start();
```

### Sending Notifications

```typescript
import { notificationService } from './services/notification';

// Send status change notification
await notificationService.sendStatusChangeNotification(
  user,
  trackedPNR,
  oldStatus,
  newStatus
);

// Send system notification
await notificationService.sendSystemNotification(
  userId,
  'System Maintenance',
  'The system will be under maintenance from 2 AM to 4 AM.'
);
```

### Managing Notifications

```typescript
// Create in-app notification
const notification = await Notification.create({
  userId: 'user-id',
  type: 'confirmation',
  title: 'Ticket Confirmed',
  content: 'Your PNR 1234567890 has been confirmed.'
});

// Mark as read
await notification.markAsRead();

// Get user notifications
const notifications = await Notification.findByUserId(userId, filters, limit, offset);
```

## Integration Points

### With Existing Services
- Integrates with existing `BatchProcessorService` for PNR checking
- Uses existing `TrackedPNR` and `User` models
- Leverages existing authentication middleware

### With Frontend
- REST API endpoints for notification management
- WebSocket support can be added for real-time updates
- Push notification subscription management (to be implemented)

## Security Considerations

- Admin endpoints require authentication and admin role
- Users can only access their own notifications
- Input validation on all endpoints
- Rate limiting on notification sending
- Secure VAPID key management

## Performance

- Redis-based queue for scalability
- Batch processing to avoid overwhelming external services
- Configurable rate limiting
- Efficient database queries with pagination
- Background processing doesn't block main application

## Monitoring

- Comprehensive logging throughout the system
- Queue statistics and monitoring
- Scheduler status and performance metrics
- Failed notification tracking
- Admin dashboard for system health

## Future Enhancements

1. **Push Subscription Management** - Frontend integration for push notifications
2. **WebSocket Integration** - Real-time notification delivery
3. **Notification Templates** - User-customizable notification templates
4. **Advanced Filtering** - More sophisticated notification filtering options
5. **Notification Channels** - SMS, Slack, Discord integration
6. **Analytics** - Notification delivery analytics and reporting
7. **A/B Testing** - Test different notification strategies
8. **Machine Learning** - Intelligent notification timing and frequency