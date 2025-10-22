import nodemailer from 'nodemailer';
import webpush from 'web-push';
import { User } from '../models/User';
import { Notification, NotificationType } from '../models/Notification';
import { TrackedPNR } from '../models/TrackedPNR';
import { PNRStatusResult } from '../types';

export interface EmailNotificationData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface NotificationTemplate {
  subject: string;
  text: string;
  html?: string;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private vapidKeys: { publicKey: string; privateKey: string };

  constructor() {
    this.initializeEmailService();
    this.initializePushService();
  }

  private initializeEmailService(): void {
    // Configure email transporter with SMTP settings
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  }

  private initializePushService(): void {
    // Configure Web Push with VAPID keys
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || process.env.SMTP_USER;

    if (publicKey && privateKey && email && publicKey.trim() && privateKey.trim()) {
      try {
        this.vapidKeys = { publicKey, privateKey };
        webpush.setVapidDetails(
          `mailto:${email}`,
          publicKey,
          privateKey
        );
        console.log('Push notification service initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize push notification service:', error.message);
        console.warn('Push notifications will not work.');
      }
    } else {
      console.warn('VAPID keys not configured. Push notifications will not work.');
      console.warn('To enable push notifications, set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL in .env');
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(data: EmailNotificationData): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html || data.text
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send push notification to user's subscribed devices
   */
  async sendPushNotification(
    userId: string, 
    notification: PushNotificationData
  ): Promise<boolean> {
    try {
      if (!this.vapidKeys) {
        console.warn('Push notifications not configured');
        return false;
      }

      // TODO: Implement push subscription storage and retrieval
      // For now, we'll return true as if sent successfully
      // This will be implemented when we add push subscription management
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/badge-72x72.png',
        data: notification.data || {}
      });

      // In a real implementation, we would:
      // 1. Retrieve user's push subscriptions from database
      // 2. Send to each subscription
      // 3. Handle failed subscriptions (remove invalid ones)
      
      console.log(`Push notification prepared for user ${userId}:`, payload);
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    return await Notification.create({
      userId,
      type,
      title,
      content,
      metadata
    });
  }

  /**
   * Send status change notification based on user preferences
   */
  async sendStatusChangeNotification(
    user: User,
    trackedPNR: TrackedPNR,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      const { notificationPreferences } = user;
      const pnr = trackedPNR.pnr;
      const currentStatus = trackedPNR.currentStatus;

      // Determine notification type
      let notificationType: NotificationType = 'waitlist_movement';
      if (newStatus.toLowerCase().includes('confirm')) {
        notificationType = 'confirmation';
      } else if (newStatus.toLowerCase().includes('cancel')) {
        notificationType = 'cancellation';
      } else if (newStatus.toLowerCase().includes('chart')) {
        notificationType = 'chart_prepared';
      }

      // Check if user wants notifications for this status type
      if (!notificationPreferences.statusTypes.includes(notificationType)) {
        console.log(`User ${user.id} has disabled notifications for ${notificationType}`);
        return;
      }

      const title = `PNR ${pnr} Status Updated`;
      const content = this.generateStatusChangeContent(
        pnr,
        oldStatus,
        newStatus,
        currentStatus
      );

      const metadata = {
        pnr,
        oldStatus,
        newStatus,
        journeyDetails: {
          from: currentStatus.from,
          to: currentStatus.to,
          date: currentStatus.date
        }
      };

      // Send in-app notification if enabled
      if (notificationPreferences.inAppEnabled) {
        await this.createInAppNotification(
          user.id!,
          notificationType,
          title,
          content,
          metadata
        );
      }

      // Send email notification if enabled
      if (notificationPreferences.emailEnabled) {
        const template = this.generateEmailTemplate(
          notificationType,
          pnr,
          oldStatus,
          newStatus,
          currentStatus
        );

        await this.sendEmailNotification({
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: template.html
        });
      }

      // Send push notification if enabled
      if (notificationPreferences.pushEnabled) {
        await this.sendPushNotification(user.id!, {
          title,
          body: content,
          data: metadata
        });
      }

    } catch (error) {
      console.error('Failed to send status change notification:', error);
      throw error;
    }
  }

  /**
   * Generate content for status change notification
   */
  private generateStatusChangeContent(
    pnr: string,
    oldStatus: string,
    newStatus: string,
    journeyDetails: PNRStatusResult
  ): string {
    let content = `Your PNR ${pnr} status changed from "${oldStatus}" to "${newStatus}"`;
    
    if (journeyDetails.from && journeyDetails.to && journeyDetails.date) {
      content += ` for journey from ${journeyDetails.from} to ${journeyDetails.to} on ${journeyDetails.date}`;
    }

    return content;
  }

