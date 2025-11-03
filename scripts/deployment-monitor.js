#!/usr/bin/env node

/**
 * Netlify Deployment Monitor
 * 
 * This script monitors Netlify deployments and provides status validation,
 * failure notification handling, and deployment logging.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class DeploymentMonitor {
  constructor(config = {}) {
    this.config = {
      siteId: process.env.NETLIFY_SITE_ID,
      authToken: process.env.NETLIFY_AUTH_TOKEN,
      apiBase: 'https://api.netlify.com/api/v1',
      logFile: path.join(process.cwd(), 'deployment-logs.json'),
      retryAttempts: 3,
      retryDelay: 5000,
      ...config
    };
    
    this.logs = this.loadLogs();
  }

  /**
   * Load existing deployment logs
   */
  loadLogs() {
    try {
      if (fs.existsSync(this.config.logFile)) {
        const data = fs.readFileSync(this.config.logFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load existing logs:', error.message);
    }
    
    return {
      deployments: [],
      lastUpdated: null
    };
  }

  /**
   * Save deployment logs to file
   */
  saveLogs() {
    try {
      this.logs.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.config.logFile, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Failed to save logs:', error.message);
    }
  }

  /**
   * Make authenticated API request to Netlify
   */
  async makeApiRequest(endpoint, options = {}) {
    const url = `${this.config.apiBase}${endpoint}`;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get current deployment status
   */
  async getCurrentDeployment() {
    try {
      const site = await this.makeApiRequest(`/sites/${this.config.siteId}`);
      const deployId = site.published_deploy?.id;
      
      if (!deployId) {
        throw new Error('No published deployment found');
      }
      
      const deployment = await this.makeApiRequest(`/deploys/${deployId}`);
      return deployment;
    } catch (error) {
      console.error('Failed to get current deployment:', error.message);
      throw error;
    }
  }

  /**
   * Get recent deployments
   */
  async getRecentDeployments(limit = 10) {
    try {
      const deployments = await this.makeApiRequest(
        `/sites/${this.config.siteId}/deploys?per_page=${limit}`
      );
      return deployments;
    } catch (error) {
      console.error('Failed to get recent deployments:', error.message);
      throw error;
    }
  }

  /**
   * Validate deployment status
   */
  async validateDeployment(deploymentId = null) {
    try {
      const deployment = deploymentId 
        ? await this.makeApiRequest(`/deploys/${deploymentId}`)
        : await this.getCurrentDeployment();

      const validation = {
        id: deployment.id,
        state: deployment.state,
        url: deployment.deploy_ssl_url || deployment.deploy_url,
        createdAt: deployment.created_at,
        publishedAt: deployment.published_at,
        buildTime: null,
        isValid: false,
        errors: [],
        warnings: []
      };

      // Calculate build time
      if (deployment.created_at && deployment.published_at) {
        const created = new Date(deployment.created_at);
        const published = new Date(deployment.published_at);
        validation.buildTime = Math.round((published - created) / 1000);
      }

      // Validate deployment state
      switch (deployment.state) {
        case 'ready':
          validation.isValid = true;
          break;
        case 'building':
          validation.warnings.push('Deployment is still building');
          break;
        case 'error':
          validation.errors.push(`Deployment failed: ${deployment.error_message || 'Unknown error'}`);
          break;
        case 'cancelled':
          validation.errors.push('Deployment was cancelled');
          break;
        default:
          validation.warnings.push(`Unknown deployment state: ${deployment.state}`);
      }

      // Test deployment URL if ready
      if (validation.isValid && validation.url) {
        try {
          const response = await fetch(validation.url, { method: 'HEAD' });
          if (!response.ok) {
            validation.errors.push(`Deployment URL returned ${response.status}`);
            validation.isValid = false;
          }
        } catch (error) {
          validation.errors.push(`Failed to access deployment URL: ${error.message}`);
          validation.isValid = false;
        }
      }

      // Log validation result
      this.logDeployment(validation);

      return validation;
    } catch (error) {
      console.error('Deployment validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Monitor deployment progress
   */
  async monitorDeployment(deploymentId, options = {}) {
    const {
      timeout = 600000, // 10 minutes
      interval = 10000,  // 10 seconds
      onProgress = null,
      onComplete = null,
      onError = null
    } = options;

    const startTime = Date.now();
    let lastState = null;

    const checkProgress = async () => {
      try {
        const deployment = await this.makeApiRequest(`/deploys/${deploymentId}`);
        
        if (deployment.state !== lastState) {
          lastState = deployment.state;
          
          const progress = {
            id: deploymentId,
            state: deployment.state,
            progress: this.calculateProgress(deployment),
            message: this.getStateMessage(deployment.state),
            timestamp: new Date().toISOString()
          };

          if (onProgress) {
            onProgress(progress);
          }

          console.log(`[${progress.timestamp}] Deployment ${deploymentId}: ${progress.message}`);
        }

        // Check if deployment is complete
        if (['ready', 'error', 'cancelled'].includes(deployment.state)) {
          const validation = await this.validateDeployment(deploymentId);
          
          if (deployment.state === 'ready' && validation.isValid) {
            if (onComplete) {
              onComplete(validation);
            }
            return validation;
          } else {
            const error = new Error(`Deployment failed with state: ${deployment.state}`);
            if (onError) {
              onError(error, validation);
            }
            throw error;
          }
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          throw new Error('Deployment monitoring timeout');
        }

        // Continue monitoring
        setTimeout(checkProgress, interval);
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    };

    return checkProgress();
  }

  /**
   * Calculate deployment progress percentage
   */
  calculateProgress(deployment) {
    const stateProgress = {
      'new': 0,
      'building': 25,
      'processing': 50,
      'uploading': 75,
      'ready': 100,
      'error': 0,
      'cancelled': 0
    };

    return stateProgress[deployment.state] || 0;
  }

  /**
   * Get human-readable state message
   */
  getStateMessage(state) {
    const messages = {
      'new': 'Deployment queued',
      'building': 'Building application',
      'processing': 'Processing build artifacts',
      'uploading': 'Uploading to CDN',
      'ready': 'Deployment successful',
      'error': 'Deployment failed',
      'cancelled': 'Deployment cancelled'
    };

    return messages[state] || `Unknown state: ${state}`;
  }

  /**
   * Log deployment information
   */
  logDeployment(deployment) {
    const logEntry = {
      ...deployment,
      timestamp: new Date().toISOString()
    };

    this.logs.deployments.unshift(logEntry);
    
    // Keep only last 50 deployments
    if (this.logs.deployments.length > 50) {
      this.logs.deployments = this.logs.deployments.slice(0, 50);
    }

    this.saveLogs();
  }

  /**
   * Send notification for deployment events
   */
  async sendNotification(type, deployment, options = {}) {
    const notification = {
      type,
      deployment: {
        id: deployment.id,
        state: deployment.state,
        url: deployment.url,
        buildTime: deployment.buildTime
      },
      timestamp: new Date().toISOString(),
      ...options
    };

    // Console notification
    console.log(`📢 Notification [${type}]:`, notification);

    // Webhook notification (if configured)
    if (process.env.DEPLOYMENT_WEBHOOK_URL) {
      try {
        await fetch(process.env.DEPLOYMENT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error.message);
      }
    }

    // GitHub status update (if in CI environment)
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_SHA) {
      await this.updateGitHubStatus(type, deployment);
    }

    return notification;
  }

  /**
   * Update GitHub commit status
   */
  async updateGitHubStatus(type, deployment) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) {
      return;
    }

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const sha = process.env.GITHUB_SHA;

    const statusMap = {
      'building': { state: 'pending', description: 'Deployment in progress' },
      'success': { state: 'success', description: 'Deployment successful' },
      'failure': { state: 'failure', description: 'Deployment failed' },
      'error': { state: 'error', description: 'Deployment error' }
    };

    const status = statusMap[type] || statusMap['error'];

    try {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: status.state,
          description: status.description,
          context: 'netlify/deployment',
          target_url: deployment.url
        })
      });
    } catch (error) {
      console.error('Failed to update GitHub status:', error.message);
    }
  }

  /**
   * Get deployment statistics
   */
  getDeploymentStats() {
    const deployments = this.logs.deployments;
    
    if (deployments.length === 0) {
      return null;
    }

    const stats = {
      total: deployments.length,
      successful: deployments.filter(d => d.isValid).length,
      failed: deployments.filter(d => d.errors.length > 0).length,
      averageBuildTime: 0,
      lastDeployment: deployments[0],
      successRate: 0
    };

    // Calculate average build time
    const buildsWithTime = deployments.filter(d => d.buildTime);
    if (buildsWithTime.length > 0) {
      stats.averageBuildTime = Math.round(
        buildsWithTime.reduce((sum, d) => sum + d.buildTime, 0) / buildsWithTime.length
      );
    }

    // Calculate success rate
    stats.successRate = Math.round((stats.successful / stats.total) * 100);

    return stats;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const monitor = new DeploymentMonitor();

  async function main() {
    try {
      switch (command) {
        case 'validate':
          const deploymentId = process.argv[3];
          const validation = await monitor.validateDeployment(deploymentId);
          console.log('Validation result:', JSON.stringify(validation, null, 2));
          process.exit(validation.isValid ? 0 : 1);
          break;

        case 'monitor':
          const monitorId = process.argv[3];
          if (!monitorId) {
            console.error('Deployment ID required for monitoring');
            process.exit(1);
          }
          
          await monitor.monitorDeployment(monitorId, {
            onProgress: (progress) => console.log('Progress:', progress),
            onComplete: (result) => {
              console.log('✅ Deployment completed successfully');
              monitor.sendNotification('success', result);
            },
            onError: (error, result) => {
              console.error('❌ Deployment failed:', error.message);
              monitor.sendNotification('failure', result || { id: monitorId });
            }
          });
          break;

        case 'status':
          const current = await monitor.getCurrentDeployment();
          console.log('Current deployment:', JSON.stringify(current, null, 2));
          break;

        case 'stats':
          const stats = monitor.getDeploymentStats();
          console.log('Deployment statistics:', JSON.stringify(stats, null, 2));
          break;

        case 'recent':
          const limit = parseInt(process.argv[3]) || 10;
          const recent = await monitor.getRecentDeployments(limit);
          console.log(`Recent ${limit} deployments:`, JSON.stringify(recent, null, 2));
          break;

        default:
          console.log(`
Usage: node deployment-monitor.js <command> [options]

Commands:
  validate [deployment-id]  - Validate deployment (current if no ID provided)
  monitor <deployment-id>   - Monitor deployment progress
  status                    - Get current deployment status
  stats                     - Show deployment statistics
  recent [limit]           - Show recent deployments (default: 10)

Environment Variables:
  NETLIFY_SITE_ID          - Netlify site ID
  NETLIFY_AUTH_TOKEN       - Netlify API token
  DEPLOYMENT_WEBHOOK_URL   - Webhook URL for notifications
  GITHUB_TOKEN            - GitHub token for status updates
  GITHUB_REPOSITORY       - GitHub repository (owner/repo)
  GITHUB_SHA              - Git commit SHA
          `);
          process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = DeploymentMonitor;