/**
 * Health Check Routes
 * Provides endpoints for system health monitoring
 */

import express, { Request, Response } from 'express';
import { healthMonitor } from '../services/health-monitor';
import { metricsCollector } from '../services/metrics-collector';
import { logger } from '../services/logger';
import { asyncHandler } from '../middleware/error-handler';
import { ApiResponse } from '../types';

const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const health = await healthMonitor.performHealthCheck();
  
  // Return appropriate HTTP status based on health
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  const response: ApiResponse = {
    success: health.status !== 'unhealthy',
    data: health,
    message: `System is ${health.status}`
  };
  
  res.status(statusCode).json(response);
}));

/**
 * GET /health/detailed
 * Detailed health check with all components
 */
router.get('/detailed', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const health = await healthMonitor.performHealthCheck();
  const metrics = healthMonitor.getSystemMetrics();
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  const response: ApiResponse = {
    success: health.status !== 'unhealthy',
    data: {
      ...health,
      metrics
    },
    message: `Detailed system health: ${health.status}`
  };
  
  res.status(statusCode).json(response);
}));

/**
 * GET /health/ready
 * Readiness probe for container orchestration
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const health = await healthMonitor.performHealthCheck();
  
  // System is ready if it's healthy or degraded (but not unhealthy)
  const isReady = health.status !== 'unhealthy';
  
  if (isReady) {
    res.status(200).json({
      success: true,
      message: 'System is ready',
      status: health.status
    });
  } else {
    res.status(503).json({
      success: false,
      message: 'System is not ready',
      status: health.status
    });
  }
}));

/**
 * GET /health/live
 * Liveness probe for container orchestration
 */
router.get('/live', (req: Request, res: Response): void => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    success: true,
    message: 'System is alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /health/metrics
 * System metrics endpoint
 */
router.get('/metrics', (req: Request, res: Response): void => {
  const basicMetrics = healthMonitor.getSystemMetrics();
  const currentMetrics = metricsCollector.getCurrentMetrics();
  const aggregated = metricsCollector.getAggregatedMetrics(60); // Last hour
  
  res.status(200).json({
    success: true,
    data: {
      basic: basicMetrics,
      current: currentMetrics,
      aggregated,
      thresholds: metricsCollector.getThresholds()
    },
    message: 'System metrics retrieved'
  });
});

/**
 * GET /health/metrics/history
 * Historical metrics endpoint
 */
router.get('/metrics/history', (req: Request, res: Response): void => {
  const limit = parseInt(req.query.limit as string) || 60;
  const history = metricsCollector.getMetricsHistory(limit);
  
  res.status(200).json({
    success: true,
    data: history,
    message: `Retrieved ${history.length} historical metrics`
  });
});

/**
 * GET /health/metrics/aggregated
 * Aggregated metrics for different time periods
 */
router.get('/metrics/aggregated', (req: Request, res: Response): void => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const aggregated = metricsCollector.getAggregatedMetrics(minutes);
  
  res.status(200).json({
    success: true,
    data: aggregated,
    message: `Aggregated metrics for last ${minutes} minutes`
  });
});

/**
 * GET /health/database
 * Database-specific health check
 */
router.get('/database', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const health = await healthMonitor.performHealthCheck();
  const dbHealth = health.checks.database;
  
  const statusCode = dbHealth.status === 'healthy' ? 200 : 
                    dbHealth.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: dbHealth.status !== 'unhealthy',
    data: dbHealth,
    message: `Database is ${dbHealth.status}`
  });
}));

/**
 * GET /health/external
 * External services health check
 */
router.get('/external', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const health = await healthMonitor.performHealthCheck();
  const externalHealth = health.checks.externalServices;
  
  const statusCode = externalHealth.status === 'healthy' ? 200 : 
                    externalHealth.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: externalHealth.status !== 'unhealthy',
    data: externalHealth,
    message: `External services are ${externalHealth.status}`
  });
}));

export default router;