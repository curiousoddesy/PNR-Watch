/**
 * System Monitoring Routes
 * Administrative endpoints for system monitoring and management
 */

import express, { Request, Response } from 'express';
import { healthMonitor } from '../services/health-monitor';
import { metricsCollector } from '../services/metrics-collector';
import { errorAlerting } from '../services/error-alerting';
import { logger } from '../services/logger';
import { asyncHandler } from '../middleware/error-handler';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = express.Router();

// All monitoring routes require authentication
router.use(authenticateToken);

/**
 * GET /monitoring/dashboard
 * Complete monitoring dashboard data
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const health = await healthMonitor.performHealthCheck();
  const currentMetrics = metricsCollector.getCurrentMetrics();
  const aggregated1h = metricsCollector.getAggregatedMetrics(60);
  const aggregated24h = metricsCollector.getAggregatedMetrics(1440);
  const activeAlerts = errorAlerting.getActiveAlerts();
  const thresholds = metricsCollector.getThresholds();

  const response: ApiResponse = {
    success: true,
    data: {
      health,
      metrics: {
        current: currentMetrics,
        aggregated: {
          lastHour: aggregated1h,
          last24Hours: aggregated24h
        },
        thresholds
      },
      alerts: {
        active: activeAlerts,
        count: activeAlerts.length
      },
      timestamp: new Date().toISOString()
    },
    message: 'Monitoring dashboard data retrieved'
  };

  res.status(200).json(response);
}));

/**
 * GET /monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', (req: Request, res: Response): void => {
  const activeAlerts = errorAlerting.getActiveAlerts();
  
  res.status(200).json({
    success: true,
    data: activeAlerts,
    message: `Retrieved ${activeAlerts.length} active alerts`
  });
});

/**
 * POST /monitoring/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/alerts/:alertId/resolve', (req: Request, res: Response): void => {
  const { alertId } = req.params;
  
  errorAlerting.resolveAlert(alertId);
  
  logger.logSystem('Alert resolved by admin', {
    alertId,
    adminUserId: (req as any).user?.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Alert resolved successfully'
  });
});

/**
 * GET /monitoring/logs
 * Get recent log entries (simplified - in production you'd want proper log aggregation)
 */
router.get('/logs', (req: Request, res: Response): void => {
  const level = req.query.level as string || 'info';
  const limit = parseInt(req.query.limit as string) || 100;
  
  // This is a simplified implementation
  // In production, you'd want to use a proper log aggregation service
  res.status(200).json({
    success: true,
    data: {
      message: 'Log retrieval not implemented in this version',
      suggestion: 'Use log files directly or implement log aggregation service'
    },
    message: 'Log endpoint accessed'
  });
});

/**
 * GET /monitoring/performance
 * Get performance metrics over time
 */
router.get('/performance', (req: Request, res: Response): void => {
  const hours = parseInt(req.query.hours as string) || 1;
  const minutes = hours * 60;
  
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);
  
  const metricsInRange = metricsCollector.getMetricsInRange(startTime, endTime);
  
  // Process metrics for charting
  const performanceData = metricsInRange.map(metric => ({
    timestamp: metric.timestamp,
    memoryUsage: metric.memory.usagePercent,
    responseTime: metric.requests.averageResponseTime,
    requestCount: metric.requests.total,
    errorCount: metric.requests.errors,
    uptime: metric.process.uptime
  }));
  
  res.status(200).json({
    success: true,
    data: {
      timeRange: { startTime, endTime },
      metrics: performanceData,
      summary: metricsCollector.getAggregatedMetrics(minutes)
    },
    message: `Performance data for last ${hours} hour(s)`
  });
});

/**
 * PUT /monitoring/thresholds
 * Update monitoring thresholds
 */
router.put('/thresholds', (req: Request, res: Response): void => {
  const { memoryUsagePercent, cpuUsagePercent, averageResponseTime, errorRate } = req.body;
  
  const updates: any = {};
  if (memoryUsagePercent !== undefined) updates.memoryUsagePercent = memoryUsagePercent;
  if (cpuUsagePercent !== undefined) updates.cpuUsagePercent = cpuUsagePercent;
  if (averageResponseTime !== undefined) updates.averageResponseTime = averageResponseTime;
  if (errorRate !== undefined) updates.errorRate = errorRate;
  
  metricsCollector.updateThresholds(updates);
  
  logger.logSystem('Monitoring thresholds updated by admin', {
    updates,
    adminUserId: (req as any).user?.id
  });
  
  res.status(200).json({
    success: true,
    data: metricsCollector.getThresholds(),
    message: 'Thresholds updated successfully'
  });
});

/**
 * POST /monitoring/test-alert
 * Send a test alert (for testing alert systems)
 */
router.post('/test-alert', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { severity = 'medium', message = 'Test alert from monitoring system' } = req.body;
  
  logger.logSystem('Test alert triggered by admin', {
    severity,
    message,
    adminUserId: (req as any).user?.id
  });
  
  // Send test alert based on severity
  switch (severity) {
    case 'critical':
      await errorAlerting.sendCriticalAlert(
        'system_error' as any,
        'Test Critical Alert',
        message,
        { triggeredBy: (req as any).user?.id, timestamp: new Date() }
      );
      break;
    case 'high':
      await errorAlerting.sendHighAlert(
        'system_error' as any,
        'Test High Alert',
        message,
        { triggeredBy: (req as any).user?.id, timestamp: new Date() }
      );
      break;
    default:
      await errorAlerting.sendMediumAlert(
        'system_error' as any,
        'Test Medium Alert',
        message,
        { triggeredBy: (req as any).user?.id, timestamp: new Date() }
      );
  }
  
  res.status(200).json({
    success: true,
    message: `Test ${severity} alert sent successfully`
  });
}));

/**
 * GET /monitoring/system-info
 * Get detailed system information
 */
router.get('/system-info', (req: Request, res: Response): void => {
  const systemInfo = {
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      pid: process.pid
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    application: {
      version: process.env.npm_package_version || '1.0.0',
      startTime: new Date(Date.now() - process.uptime() * 1000)
    }
  };
  
  res.status(200).json({
    success: true,
    data: systemInfo,
    message: 'System information retrieved'
  });
});

/**
 * DELETE /monitoring/metrics/history
 * Clear metrics history (admin only)
 */
router.delete('/metrics/history', (req: Request, res: Response): void => {
  metricsCollector.clearHistory();
  
  logger.logSystem('Metrics history cleared by admin', {
    adminUserId: (req as any).user?.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Metrics history cleared successfully'
  });
});

export default router;