#!/usr/bin/env node

/**
 * Build Failure Handler
 * 
 * This script handles build failures by analyzing logs, sending notifications,
 * and providing recovery suggestions.
 */

const fs = require('fs');
const path = require('path');

class BuildFailureHandler {
  constructor(config = {}) {
    this.config = {
      logFile: path.join(process.cwd(), 'build-failure-logs.json'),
      maxRetries: 3,
      retryDelay: 60000, // 1 minute
      ...config
    };
    
    this.failureLogs = this.loadFailureLogs();
    this.errorPatterns = this.initializeErrorPatterns();
  }

  /**
   * Load existing failure logs
   */
  loadFailureLogs() {
    try {
      if (fs.existsSync(this.config.logFile)) {
        const data = fs.readFileSync(this.config.logFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load existing failure logs:', error.message);
    }
    
    return {
      failures: [],
      lastUpdated: null
    };
  }

  /**
   * Save failure logs to file
   */
  saveFailureLogs() {
    try {
      this.failureLogs.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.config.logFile, JSON.stringify(this.failureLogs, null, 2));
    } catch (error) {
      console.error('Failed to save failure logs:', error.message);
    }
  }

  /**
   * Initialize common error patterns and solutions
   */
  initializeErrorPatterns() {
    return [
      {
        pattern: /npm ERR! code ENOTFOUND/i,
        category: 'network',
        title: 'Network Connection Error',
        description: 'Failed to connect to npm registry',
        solutions: [
          'Check network connectivity',
          'Verify npm registry URL',
          'Try using a different registry mirror',
          'Clear npm cache: npm cache clean --force'
        ]
      },
      {
        pattern: /npm ERR! peer dep missing/i,
        category: 'dependencies',
        title: 'Peer Dependency Missing',
        description: 'Required peer dependency is not installed',
        solutions: [
          'Install missing peer dependencies',
          'Update package.json with correct versions',
          'Run npm install --legacy-peer-deps if needed'
        ]
      },
      {
        pattern: /Module not found: Error: Can't resolve/i,
        category: 'build',
        title: 'Module Resolution Error',
        description: 'Build system cannot resolve module imports',
        solutions: [
          'Check import paths for typos',
          'Verify file exists at specified path',
          'Check case sensitivity in file names',
          'Update import statements to use correct paths'
        ]
      },
      {
        pattern: /TypeScript error in/i,
        category: 'typescript',
        title: 'TypeScript Compilation Error',
        description: 'TypeScript compilation failed',
        solutions: [
          'Fix TypeScript errors in source code',
          'Update type definitions',
          'Check tsconfig.json configuration',
          'Run tsc --noEmit locally to debug'
        ]
      },
      {
        pattern: /ESLint: .* error/i,
        category: 'linting',
        title: 'ESLint Error',
        description: 'Code linting failed',
        solutions: [
          'Fix linting errors in source code',
          'Update ESLint configuration',
          'Run eslint --fix to auto-fix issues',
          'Disable specific rules if necessary'
        ]
      },
      {
        pattern: /Out of memory/i,
        category: 'memory',
        title: 'Out of Memory Error',
        description: 'Build process ran out of memory',
        solutions: [
          'Optimize build process to use less memory',
          'Split large bundles into smaller chunks',
          'Increase Node.js memory limit',
          'Remove unused dependencies'
        ]
      },
      {
        pattern: /ENOSPC: no space left on device/i,
        category: 'disk',
        title: 'Disk Space Error',
        description: 'Build environment ran out of disk space',
        solutions: [
          'Clean up temporary files',
          'Remove unused node_modules',
          'Optimize asset sizes',
          'Contact support if issue persists'
        ]
      },
      {
        pattern: /Command failed with exit code 1/i,
        category: 'command',
        title: 'Command Execution Failed',
        description: 'Build command exited with error code',
        solutions: [
          'Check build command syntax',
          'Verify all required scripts exist',
          'Review command output for specific errors',
          'Test build command locally'
        ]
      }
    ];
  }

  /**
   * Analyze build failure and categorize error
   */
  analyzeBuildFailure(buildLog, deploymentInfo = {}) {
    const analysis = {
      deploymentId: deploymentInfo.id || 'unknown',
      timestamp: new Date().toISOString(),
      branch: deploymentInfo.branch || 'unknown',
      commit: deploymentInfo.commit || 'unknown',
      buildLog: buildLog,
      errors: [],
      category: 'unknown',
      severity: 'medium',
      solutions: [],
      retryRecommended: false
    };

    // Analyze log for known error patterns
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(buildLog)) {
        analysis.errors.push({
          pattern: pattern.pattern.source,
          category: pattern.category,
          title: pattern.title,
          description: pattern.description,
          solutions: pattern.solutions
        });
        
        // Set primary category to first match
        if (analysis.category === 'unknown') {
          analysis.category = pattern.category;
          analysis.solutions = pattern.solutions;
        }
      }
    }

