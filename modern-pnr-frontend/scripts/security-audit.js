#!/usr/bin/env node

/**
 * Comprehensive security audit script for production deployment
 * Checks for vulnerabilities, security headers, and best practices
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const crypto = require('crypto')

// Security configuration
const SECURITY_CONFIG = {
  // Dependency vulnerability thresholds
  vulnerabilities: {
    critical: 0,    // No critical vulnerabilities allowed
    high: 0,        // No high vulnerabilities allowed
    moderate: 5,    // Max 5 moderate vulnerabilities
    low: 20,        // Max 20 low vulnerabilities
  },
  
  // Required security headers
  requiredHeaders: [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ],
  
  // Forbidden patterns in code
  forbiddenPatterns: [
    /console\.log\(/g,           // No console.log in production
    /debugger/g,                 // No debugger statements
    /alert\(/g,                  // No alert() calls
    /eval\(/g,                   // No eval() usage
    /innerHTML\s*=/g,            // Potential XSS via innerHTML
    /document\.write\(/g,        // No document.write
    /\.html\(/g,                 // Potential XSS in template literals
  ],
  
  // Required environment variables for production
  requiredEnvVars: [
    'VITE_API_URL',
    'VITE_ENVIRONMENT',
  ],
  
  // File size limits (in bytes)
  fileSizeLimits: {
    js: 500 * 1024,      // 500KB for JS files
    css: 100 * 1024,     // 100KB for CSS files
    html: 50 * 1024,     // 50KB for HTML files
    total: 2 * 1024 * 1024, // 2MB total
  }
}

class SecurityAuditor {
  constructor() {
    this.results = {
      passed: true,
      errors: [],
      warnings: [],
      info: [],
      summary: {
        vulnerabilities: {},
        codeIssues: 0,
        missingHeaders: 0,
        fileSizeIssues: 0,
      }
    }
  }

  async runAudit() {
    console.log('🔒 Starting Security Audit...\n')

    try {
      // 1. Dependency vulnerability scan
      await this.checkDependencyVulnerabilities()
      
      // 2. Code security scan
      await this.scanCodeSecurity()
      
      // 3. Build security check
      await this.checkBuildSecurity()
      
      // 4. Environment configuration check
      await this.checkEnvironmentSecurity()
      
      // 5. File integrity check
      await this.checkFileIntegrity()
      
      // 6. Generate security report
      this.generateSecurityReport()
      
      // 7. Exit with appropriate code
      if (this.results.errors.length > 0) {
        console.log('\n❌ Security audit failed!')
        process.exit(1)
      } else if (this.results.warnings.length > 0) {
        console.log('\n⚠️  Security audit passed with warnings')
        process.exit(0)
      } else {
        console.log('\n✅ Security audit passed!')
        process.exit(0)
      }
      
    } catch (error) {
      console.error('💥 Security audit failed:', error.message)
      process.exit(1)
    }
  }

  async checkDependencyVulnerabilities() {
    console.log('🔍 Checking dependency vulnerabilities...')
    
    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' })
      const audit = JSON.parse(auditResult)
      
      const vulnerabilities = audit.metadata?.vulnerabilities || {}
      this.results.summary.vulnerabilities = vulnerabilities
      
      // Check against thresholds
      Object.entries(SECURITY_CONFIG.vulnerabilities).forEach(([severity, threshold]) => {
        const count = vulnerabilities[severity] || 0
        
        if (count > threshold) {
          const message = `${count} ${severity} vulnerabilities found (threshold: ${threshold})`
          
          if (severity === 'critical' || severity === 'high') {
            this.addError(message)
          } else {
            this.addWarning(message)
          }
        } else {
          console.log(`  ✅ ${severity}: ${count}/${threshold}`)
        }
      })
      
      // Check for specific vulnerable packages
      if (audit.advisories) {
        Object.values(audit.advisories).forEach(advisory => {
          if (advisory.severity === 'critical' || advisory.severity === 'high') {
            this.addError(`Vulnerable package: ${advisory.module_name} - ${advisory.title}`)
          }
        })
      }
      
    } catch (error) {
      if (error.status === 1) {
        // npm audit found vulnerabilities
        this.addError('npm audit found vulnerabilities')
      } else {
        this.addWarning('Could not run dependency vulnerability check')
      }
    }
  }

  async scanCodeSecurity() {
    console.log('\n🔍 Scanning code for security issues...')
    
    const srcDir = path.join(__dirname, '../src')
    let issueCount = 0
    
    const scanFile = (filePath) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
        return
      }
      
      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const relativePath = path.relative(process.cwd(), filePath)
        
        SECURITY_CONFIG.forbiddenPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern)
          if (matches) {
            const patternName = this.getPatternName(pattern)
            this.addWarning(`${relativePath}: Found ${matches.length} instances of ${patternName}`)
            issueCount += matches.length
          }
        })
        
        // Check for hardcoded secrets
        const secretPatterns = [
          /(?:password|pwd|pass)\s*[:=]\s*['"][^'"]+['"]/gi,
          /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/gi,
          /(?:secret|token)\s*[:=]\s*['"][^'"]+['"]/gi,
          /(?:private[_-]?key)\s*[:=]\s*['"][^'"]+['"]/gi,
        ]
        
        secretPatterns.forEach(pattern => {
          const matches = content.match(pattern)
          if (matches) {
            this.addError(`${relativePath}: Potential hardcoded secret found`)
            issueCount++
          }
        })
        
        // Check for unsafe DOM manipulation
        if (content.includes('dangerouslySetInnerHTML')) {
          this.addWarning(`${relativePath}: Uses dangerouslySetInnerHTML`)
          issueCount++
        }
        
      } catch (error) {
        this.addWarning(`Could not scan file: ${filePath}`)
      }
    }
    
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir)
      
      files.forEach(file => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          scanDirectory(filePath)
        } else {
          scanFile(filePath)
        }
      })
    }
    
    if (fs.existsSync(srcDir)) {
      scanDirectory(srcDir)
    }
    
    this.results.summary.codeIssues = issueCount
    console.log(`  Found ${issueCount} potential security issues in code`)
  }

  async checkBuildSecurity() {
    console.log('\n🔍 Checking build security...')
    
    const distDir = path.join(__dirname, '../dist')
    
    if (!fs.existsSync(distDir)) {
      this.addError('Build directory not found. Run "npm run build" first.')
      return
    }
    
    // Check for source maps in production
    const hasSourceMaps = this.findFiles(distDir, /\.map$/).length > 0
    if (hasSourceMaps) {
      this.addWarning('Source maps found in build - consider removing for production')
    }
    
    // Check file sizes
    let totalSize = 0
    let fileSizeIssues = 0
    
    const checkFileSize = (filePath) => {
      const stat = fs.statSync(filePath)
      const size = stat.size
      totalSize += size
      
      const ext = path.extname(filePath).slice(1)
      const limit = SECURITY_CONFIG.fileSizeLimits[ext]
      
      if (limit && size > limit) {
        this.addWarning(`Large file: ${path.relative(distDir, filePath)} (${this.formatBytes(size)})`)
        fileSizeIssues++
      }
    }
    
    this.findFiles(distDir, /\.(js|css|html)$/).forEach(checkFileSize)
    
    if (totalSize > SECURITY_CONFIG.fileSizeLimits.total) {
      this.addWarning(`Total build size exceeds limit: ${this.formatBytes(totalSize)}`)
      fileSizeIssues++
    }
    
    this.results.summary.fileSizeIssues = fileSizeIssues
    
    // Check for security headers in HTML
    const htmlFiles = this.findFiles(distDir, /\.html$/)
    htmlFiles.forEach(htmlFile => {
      const content = fs.readFileSync(htmlFile, 'utf8')
      
      // Check for CSP meta tag
      if (!content.includes('Content-Security-Policy')) {
        this.addWarning(`${path.relative(distDir, htmlFile)}: Missing Content-Security-Policy`)
      }
      
      // Check for unsafe inline scripts
      if (content.includes('<script>') && !content.includes('nonce=')) {
        this.addWarning(`${path.relative(distDir, htmlFile)}: Inline scripts without nonce`)
      }
    })
  }

  async checkEnvironmentSecurity() {
    console.log('\n🔍 Checking environment configuration...')
    
    // Check required environment variables
    SECURITY_CONFIG.requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.addError(`Missing required environment variable: ${envVar}`)
      }
    })
    
    // Check for development environment in production
    if (process.env.NODE_ENV !== 'production') {
      this.addWarning('NODE_ENV is not set to "production"')
    }
    
    // Check for debug flags
    if (process.env.DEBUG) {
      this.addWarning('DEBUG environment variable is set')
    }
    
    // Check .env files
    const envFiles = ['.env', '.env.local', '.env.development', '.env.production']
    envFiles.forEach(envFile => {
      const envPath = path.join(__dirname, '..', envFile)
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        
        // Check for secrets in .env files
        if (content.includes('SECRET') || content.includes('PASSWORD') || content.includes('PRIVATE_KEY')) {
          this.addWarning(`${envFile}: Contains potential secrets`)
        }
      }
    })
  }

  async checkFileIntegrity() {
    console.log('\n🔍 Checking file integrity...')
    
    const distDir = path.join(__dirname, '../dist')
    
    if (!fs.existsSync(distDir)) {
      return
    }
    
    // Generate integrity hashes for critical files
    const criticalFiles = this.findFiles(distDir, /\.(js|css)$/)
    const integrity = {}
    
    criticalFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath)
      const hash = crypto.createHash('sha384').update(content).digest('base64')
      const relativePath = path.relative(distDir, filePath)
      integrity[relativePath] = `sha384-${hash}`
    })
    
    // Save integrity file
    const integrityPath = path.join(distDir, 'integrity.json')
    fs.writeFileSync(integrityPath, JSON.stringify(integrity, null, 2))
    
    console.log(`  Generated integrity hashes for ${Object.keys(integrity).length} files`)
    this.addInfo(`Integrity file created: ${integrityPath}`)
  }

  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      passed: this.results.passed,
      summary: this.results.summary,
      errors: this.results.errors,
      warnings: this.results.warnings,
      info: this.results.info,
      recommendations: this.generateRecommendations(),
    }
    
    // Save report
    const reportPath = path.join(__dirname, '../security-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`\n📄 Security report saved to: ${reportPath}`)
    
    // Generate GitHub Actions annotations if in CI
    if (process.env.GITHUB_ACTIONS) {
      this.results.errors.forEach(error => {
        console.log(`::error file=security-audit::${error}`)
      })
      
      this.results.warnings.forEach(warning => {
        console.log(`::warning file=security-audit::${warning}`)
      })
    }
    
    // Print summary
    console.log('\n📊 Security Audit Summary:')
    console.log(`  Errors: ${this.results.errors.length}`)
    console.log(`  Warnings: ${this.results.warnings.length}`)
    console.log(`  Code Issues: ${this.results.summary.codeIssues}`)
    console.log(`  Vulnerabilities: ${JSON.stringify(this.results.summary.vulnerabilities)}`)
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.results.summary.vulnerabilities.critical > 0) {
      recommendations.push('Update dependencies to fix critical vulnerabilities')
    }
    
    if (this.results.summary.codeIssues > 0) {
      recommendations.push('Review and fix security issues in code')
    }
    
    if (this.results.summary.fileSizeIssues > 0) {
      recommendations.push('Optimize bundle sizes to improve performance and security')
    }
    
    recommendations.push('Implement Content Security Policy headers')
    recommendations.push('Enable security headers in web server configuration')
    recommendations.push('Set up automated security monitoring')
    recommendations.push('Regular security audits and dependency updates')
    
    return recommendations
  }

  addError(message) {
    this.results.errors.push(message)
    this.results.passed = false
    console.log(`  ❌ ${message}`)
  }

  addWarning(message) {
    this.results.warnings.push(message)
    console.log(`  ⚠️  ${message}`)
  }

  addInfo(message) {
    this.results.info.push(message)
    console.log(`  ℹ️  ${message}`)
  }

  findFiles(dir, pattern) {
    const files = []
    
    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir)
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item)
        const stat = fs.statSync(itemPath)
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath)
        } else if (pattern.test(item)) {
          files.push(itemPath)
        }
      })
    }
    
    scanDirectory(dir)
    return files
  }

  getPatternName(pattern) {
    const patternNames = {
      '/console\\.log\\(/g': 'console.log',
      '/debugger/g': 'debugger',
      '/alert\\(/g': 'alert()',
      '/eval\\(/g': 'eval()',
      '/innerHTML\\s*=/g': 'innerHTML assignment',
      '/document\\.write\\(/g': 'document.write',
      '/\\.html\\(/g': 'template literal HTML',
    }
    
    return patternNames[pattern.toString()] || 'security pattern'
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Run security audit
const auditor = new SecurityAuditor()
auditor.runAudit().catch(error => {
  console.error('Security audit failed:', error)
  process.exit(1)
})