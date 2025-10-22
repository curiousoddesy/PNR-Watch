import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth';
import pnrRoutes from './routes/pnr';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';
import monitoringRoutes from './routes/monitoring';
import { backgroundScheduler } from './services/background-scheduler';
import { 
  errorHandler, 
  notFoundHandler, 
  setupGlobalErrorHandlers 
} from './middleware/error-handler';
import { 
  requestIdMiddleware, 
  requestLogger, 
  authFailureLogger, 
  rateLimitLogger 
} from './middleware/request-logger';
import { logger } from './services/logger';
import { errorAlerting } from './services/error-alerting';
import { metricsCollector } from './services/metrics-collector';
import { CacheService } from './services/cache';

// Load environment variables
dotenv.config();

// Setup global error handlers for uncaught exceptions
setupGlobalErrorHandlers();

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for rate limiting (if behind reverse proxy)
app.set('trust proxy', 1);

// Request tracking and logging middleware
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(authFailureLogger);
app.use(rateLimitLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pnrs', pnrRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/health', healthRoutes);

// Legacy health check endpoint for backward compatibility
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler for undefined routes
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  logger.logSystem(`Server started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  
  // Initialize cache service
  try {
    await CacheService.initialize();
    logger.logSystem('Cache service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cache service', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Cache is optional, so don't fail startup
  }
  
  // Start background scheduler
  try {
    await backgroundScheduler.start();
    logger.logSystem('Background scheduler started successfully');
  } catch (error) {
    logger.error('Failed to start background scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Send critical alert for scheduler failure
    await errorAlerting.sendCriticalAlert(
      'system_error' as any,
      'Background Scheduler Failed to Start',
      'The background scheduler could not be started, which will affect PNR status checking',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
  
  // Start metrics collection
  try {
    metricsCollector.startCollection(60000); // Collect every minute
    logger.logSystem('Metrics collection started successfully');
  } catch (error) {
    logger.error('Failed to start metrics collection', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.logSystem(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      logger.logSystem('HTTP server closed');
    });
    
    // Stop background scheduler
    await backgroundScheduler.cleanup();
    logger.logSystem('Background scheduler stopped');
    
    // Stop metrics collection
    metricsCollector.stopCollection();
    logger.logSystem('Metrics collection stopped');
    
    // Close cache service
    await CacheService.close();
    logger.logSystem('Cache service closed');
    
    logger.logSystem('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    await errorAlerting.sendCriticalAlert(
      'system_error' as any,
      'Graceful Shutdown Failed',
      'An error occurred during application shutdown',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;