  /**
   * Generate email template for different notification types
   */
  private generateEmailTemplate(
    type: NotificationType,
    pnr: string,
    oldStatus: string,
    newStatus: string,
    journeyDetails: PNRStatusResult
  ): NotificationTemplate {
    const subject = `PNR ${pnr} Status Update - ${newStatus}`;
    
    let text = `Dear Passenger,\n\n`;
    text += `Your PNR ${pnr} status has been updated.\n\n`;
    text += `Previous Status: ${oldStatus}\n`;
    text += `Current Status: ${newStatus}\n\n`;
    
    if (journeyDetails.from && journeyDetails.to && journeyDetails.date) {
      text += `Journey Details:\n`;
      text += `From: ${journeyDetails.from}\n`;
      text += `To: ${journeyDetails.to}\n`;
      text += `Date: ${journeyDetails.date}\n\n`;
    }

    // Add type-specific messages
    switch (type) {
      case 'confirmation':
        text += `🎉 Congratulations! Your ticket has been confirmed.\n`;
        break;
      case 'cancellation':
        text += `❌ Your ticket has been cancelled. Please check with railway authorities for refund details.\n`;
        break;
      case 'chart_prepared':
        text += `📋 Chart has been prepared for your journey. Please check your seat/berth details.\n`;
        break;
      case 'waitlist_movement':
        text += `📈 Your waitlist position has changed. Keep checking for further updates.\n`;
        break;
    }

    text += `\nLast Updated: ${journeyDetails.lastUpdated.toLocaleString()}\n\n`;
    text += `Best regards,\nPNR Tracker Team`;

    // Generate HTML version
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">PNR Status Update</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">PNR: ${pnr}</h3>
          <p><strong>Previous Status:</strong> <span style="color: #6c757d;">${oldStatus}</span></p>
          <p><strong>Current Status:</strong> <span style="color: #28a745; font-weight: bold;">${newStatus}</span></p>
        </div>

        ${journeyDetails.from && journeyDetails.to && journeyDetails.date ? `
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #495057;">Journey Details</h4>
          <p><strong>From:</strong> ${journeyDetails.from}</p>
          <p><strong>To:</strong> ${journeyDetails.to}</p>
          <p><strong>Date:</strong> ${journeyDetails.date}</p>
        </div>
        ` : ''}

        <div style="padding: 15px; border-left: 4px solid #007bff; background-color: #f8f9fa; margin: 20px 0;">
          ${this.getTypeSpecificHtmlMessage(type)}
        </div>

        <p style="color: #6c757d; font-size: 14px;">
          <strong>Last Updated:</strong> ${journeyDetails.lastUpdated.toLocaleString()}
        </p>

        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="color: #6c757d; font-size: 14px;">
          Best regards,<br>
          <strong>PNR Tracker Team</strong>
        </p>
      </div>
    `;

    return { subject, text, html };
  }

  /**
   * Get type-specific HTML message for email templates
   */
  private getTypeSpecificHtmlMessage(type: NotificationType): string {
    switch (type) {
      case 'confirmation':
        return `<p style="color: #28a745;"><strong>🎉 Congratulations!</strong> Your ticket has been confirmed.</p>`;
      case 'cancellation':
        return `<p style="color: #dc3545;"><strong>❌ Ticket Cancelled</strong> Your ticket has been cancelled. Please check with railway authorities for refund details.</p>`;
      case 'chart_prepared':
        return `<p style="color: #17a2b8;"><strong>📋 Chart Prepared</strong> Chart has been prepared for your journey. Please check your seat/berth details.</p>`;
      case 'waitlist_movement':
        return `<p style="color: #ffc107;"><strong>📈 Waitlist Update</strong> Your waitlist position has changed. Keep checking for further updates.</p>`;
      default:
        return `<p>Your PNR status has been updated.</p>`;
    }
  }

  /**
   * Send system notification (for errors, maintenance, etc.)
   */
  async sendSystemNotification(
    userId: string,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Always create in-app notification for system messages
      await this.createInAppNotification(
        userId,
        'system' as NotificationType,
        title,
        content,
        metadata
      );

      // Get user to check email preferences
      const user = await User.findById(userId);
      if (user && user.notificationPreferences.emailEnabled) {
        await this.sendEmailNotification({
          to: user.email,
          subject: `PNR Tracker - ${title}`,
          text: content
        });
      }
    } catch (error) {
      console.error('Failed to send system notification:', error);
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.emailTransporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<boolean> {
    return await this.sendEmailNotification({
      to,
      subject: 'PNR Tracker - Test Email',
      text: 'This is a test email from PNR Tracker. If you received this, email notifications are working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Test Email</h2>
          <p>This is a test email from PNR Tracker.</p>
          <p>If you received this, email notifications are working correctly.</p>
          <hr>
          <p style="color: #6c757d; font-size: 14px;">PNR Tracker Team</p>
        </div>
      `
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();