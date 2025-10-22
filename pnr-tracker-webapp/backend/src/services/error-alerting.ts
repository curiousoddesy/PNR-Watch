/**
 * Error Alerting Service
 * Handles critical error notifications and alerting for system administrators
 */

import { logger } from './logger';
import { NotificationService } from './notification';

export interface AlertConfig {
  enabled: boolean;
  adminEmails: string[];
  webhookUrl?: string;
  slackWebhookUrl?: string;
  alertThresholds: {
    errorRate: number; // errors per minute
    responseTime: number; // milliseconds
    memoryUsage: number; // percentage
    failedHealthChecks: number;
  };
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  HIGH_ERROR_RATE = 'high_error_rate',
  SLOW_RESPONSE = 'slow_response',
  HIGH_MEMORY = 'high_memory',
  DATABASE_ERROR = 'database_error',
  EXTERNAL_SERVICE_DOWN = 'external_service_down',
  SECURITY_INCIDENT = 'security_incident',
  HEALTH_CHECK_FAILED = 'health_check_failed'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class ErrorAlertingService {
  private static instance: ErrorAlertingService;
  private config: AlertConfig;
  private errorCounts: Map<string, number> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private notificationService: NotificationService;

  private constructor() {
    this.config = this.loadConfig();
    this.notificationService = new NotificationService();
    this.startErrorRateMonitoring();
  }

  public static getInstance(): ErrorAlertingService {
    if (!ErrorAlertingService.instance) {
      ErrorAlertingService.instance = new ErrorAlertingService();
    }
    return ErrorAlertingService.instance;
  }

  private loadConfig(): AlertConfig {
    return {
      enabled: process.env.ALERTS_ENABLED === 'true',
      adminEmails: (process.env.ADMIN_EMAILS || '').split(',').filter(email => email.trim()),
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      alertThresholds: {
        errorRate: parseInt(process.env.ERROR_RATE_THRESHOLD || '10'),
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000'),
        memoryUsage: parseInt(process.env.MEMORY_USAGE_THRESHOLD || '85'),
        failedHealthChecks: parseInt(process.env.FAILED_HEALTH_CHECKS_THRESHOLD || '3')
      }
    };
  }

  /**
   * Send critical error alert
   */
  public async sendCriticalAlert(
    type: AlertType,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity: AlertSeverity.CRITICAL,
      title,
      message,
      timestamp: new Date(),
      metadata
    };

    await this.processAlert(alert);
  }

  /**
   * Send high severity alert
   */
  public async sendHighAlert(
    type: AlertType,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity: AlertSeverity.HIGH,
      title,
      message,
      timestamp: new Date(),
      metadata
    };

    await this.processAlert(alert);
  }

  /**
   * Send medium severity alert
   */
  public async sendMediumAlert(
    type: AlertType,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity: AlertSeverity.MEDIUM,
      title,
      message,
      timestamp: new Date(),
      metadata
    };

    await this.processAlert(alert);
  }

  /**
   * Process and send alert through configured channels
   */
  private async processAlert(alert: Alert): Promise<void> {
    try {
      // Store alert
      this.activeAlerts.set(alert.id, alert);

      // Log alert
      logger.error(`ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, {
        alertId: alert.id,
        type: alert.type,
        message: alert.message,
        metadata: alert.metadata
      });

      // Send notifications based on severity
      const promises: Promise<void>[] = [];

      if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
        // Send email to admins
        if (this.config.adminEmails.length > 0) {
          promises.push(this.sendEmailAlert(alert));
        }

        // Send Slack notification
        if (this.config.slackWebhookUrl) {
          promises.push(this.sendSlackAlert(alert));
        }

        // Send webhook notification
        if (this.config.webhookUrl) {
          promises.push(this.sendWebhookAlert(alert));
        }
      }

      await Promise.allSettled(promises);

    } catch (error) {
      logger.error('Failed to process alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send email alert to administrators
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    try {
      const subject = `[PNR Tracker] ${alert.severity.toUpperCase()} Alert: ${alert.title}`;
      const content = this.formatEmailAlert(alert);

      for (const email of this.config.adminEmails) {
        await this.notificationService.sendEmail({
          to: email,
          subject,
          text: content,
          html: content
        });
      }

      logger.info('Email alert sent to administrators', {
        alertId: alert.id,
        recipients: this.config.adminEmails.length
      });
    } catch (error) {
      logger.error('Failed to send email alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      return;
    }

    try {
      const payload = {
        text: `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.title}`,
        attachments: [
          {
            color: this.getSlackColor(alert.severity),
            fields: [
              {
                title: 'Message',
                value: alert.message,
                short: false
              },
              {
                title: 'Type',
                value: alert.type,
                short: true
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: true
              }
            ]
          }
        ]
      };

      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}`);
      }

      logger.info('Slack alert sent', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    if (!this.config.webhookUrl) {
      return;
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      logger.info('Webhook alert sent', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Monitor error rates and trigger alerts
   */
  private startErrorRateMonitoring(): void {
    setInterval(() => {
      this.checkErrorRates();
      this.cleanupOldErrorCounts();
    }, 60000); // Check every minute
  }

  /**
   * Check if error rate exceeds threshold
   */
  private checkErrorRates(): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const errorCount = this.errorCounts.get(currentMinute.toString()) || 0;

    if (errorCount >= this.config.alertThresholds.errorRate) {
      this.sendHighAlert(
        AlertType.HIGH_ERROR_RATE,
        'High Error Rate Detected',
        `Error rate of ${errorCount} errors per minute exceeds threshold of ${this.config.alertThresholds.errorRate}`,
        { errorCount, threshold: this.config.alertThresholds.errorRate }
      );
    }
  }

  /**
   * Record error for rate monitoring
   */
  public recordError(): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const key = currentMinute.toString();
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
  }

  /**
   * Clean up old error counts (keep last 5 minutes)
   */
  private cleanupOldErrorCounts(): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const cutoff = currentMinute - 5;

    for (const [key] of this.errorCounts) {
      if (parseInt(key) < cutoff) {
        this.errorCounts.delete(key);
      }
    }
  }

  /**
   * Format email alert content
   */
  private formatEmailAlert(alert: Alert): string {
    return `
      <h2>🚨 ${alert.severity.toUpperCase()} Alert</h2>
      <h3>${alert.title}</h3>
      
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
      
      ${alert.metadata ? `
        <h4>Additional Details:</h4>
        <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
      ` : ''}
      
      <hr>
      <p><em>This is an automated alert from PNR Tracker System</em></p>
    `;
  }

  /**
   * Get Slack color based on severity
   */
  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'danger';
      case AlertSeverity.HIGH:
        return 'warning';
      case AlertSeverity.MEDIUM:
        return '#ff9900';
      case AlertSeverity.LOW:
        return 'good';
      default:
        return '#cccccc';
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Alert resolved', {
        alertId,
        type: alert.type,
        duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
      });
    }
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Alert configuration updated', { config: this.config });
  }
}

export const errorAlerting = ErrorAlertingService.getInstance();