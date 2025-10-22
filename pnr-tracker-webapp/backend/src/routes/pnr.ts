import express, { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { 
  validateRequest, 
  pnrAddSchema, 
  pnrIdSchema,
  batchCheckSchema,
  historyPaginationSchema
} from '../validation/pnr';
import { TrackedPNR } from '../models/TrackedPNR';
import { PNRStatusHistory } from '../models/PNRStatusHistory';
import { IRCTCScraperService } from '../services/irctc-scraper';
import { PNRValidatorService } from '../services/pnr-validator';
import { CacheService } from '../services/cache';
import { BatchProcessorService } from '../services/batch-processor';
import { ApiResponse, PaginatedResponse, PNRStatusResult } from '../types';

const router = express.Router();

/**
 * POST /api/pnrs
 * Add a new PNR to user's tracking list
 */
router.post('/',
  authenticateToken,
  validateRequest(pnrAddSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { pnr } = req.body;
      const userId = req.user.id!;

      // Validate PNR format
      if (!PNRValidatorService.validatePnr(pnr)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid PNR format. PNR must be exactly 10 digits.'
        };
        res.status(400).json(response);
        return;
      }

      // Check if PNR already exists for this user
      const existingPNR = await TrackedPNR.findByUserIdAndPNR(userId, pnr);
      if (existingPNR) {
        const response: ApiResponse = {
          success: false,
          error: 'PNR already exists in your tracking list'
        };
        res.status(409).json(response);
        return;
      }

      // Get initial status from IRCTC
      let initialStatus: PNRStatusResult;
      try {
        initialStatus = await IRCTCScraperService.performRequest(pnr);
      } catch (error) {
        // If we can't get initial status, create with basic info
        initialStatus = {
          pnr,
          from: 'Unknown',
          to: 'Unknown',
          date: 'Unknown',
          status: 'Unable to fetch status',
          isFlushed: false,
          lastUpdated: new Date(),
          error: error instanceof Error ? error.message : 'Failed to fetch initial status'
        };
      }

      // Create tracked PNR
      const trackedPNR = await TrackedPNR.create({
        userId,
        pnr,
        currentStatus: initialStatus
      });

      // Create initial status history entry
      await PNRStatusHistory.create({
        trackedPnrId: trackedPNR.id!,
        statusData: initialStatus,
        statusChanged: true
      });

      const response: ApiResponse<typeof trackedPNR> = {
        success: true,
        data: trackedPNR.toJSON(),
        message: 'PNR added successfully to tracking list'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error adding PNR:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add PNR'
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/pnrs
 * Get all tracked PNRs for the authenticated user
 */
router.get('/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id!;
      
      // Get user's tracked PNRs
      const trackedPNRs = await TrackedPNR.findByUserId(userId, true);
      
      const response: ApiResponse<typeof trackedPNRs> = {
        success: true,
        data: trackedPNRs.map(pnr => pnr.toJSON()),
        message: `Retrieved ${trackedPNRs.length} tracked PNRs`
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error retrieving PNRs:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve PNRs'
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * DELETE /api/pnrs/:id
 * Remove a PNR from user's tracking list
 */
router.delete('/:id',
  authenticateToken,
  validateRequest(pnrIdSchema, 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user.id!;

      // Find the tracked PNR
      const trackedPNR = await TrackedPNR.findById(id);
      
      if (!trackedPNR) {
        const response: ApiResponse = {
          success: false,
          error: 'PNR not found'
        };
        res.status(404).json(response);
        return;
      }

      // Ensure user owns this PNR
      if (trackedPNR.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied. You can only delete your own PNRs.'
        };
        res.status(403).json(response);
        return;
      }

      // Soft delete (deactivate) the PNR
      await trackedPNR.deactivate();

      const response: ApiResponse = {
        success: true,
        message: 'PNR removed from tracking list successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error removing PNR:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove PNR'
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/pnrs/:id/status
 * Get current status for a specific tracked PNR
 */
router.get('/:id/status',
  authenticateToken,
  validateRequest(pnrIdSchema, 'params'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user.id!;

      // Find the tracked PNR
      const trackedPNR = await TrackedPNR.findById(id);
      
      if (!trackedPNR) {
        const response: ApiResponse = {
          success: false,
          error: 'PNR not found'
        };
        res.status(404).json(response);
        return;
      }

      // Ensure user owns this PNR
      if (trackedPNR.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied. You can only check your own PNRs.'
        };
        res.status(403).json(response);
        return;
      }

      // Check cache first
      let statusResult = await CacheService.getPNRStatus(trackedPNR.pnr);
      
      if (!statusResult) {
        // Cache miss - fetch from IRCTC
        try {
          statusResult = await IRCTCScraperService.performRequest(trackedPNR.pnr);
          
          // Cache the result
          await CacheService.setPNRStatus(trackedPNR.pnr, statusResult);
          
          // Update the tracked PNR if status changed
          if (JSON.stringify(trackedPNR.currentStatus) !== JSON.stringify(statusResult)) {
            await trackedPNR.updateStatus(statusResult);
          }
        } catch (error) {
          // Return cached status from database if IRCTC fails
          statusResult = trackedPNR.currentStatus || {
            pnr: trackedPNR.pnr,
            from: 'Unknown',
            to: 'Unknown',
            date: 'Unknown',
            status: 'Error',
            isFlushed: false,
            lastUpdated: new Date(),
            error: error instanceof Error ? error.message : 'Failed to fetch current status'
          };
        }
      }

      const response: ApiResponse<PNRStatusResult> = {
        success: true,
        data: statusResult!,
        message: 'PNR status retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting PNR status:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get PNR status'
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/pnrs/check-all
 * Check status for all or specified tracked PNRs
 */
router.post('/check-all',
  authenticateToken,
  validateRequest(batchCheckSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { pnrIds } = req.body;
      const userId = req.user.id!;

      // Get user's tracked PNRs
      let trackedPNRs: any[];
      
      if (pnrIds && pnrIds.length > 0) {
        // Check specific PNRs
        trackedPNRs = [];
        for (const pnrId of pnrIds) {
          const trackedPNR = await TrackedPNR.findById(pnrId);
          if (trackedPNR && trackedPNR.userId === userId) {
            trackedPNRs.push(trackedPNR);
          }
        }
      } else {
        // Check all user's PNRs
        trackedPNRs = await TrackedPNR.findByUserId(userId, true);
      }

      if (trackedPNRs.length === 0) {
        const response: ApiResponse<PNRStatusResult[]> = {
          success: true,
          data: [],
          message: 'No PNRs found to check'
        };
        res.status(200).json(response);
        return;
      }

      // Check cache for batch result (only for all PNRs, not specific ones)
      let results: PNRStatusResult[] = [];
      
      if (!pnrIds || pnrIds.length === 0) {
        const cachedResults = await CacheService.getBatchCheckResult(userId);
        if (cachedResults && cachedResults.length === trackedPNRs.length) {
          const response: ApiResponse<PNRStatusResult[]> = {
            success: true,
            data: cachedResults,
            message: `Retrieved ${cachedResults.length} cached PNR statuses`
          };
          res.status(200).json(response);
          return;
        }
      }

      // Cache miss or specific PNRs - fetch from IRCTC
      const pnrNumbers = trackedPNRs.map(tracked => tracked.pnr);
      
      try {
        // Use batch processor for rate limiting and error handling
        const batchResult = await BatchProcessorService.processBatch(
          pnrNumbers,
          {
            requestDelay: 1000, // 1 second between requests
            maxRetries: 2,
            retryDelay: 2000
          }
        );

        results = batchResult.results;

        // Update tracked PNRs with new statuses
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const trackedPNR = trackedPNRs.find(p => p.pnr === result.pnr);
          
          if (trackedPNR) {
            try {
              // Cache individual result
              await CacheService.setPNRStatus(result.pnr, result);
              
              // Update database if status changed
              if (JSON.stringify(trackedPNR.currentStatus) !== JSON.stringify(result)) {
                await trackedPNR.updateStatus(result);
              }
            } catch (updateError) {
              console.error(`Failed to update status for PNR ${result.pnr}:`, updateError);
            }
          }
        }

        // Cache batch result (only for all PNRs)
        if (!pnrIds || pnrIds.length === 0) {
          await CacheService.setBatchCheckResult(userId, results);
        }

        // Log flushed PNRs for user attention
        if (batchResult.flushedPNRs.length > 0) {
          console.log(`Found ${batchResult.flushedPNRs.length} flushed PNRs for user ${userId}:`, batchResult.flushedPNRs);
        }

      } catch (error) {
        // If batch processing fails, return current statuses from database
        results = trackedPNRs.map(tracked => ({
          ...tracked.currentStatus,
          error: error instanceof Error ? error.message : 'Failed to fetch current status'
        }));
      }

      const response: ApiResponse<PNRStatusResult[]> = {
        success: true,
        data: results,
        message: `Checked ${results.length} PNR statuses`
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error checking PNR statuses:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check PNR statuses'
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/pnrs/:id/history
 * Get status change history for a specific tracked PNR with pagination
 */
router.get('/:id/history',
  authenticateToken,
  validateRequest(pnrIdSchema, 'params'),
  validateRequest(historyPaginationSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      const userId = req.user.id!;

      // Find the tracked PNR
      const trackedPNR = await TrackedPNR.findById(id);
      
      if (!trackedPNR) {
        const response: ApiResponse = {
          success: false,
          error: 'PNR not found'
        };
        res.status(404).json(response);
        return;
      }

      // Ensure user owns this PNR
      if (trackedPNR.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied. You can only view history for your own PNRs.'
        };
        res.status(403).json(response);
        return;
      }

      // Calculate pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Get total count for pagination
      const totalCount = await PNRStatusHistory.countByTrackedPNRId(id);
      const totalPages = Math.ceil(totalCount / limitNum);

      // Get paginated history
      const history = await PNRStatusHistory.findByTrackedPNRId(id, limitNum, offset);

      const response: PaginatedResponse<any> = {
        success: true,
        data: history.map(h => h.toJSON()),
        message: `Retrieved ${history.length} history entries for PNR ${trackedPNR.pnr}`,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error retrieving PNR history:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve PNR history'
      };
      
      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/pnrs/export/history
 * Export user's complete PNR history data
 */
router.get('/export/history',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id!;
      const format = req.query.format as string || 'json';

      // Get all user's tracked PNRs (including inactive ones for complete history)
      const trackedPNRs = await TrackedPNR.findByUserId(userId, false);
      
      if (trackedPNRs.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No PNR history found to export'
        };
        res.status(404).json(response);
        return;
      }

      // Get complete history for all user's PNRs
      const completeHistory = await PNRStatusHistory.getHistoryForUser(userId);

      // Organize data by PNR for better structure
      const exportData = trackedPNRs.map(pnr => {
        const pnrHistory = completeHistory.filter(h => h.trackedPnrId === pnr.id);
        
        return {
          pnr: pnr.toJSON(),
          history: pnrHistory.map(h => h.toJSON()),
          totalHistoryEntries: pnrHistory.length,
          statusChanges: pnrHistory.filter(h => h.statusChanged).length
        };
      });

      const exportMetadata = {
        exportedAt: new Date().toISOString(),
        userId,
        totalPNRs: trackedPNRs.length,
        totalHistoryEntries: completeHistory.length,
        format
      };

      if (format === 'csv') {
        // Generate CSV format
        let csvContent = 'PNR,From,To,Date,Status,Checked At,Status Changed,Is Active\n';
        
        exportData.forEach(pnrData => {
          pnrData.history.forEach(historyEntry => {
            const statusData = historyEntry.statusData;
            csvContent += `"${pnrData.pnr.pnr}","${statusData.from}","${statusData.to}","${statusData.date}","${statusData.status}","${historyEntry.checkedAt}","${historyEntry.statusChanged}","${pnrData.pnr.isActive}"\n`;
          });
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pnr-history-${userId}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csvContent);
      } else {
        // Default JSON format
        const jsonExport = {
          metadata: exportMetadata,
          data: exportData
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="pnr-history-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
        res.status(200).json(jsonExport);
      }
    } catch (error) {
      console.error('Error exporting PNR history:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export PNR history'
      };
      
      res.status(500).json(response);
    }
  }
);

export default router;