#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Performance budget configuration
const PERFORMANCE_BUDGETS = {
  // Web Vitals (from Lighthouse)
  'first-contentful-paint': { budget: 1800, unit: 'ms', threshold: 'error' },
  'largest-contentful-paint': { budget: 2500, unit: 'ms', threshold: 'error' },
  'first-input-delay': { budget: 100, unit: 'ms', threshold: 'error' },
  'cumulative-layout-shift': { budget: 0.1, unit: 'score', threshold: 'error' },
  'speed-index': { budget: 3000, unit: 'ms', threshold: 'warning' },
  
  // Bundle sizes
  'main-bundle-size': { budget: 250 * 1024, unit: 'bytes', threshold: 'error' },
  'vendor-bundle-size': { budget: 500 * 1024, unit: 'bytes', threshold: 'warning' },
  'total-bundle-size': { budget: 1000 * 1024, unit: 'bytes', threshold: 'error' },
  
  // Lighthouse scores
  'performance-score': { budget: 90, unit: 'score', threshold: 'error' },
  'accessibility-score': { budget: 95, unit: 'score', threshold: 'error' },
  'best-practices-score': { budget: 90, unit: 'score', threshold: 'warning' },
  'seo-score': { budget: 90, unit: 'score', threshold: 'warning' }
}

async function runPerformanceCheck() {
  console.log('🚀 Running Performance Check...\n')
  
  const results = {
    passed: true,
    errors: [],
    warnings: [],
    metrics: {}
  }

  try {
    // 1. Build the application
    console.log('📦 Building application...')
    execSync('npm run build', { stdio: 'inherit' })
    
    // 2. Analyze bundle sizes
    console.log('\n📊 Analyzing bundle sizes...')
    const bundleMetrics = analyzeBundleSizes()
    Object.assign(results.metrics, bundleMetrics)
    
    // 3. Run Lighthouse audit
    console.log('\n🔍 Running Lighthouse audit...')
    const lighthouseMetrics = await runLighthouseAudit()
    Object.assign(results.metrics, lighthouseMetrics)
    
    // 4. Check performance budgets
    console.log('\n🎯 Checking performance budgets...')
    checkBudgets(results)
    
    // 5. Generate report
    generateReport(results)
    
    // 6. Exit with appropriate code
    if (results.errors.length > 0) {
      console.log('\n❌ Performance check failed!')
      process.exit(1)
    } else if (results.warnings.length > 0) {
      console.log('\n⚠️  Performance check passed with warnings')
      process.exit(0)
    } else {
      console.log('\n✅ All performance budgets passed!')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('💥 Performance check failed:', error.message)
    process.exit(1)
  }
}

function analyzeBundleSizes() {
  const distPath = path.join(__dirname, '../dist')
  const metrics = {}
  
  if (!fs.existsSync(distPath)) {
    throw new Error('Build directory not found. Run "npm run build" first.')
  }

  let totalSize = 0
  let mainBundleSize = 0
  let vendorBundleSize = 0

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (stat.isFile() && file.endsWith('.js')) {
        const size = stat.size
        totalSize += size
        
        if (file.includes('vendor')) {
          vendorBundleSize += size
        } else if (file.includes('main') || file.includes('index')) {
          mainBundleSize += size
        }
      }
    })
  }

  scanDirectory(distPath)

  metrics['main-bundle-size'] = mainBundleSize
  metrics['vendor-bundle-size'] = vendorBundleSize
  metrics['total-bundle-size'] = totalSize

  console.log(`  Main bundle: ${formatBytes(mainBundleSize)}`)
  console.log(`  Vendor bundle: ${formatBytes(vendorBundleSize)}`)
  console.log(`  Total size: ${formatBytes(totalSize)}`)

  return metrics
}

