#!/usr/bin/env node

/**
 * Cross-platform deployment script for Modern PNR Frontend
 * Handles deployment to staging and production environments
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const CONFIG = {
  environments: {
    staging: {
      name: 'Staging',
      apiUrl: process.env.STAGING_API_URL || 'https://staging-api.pnrtracker.com',
      socketUrl: process.env.STAGING_SOCKET_URL || 'wss://staging-api.pnrtracker.com',
      s3Bucket: process.env.STAGING_S3_BUCKET,
      cloudfrontId: process.env.STAGING_CLOUDFRONT_ID,
      netlifyId: process.env.STAGING_NETLIFY_ID,
    },
    production: {
      name: 'Production',
      apiUrl: process.env.PRODUCTION_API_URL || 'https://api.pnrtracker.com',
      socketUrl: process.env.PRODUCTION_SOCKET_URL || 'wss://api.pnrtracker.com',
      s3Bucket: process.env.PRODUCTION_S3_BUCKET,
      cloudfrontId: process.env.PRODUCTION_CLOUDFRONT_ID,
      netlifyId: process.env.PRODUCTION_NETLIFY_ID,
    }
  }
}

class Deployer {
  constructor(environment, options = {}) {
    this.environment = environment
    this.config = CONFIG.environments[environment]
    this.options = {
      skipTests: options.skipTests || false,
      skipBuild: options.skipBuild || false,
      dryRun: options.dryRun || false,
      force: options.force || false,
      ...options
    }
    
    if (!this.config) {
      throw new Error(`Invalid environment: ${environment}`)
    }
  }

  async deploy() {
    console.log(`🚀 Starting deployment to ${this.config.name}...\n`)

    try {
      // Pre-deployment checks
      await this.runPreDeploymentChecks()
      
      // Build application
      if (!this.options.skipBuild) {
        await this.buildApplication()
      }
      
      // Run tests
      if (!this.options.skipTests) {
        await this.runTests()
      }
      
      // Security audit
      await this.runSecurityAudit()
      
      // Performance check
      await this.runPerformanceCheck()
      
      // Deploy based on available services
      await this.deployApplication()
      
      // Post-deployment verification
      await this.verifyDeployment()
      
      console.log(`\n✅ Deployment to ${this.config.name} completed successfully!`)
      
    } catch (error) {
      console.error(`\n❌ Deployment failed: ${error.message}`)
      process.exit(1)
    }
  }

  async runPreDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...')
    
    // Check Node.js version
    const nodeVersion = process.version
    console.log(`  Node.js version: ${nodeVersion}`)
    
    // Check if build directory exists (if skipping build)
    if (this.options.skipBuild) {
      const distPath = path.join(__dirname, '../dist')
      if (!fs.existsSync(distPath)) {
        throw new Error('Build directory not found. Cannot skip build.')
      }
    }
    
    // Check environment variables
    const requiredEnvVars = ['NODE_ENV']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.warn(`  ⚠️  Missing environment variables: ${missingVars.join(', ')}`)
    }
    
    console.log('  ✅ Pre-deployment checks passed')
  }

  async buildApplication() {
    console.log('\n📦 Building application...')
    
    // Set environment variables
    process.env.VITE_API_URL = this.config.apiUrl
    process.env.VITE_SOCKET_URL = this.config.socketUrl
    process.env.VITE_ENVIRONMENT = this.environment
    process.env.VITE_BUILD_VERSION = this.getBuildVersion()
    process.env.VITE_BUILD_TIMESTAMP = new Date().toISOString()
    
    try {
      execSync('npm run build', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
      })
      console.log('  ✅ Build completed successfully')
    } catch (error) {
      throw new Error('Build failed')
    }
  }

  async runTests() {
    console.log('\n🧪 Running tests...')
    
    try {
      execSync('npm run test', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      console.log('  ✅ All tests passed')
    } catch (error) {
      throw new Error('Tests failed')
    }
  }

  async runSecurityAudit() {
    console.log('\n🔒 Running security audit...')
    
    try {
      execSync('node scripts/security-audit.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      console.log('  ✅ Security audit passed')
    } catch (error) {
      if (!this.options.force) {
        throw new Error('Security audit failed')
      }
      console.warn('  ⚠️  Security audit failed, but continuing due to --force flag')
    }
  }

  async runPerformanceCheck() {
    console.log('\n📊 Running performance check...')
    
    try {
      execSync('node scripts/performance-check.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      console.log('  ✅ Performance check passed')
    } catch (error) {
      console.warn('  ⚠️  Performance check failed, but continuing')
    }
  }

  async deployApplication() {
    if (this.options.dryRun) {
      console.log('\n🔍 DRY RUN: Would deploy to the following services:')
      this.listAvailableServices()
      return
    }

    console.log(`\n🚀 Deploying to ${this.config.name}...`)
    
    let deployed = false

    // Try AWS S3 + CloudFront
    if (this.config.s3Bucket && this.hasAwsCli()) {
      await this.deployToAws()
      deployed = true
    }
    
    // Try Netlify
    else if (this.config.netlifyId && this.hasNetlifyCli()) {
      await this.deployToNetlify()
      deployed = true
    }
    
    // Fallback: Manual instructions
    else {
      this.showManualDeploymentInstructions()
    }

    if (!deployed && !this.options.dryRun) {
      console.warn('  ⚠️  No deployment service configured. See manual instructions above.')
    }
  }

  async deployToAws() {
    console.log('  📡 Deploying to AWS S3...')
    
    const distPath = path.join(__dirname, '../dist')
    
    try {
      // Sync files to S3
      execSync(`aws s3 sync "${distPath}" s3://${this.config.s3Bucket} --delete`, {
        stdio: 'inherit'
      })
      
      // Invalidate CloudFront cache if configured
      if (this.config.cloudfrontId) {
        console.log('  🔄 Invalidating CloudFront cache...')
        execSync(`aws cloudfront create-invalidation --distribution-id ${this.config.cloudfrontId} --paths "/*"`, {
          stdio: 'inherit'
        })
      }
      
      console.log('  ✅ AWS deployment completed')
    } catch (error) {
      throw new Error('AWS deployment failed')
    }
  }

  async deployToNetlify() {
    console.log('  📡 Deploying to Netlify...')
    
    const distPath = path.join(__dirname, '../dist')
    
    try {
      execSync(`netlify deploy --prod --dir="${distPath}" --site=${this.config.netlifyId}`, {
        stdio: 'inherit'
      })
      console.log('  ✅ Netlify deployment completed')
    } catch (error) {
      throw new Error('Netlify deployment failed')
    }
  }

  async verifyDeployment() {
    console.log('\n🔍 Verifying deployment...')
    
    // Basic verification - check if files exist
    const distPath = path.join(__dirname, '../dist')
    const indexPath = path.join(distPath, 'index.html')
    
    if (fs.existsSync(indexPath)) {
      console.log('  ✅ Build files verified')
    } else {
      throw new Error('Build verification failed')
    }
    
    // TODO: Add HTTP checks when URLs are available
    console.log('  ✅ Deployment verification completed')
  }

  hasAwsCli() {
    try {
      execSync('aws --version', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  hasNetlifyCli() {
    try {
      execSync('netlify --version', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  listAvailableServices() {
    console.log('  Available deployment options:')
    
    if (this.config.s3Bucket && this.hasAwsCli()) {
      console.log(`    ✅ AWS S3: ${this.config.s3Bucket}`)
      if (this.config.cloudfrontId) {
        console.log(`    ✅ CloudFront: ${this.config.cloudfrontId}`)
      }
    } else if (this.config.s3Bucket) {
      console.log(`    ❌ AWS S3: ${this.config.s3Bucket} (AWS CLI not available)`)
    }
    
    if (this.config.netlifyId && this.hasNetlifyCli()) {
      console.log(`    ✅ Netlify: ${this.config.netlifyId}`)
    } else if (this.config.netlifyId) {
      console.log(`    ❌ Netlify: ${this.config.netlifyId} (Netlify CLI not available)`)
    }
    
    if (!this.config.s3Bucket && !this.config.netlifyId) {
      console.log('    ❌ No deployment services configured')
    }
  }

  showManualDeploymentInstructions() {
    console.log('\n📋 Manual Deployment Instructions:')
    console.log('  1. Build files are located in: ./dist/')
    console.log('  2. Upload the contents of ./dist/ to your web server')
    console.log('  3. Configure your web server to serve index.html for all routes')
    console.log('  4. Set up the following environment variables:')
    console.log(`     - API_URL: ${this.config.apiUrl}`)
    console.log(`     - SOCKET_URL: ${this.config.socketUrl}`)
    console.log('\n  For detailed instructions, see: docs/DEPLOYMENT.md')
  }

  getBuildVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
      return packageJson.version || '1.0.0'
    } catch {
      return '1.0.0'
    }
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
Usage: node deploy.js <environment> [options]

Environments:
  staging     Deploy to staging environment
  production  Deploy to production environment

Options:
  --skip-tests     Skip running tests
  --skip-build     Skip building (use existing build)
  --dry-run        Show what would be deployed without actually deploying
  --force          Skip confirmation prompts and continue on warnings

Examples:
  node deploy.js staging
  node deploy.js production --skip-tests
  node deploy.js production --dry-run
`)
    process.exit(1)
  }

  const environment = args[0]
  const options = {
    skipTests: args.includes('--skip-tests'),
    skipBuild: args.includes('--skip-build'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  }

  // Confirmation for production
  if (environment === 'production' && !options.force && !options.dryRun) {
    console.log('⚠️  You are about to deploy to PRODUCTION.')
    console.log('This will make changes visible to all users.')
    console.log('\nTo proceed, run with --force flag or use --dry-run to preview.')
    process.exit(1)
  }

  const deployer = new Deployer(environment, options)
  deployer.deploy().catch(error => {
    console.error('Deployment failed:', error.message)
    process.exit(1)
  })
}

if (require.main === module) {
  main()
}

module.exports = { Deployer }