    // Determine severity based on error category
    analysis.severity = this.determineSeverity(analysis.category, analysis.errors);
    
    // Determine if retry is recommended
    analysis.retryRecommended = this.shouldRetry(analysis.category, analysis.errors);

    // Extract specific error messages
    analysis.specificErrors = this.extractSpecificErrors(buildLog);

    // Log the failure
    this.logFailure(analysis);

    return analysis;
  }

  /**
   * Determine error severity
   */
  determineSeverity(category, errors) {
    const severityMap = {
      'network': 'low',      // Often transient
      'memory': 'high',      // Requires configuration changes
      'disk': 'high',        // Requires cleanup or support
      'dependencies': 'medium', // Usually fixable
      'build': 'medium',     // Code-related issues
      'typescript': 'medium', // Code-related issues
      'linting': 'low',      // Usually auto-fixable
      'command': 'medium'    // Configuration issues
    };

    return severityMap[category] || 'medium';
  }

  /**
   * Determine if retry is recommended
   */
  shouldRetry(category, errors) {
    const retryableCategories = ['network', 'memory', 'disk'];
    return retryableCategories.includes(category);
  }

  /**
   * Extract specific error messages from build log
   */
  extractSpecificErrors(buildLog) {
    const errorLines = [];
    const lines = buildLog.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for common error indicators
      if (line.includes('ERROR') || 
          line.includes('FAILED') || 
          line.includes('Error:') ||
          line.includes('npm ERR!')) {
        
        // Include context lines
        const contextStart = Math.max(0, i - 2);
        const contextEnd = Math.min(lines.length, i + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');
        
        errorLines.push({
          line: i + 1,
          message: line.trim(),
          context: context
        });
      }
    }
    
    return errorLines;
  }

  /**
   * Log failure information
   */
  logFailure(analysis) {
    this.failureLogs.failures.unshift(analysis);
    
    // Keep only last 100 failures
    if (this.failureLogs.failures.length > 100) {
      this.failureLogs.failures = this.failureLogs.failures.slice(0, 100);
    }

    this.saveFailureLogs();
  }

  /**
   * Generate failure report
   */
  generateFailureReport(analysis) {
    const report = {
      summary: {
        deploymentId: analysis.deploymentId,
        timestamp: analysis.timestamp,
        branch: analysis.branch,
        commit: analysis.commit,
        category: analysis.category,
        severity: analysis.severity
      },
      errors: analysis.errors,
      solutions: analysis.solutions,
      specificErrors: analysis.specificErrors.slice(0, 5), // Top 5 errors
      retryRecommended: analysis.retryRecommended,
      nextSteps: this.generateNextSteps(analysis)
    };

    return report;
  }

  /**
   * Generate recommended next steps
   */
  generateNextSteps(analysis) {
    const steps = [];

    if (analysis.retryRecommended) {
      steps.push({
        action: 'retry',
        description: 'Retry the deployment as this may be a transient issue',
        priority: 'high'
      });
    }

    if (analysis.category === 'dependencies') {
      steps.push({
        action: 'update_dependencies',
        description: 'Review and update package dependencies',
        priority: 'medium'
      });
    }

    if (analysis.category === 'build' || analysis.category === 'typescript') {
      steps.push({
        action: 'fix_code',
        description: 'Fix code issues identified in the build log',
        priority: 'high'
      });
    }

    if (analysis.category === 'linting') {
      steps.push({
        action: 'run_linter',
        description: 'Run linter locally and fix issues: npm run lint --fix',
        priority: 'low'
      });
    }

    if (analysis.severity === 'high') {
      steps.push({
        action: 'contact_support',
        description: 'Contact support if issue persists after trying solutions',
        priority: 'low'
      });
    }

    return steps;
  }

  /**
   * Send failure notification
   */
  async sendFailureNotification(analysis, channels = ['console']) {
    const report = this.generateFailureReport(analysis);
    
    for (const channel of channels) {
      try {
        await this.sendNotificationToChannel(channel, report);
      } catch (error) {
        console.error(`Failed to send notification to ${channel}:`, error.message);
      }
    }
  }

  /**
   * Send notification to specific channel
   */
  async sendNotificationToChannel(channel, report) {
    switch (channel) {
      case 'console':
        this.sendConsoleNotification(report);
        break;
      case 'slack':
        await this.sendSlackNotification(report);
        break;
      case 'email':
        await this.sendEmailNotification(report);
        break;
      case 'webhook':
        await this.sendWebhookNotification(report);
        break;
      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Send console notification
   */
  sendConsoleNotification(report) {
    console.log('\n🚨 BUILD FAILURE REPORT 🚨');
    console.log('================================');
    console.log(`Deployment ID: ${report.summary.deploymentId}`);
    console.log(`Branch: ${report.summary.branch}`);
    console.log(`Commit: ${report.summary.commit}`);
    console.log(`Category: ${report.summary.category}`);
    console.log(`Severity: ${report.summary.severity}`);
    console.log(`Timestamp: ${report.summary.timestamp}`);
    
    if (report.errors.length > 0) {
      console.log('\n📋 IDENTIFIED ERRORS:');
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.title}`);
        console.log(`   Category: ${error.category}`);
        console.log(`   Description: ${error.description}`);
      });
    }

    if (report.solutions.length > 0) {
      console.log('\n💡 SUGGESTED SOLUTIONS:');
      report.solutions.forEach((solution, index) => {
        console.log(`${index + 1}. ${solution}`);
      });
    }

    if (report.nextSteps.length > 0) {
      console.log('\n🔧 NEXT STEPS:');
      report.nextSteps.forEach((step, index) => {
        console.log(`${index + 1}. [${step.priority.toUpperCase()}] ${step.description}`);
      });
    }

    if (report.retryRecommended) {
      console.log('\n🔄 RETRY RECOMMENDED: This appears to be a transient issue.');
    }

    console.log('\n================================\n');
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(report) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('Slack webhook URL not configured');
      return;
    }

    const message = {
      text: `🚨 Build Failure - ${report.summary.deploymentId}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Branch', value: report.summary.branch, short: true },
          { title: 'Commit', value: report.summary.commit, short: true },
          { title: 'Category', value: report.summary.category, short: true },
          { title: 'Severity', value: report.summary.severity, short: true }
        ],
        text: report.solutions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')
      }]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(report) {
    const webhookUrl = process.env.BUILD_FAILURE_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('Build failure webhook URL not configured');
      return;
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'build_failure',
        report: report,
        timestamp: new Date().toISOString()
      })
    });
  }

  /**
   * Get failure statistics
   */
  getFailureStats() {
    const failures = this.failureLogs.failures;
    
    if (failures.length === 0) {
      return null;
    }

    const stats = {
      total: failures.length,
      byCategory: {},
      bySeverity: {},
      recentFailures: failures.slice(0, 10),
      mostCommonErrors: this.getMostCommonErrors(failures)
    };

    // Count by category
    failures.forEach(failure => {
      stats.byCategory[failure.category] = (stats.byCategory[failure.category] || 0) + 1;
      stats.bySeverity[failure.severity] = (stats.bySeverity[failure.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get most common error patterns
   */
  getMostCommonErrors(failures) {
    const errorCounts = {};
    
    failures.forEach(failure => {
      failure.errors.forEach(error => {
        const key = error.title;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
    });

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const handler = new BuildFailureHandler();

  async function main() {
    try {
      switch (command) {
        case 'analyze':
          const logFile = process.argv[3];
          if (!logFile || !fs.existsSync(logFile)) {
            console.error('Build log file required and must exist');
            process.exit(1);
          }
          
          const buildLog = fs.readFileSync(logFile, 'utf8');
          const analysis = handler.analyzeBuildFailure(buildLog);
          
          await handler.sendFailureNotification(analysis, ['console']);
          break;

        case 'stats':
          const stats = handler.getFailureStats();
          if (stats) {
            console.log('Failure Statistics:', JSON.stringify(stats, null, 2));
          } else {
            console.log('No failure data available');
          }
          break;

        case 'recent':
          const limit = parseInt(process.argv[3]) || 10;
          const recent = handler.failureLogs.failures.slice(0, limit);
          console.log(`Recent ${limit} failures:`, JSON.stringify(recent, null, 2));
          break;

        default:
          console.log(`
Usage: node build-failure-handler.js <command> [options]

Commands:
  analyze <log-file>    - Analyze build failure from log file
  stats                 - Show failure statistics
  recent [limit]        - Show recent failures (default: 10)

Environment Variables:
  SLACK_WEBHOOK_URL           - Slack webhook for notifications
  BUILD_FAILURE_WEBHOOK_URL   - Custom webhook for failure notifications
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

module.exports = BuildFailureHandler;