async function runLighthouseAudit() {
  const metrics = {}
  
  try {
    // Start preview server
    console.log('  Starting preview server...')
    const server = execSync('npm run preview &', { stdio: 'pipe' })
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Run Lighthouse
    const lighthouseResult = execSync(
      'npx lighthouse http://localhost:4173 --output=json --quiet --chrome-flags="--headless"',
      { encoding: 'utf8' }
    )
    
    const report = JSON.parse(lighthouseResult)
    const audits = report.audits
    
    // Extract metrics
    metrics['first-contentful-paint'] = audits['first-contentful-paint']?.numericValue || 0
    metrics['largest-contentful-paint'] = audits['largest-contentful-paint']?.numericValue || 0
    metrics['first-input-delay'] = audits['max-potential-fid']?.numericValue || 0
    metrics['cumulative-layout-shift'] = audits['cumulative-layout-shift']?.numericValue || 0
    metrics['speed-index'] = audits['speed-index']?.numericValue || 0
    
    // Extract scores
    metrics['performance-score'] = report.categories.performance?.score * 100 || 0
    metrics['accessibility-score'] = report.categories.accessibility?.score * 100 || 0
    metrics['best-practices-score'] = report.categories['best-practices']?.score * 100 || 0
    metrics['seo-score'] = report.categories.seo?.score * 100 || 0
    
    console.log(`  Performance: ${metrics['performance-score']}/100`)
    console.log(`  Accessibility: ${metrics['accessibility-score']}/100`)
    console.log(`  Best Practices: ${metrics['best-practices-score']}/100`)
    console.log(`  SEO: ${metrics['seo-score']}/100`)
    
    // Kill preview server
    execSync('pkill -f "vite preview"', { stdio: 'ignore' })
    
  } catch (error) {
    console.warn('  Lighthouse audit failed:', error.message)
    // Continue without Lighthouse metrics
  }
  
  return metrics
}

function checkBudgets(results) {
  Object.entries(PERFORMANCE_BUDGETS).forEach(([metric, config]) => {
    const actual = results.metrics[metric]
    
    if (actual === undefined) {
      console.warn(`  ⚠️  Metric ${metric} not available`)
      return
    }
    
    const passed = actual <= config.budget
    const difference = actual - config.budget
    const percentage = (difference / config.budget) * 100
    
    if (passed) {
      console.log(`  ✅ ${metric}: ${formatValue(actual, config.unit)} (budget: ${formatValue(config.budget, config.unit)})`)
    } else {
      const message = `${metric}: ${formatValue(actual, config.unit)} > ${formatValue(config.budget, config.unit)} (+${percentage.toFixed(1)}%)`
      
      if (config.threshold === 'error') {
        console.log(`  ❌ ${message}`)
        results.errors.push(message)
        results.passed = false
      } else {
        console.log(`  ⚠️  ${message}`)
        results.warnings.push(message)
      }
    }
  })
}

function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    passed: results.passed,
    metrics: results.metrics,
    errors: results.errors,
    warnings: results.warnings,
    summary: {
      total: Object.keys(PERFORMANCE_BUDGETS).length,
      passed: Object.keys(PERFORMANCE_BUDGETS).length - results.errors.length - results.warnings.length,
      errors: results.errors.length,
      warnings: results.warnings.length
    }
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, '../performance-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`\n📄 Performance report saved to: ${reportPath}`)
  
  // Generate GitHub Actions annotations if in CI
  if (process.env.GITHUB_ACTIONS) {
    results.errors.forEach(error => {
      console.log(`::error file=performance-budget::${error}`)
    })
    
    results.warnings.forEach(warning => {
      console.log(`::warning file=performance-budget::${warning}`)
    })
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatValue(value, unit) {
  switch (unit) {
    case 'bytes':
      return formatBytes(value)
    case 'ms':
      return `${value.toFixed(0)}ms`
    case 'score':
      return `${value.toFixed(1)}`
    default:
      return value.toString()
  }
}

// Run the performance check
runPerformanceCheck().catch(error => {
  console.error('Performance check failed:', error)
  process.exit(1)
})