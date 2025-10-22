import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { backgroundScheduler } from '../services/background-scheduler';
import { ApiResponse } from '../types';

const router = express.Router();

// Simple admin middleware (in production, this should be more robust)
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // For now, just check if user email is in admin list
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  
  if (!adminEmails.includes(req.user?.email || '')) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    } as ApiResponse);
  }
  
  next();
};

/**
 * GET /api/admin/scheduler/status
 * Get background scheduler status
 */
router.get('/scheduler/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = backgroundScheduler.getStats();
    const config = backgroundScheduler.getConfig();
    const queueStats = await backgroundScheduler.getNotificationQueueStats();
    const archiverConfig = backgroundScheduler.getArchiverConfig();

    res.json({
      success: true,
      data: {
        scheduler: stats,
        config,
        notificationQueue: queueStats,
        archiver: {
          config: archiverConfig,
          lastStats: stats.lastArchivingStats
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch scheduler status'
    } as ApiResponse);
  }
});

/**
 * POST /api/admin/scheduler/trigger
 * Manually trigger a status check
 */
router.post('/scheduler/trigger', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (backgroundScheduler.isCheckInProgress()) {
      return res.status(409).json({
        success: false,
        error: 'Status check already in progress'
      } as ApiResponse);
    }

    // Trigger manual check (don't wait for completion)
    backgroundScheduler.triggerManualCheck().catch(error => {
      console.error('Manual status check failed:', error);
    });

    res.json({
      success: true,
      message: 'Manual status check triggered'
    } as ApiResponse);

  } catch (error) {
    console.error('Error triggering manual status check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to trigger status check'
    } as ApiResponse);
  }
});

/**
 * PUT /api/admin/scheduler/config
 * Update scheduler configuration
 */
router.put('/scheduler/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { enabled, cronExpression, batchSize, requestDelay, maxRetries, archivingEnabled } = req.body;

    const updates: any = {};
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (cronExpression) updates.cronExpression = String(cronExpression);
    if (batchSize !== undefined) updates.batchSize = parseInt(batchSize);
    if (requestDelay !== undefined) updates.requestDelay = parseInt(requestDelay);
    if (maxRetries !== undefined) updates.maxRetries = parseInt(maxRetries);
    if (archivingEnabled !== undefined) updates.archivingEnabled = Boolean(archivingEnabled);

    backgroundScheduler.updateConfig(updates);

    res.json({
      success: true,
      data: backgroundScheduler.getConfig(),
      message: 'Scheduler configuration updated'
    } as ApiResponse);

  } catch (error) {
    console.error('Error updating scheduler config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update scheduler configuration'
    } as ApiResponse);
  }
});

/**
 * POST /api/admin/archiver/trigger
 * Manually trigger PNR archiving
 */
router.post('/archiver/trigger', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await backgroundScheduler.triggerManualArchiving();

    res.json({
      success: true,
      data: stats,
      message: 'PNR archiving completed'
    } as ApiResponse);

  } catch (error) {
    console.error('Error triggering PNR archiving:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to trigger PNR archiving'
    } as ApiResponse);
  }
});

/**
 * GET /api/admin/archiver/eligible
 * Get PNRs eligible for archiving (preview)
 */
router.get('/archiver/eligible', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const eligiblePNRs = await backgroundScheduler.getEligiblePNRsForArchiving();

    res.json({
      success: true,
      data: {
        eligiblePNRs,
        count: eligiblePNRs.length
      },
      message: `Found ${eligiblePNRs.length} PNRs eligible for archiving`
    } as ApiResponse);

  } catch (error) {
    console.error('Error getting eligible PNRs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get eligible PNRs for archiving'
    } as ApiResponse);
  }
});

/**
 * PUT /api/admin/archiver/config
 * Update archiver configuration
 */
router.put('/archiver/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { enabled, daysAfterTravel, batchSize } = req.body;

    const updates: any = {};
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (daysAfterTravel !== undefined) updates.daysAfterTravel = parseInt(daysAfterTravel);
    if (batchSize !== undefined) updates.batchSize = parseInt(batchSize);

    backgroundScheduler.updateArchiverConfig(updates);

    res.json({
      success: true,
      data: backgroundScheduler.getArchiverConfig(),
      message: 'Archiver configuration updated'
    } as ApiResponse);

  } catch (error) {
    console.error('Error updating archiver config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update archiver configuration'
    } as ApiResponse);
  }
});

/**
 * GET /api/admin/archiver/config
 * Get archiver configuration
 */
router.get('/archiver/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = backgroundScheduler.getArchiverConfig();

    res.json({
      success: true,
      data: config
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching archiver config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch archiver configuration'
    } as ApiResponse);
  }
});

export default router;