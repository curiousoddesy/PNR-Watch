// Performance budgets and CI/CD integration
export interface PerformanceBudget {
  name: string
  metric: string
  budget: number
  unit: 'ms' | 'kb' | 'score' | 'count'
  threshold: 'error' | 'warning'
}

export interface BudgetResult {
  budget: PerformanceBudget
  actual: number
  passed: boolean
  difference: number
  percentage: number
}

export interface BudgetReport {
  passed: boolean
  results: BudgetResult[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
    errors: number
  }
  timestamp: number
}

// Default performance budgets
export const DEFAULT_BUDGETS: PerformanceBudget[] = [
  // Web Vitals budgets
  { name: 'First Contentful Paint', metric: 'FCP', budget: 1800, unit: 'ms', threshold: 'error' },
  { name: 'Largest Contentful Paint', metric: 'LCP', budget: 2500, unit: 'ms', threshold: 'error' },
  { name: 'First Input Delay', metric: 'FID', budget: 100, unit: 'ms', threshold: 'error' },
  { name: 'Cumulative Layout Shift', metric: 'CLS', budget: 0.1, unit: 'score', threshold: 'error' },
  { name: 'Time to First Byte', metric: 'TTFB', budget: 800, unit: 'ms', threshold: 'warning' },
  
  // Bundle size budgets
  { name: 'Main Bundle Size', metric: 'MAIN_BUNDLE', budget: 250, unit: 'kb', threshold: 'error' },
  { name: 'Vendor Bundle Size', metric: 'VENDOR_BUNDLE', budget: 500, unit: 'kb', threshold: 'warning' },
  { name: 'Total Bundle Size', metric: 'TOTAL_BUNDLE', budget: 1000, unit: 'kb', threshold: 'error' },
  
  // Resource budgets
  { name: 'Image Count', metric: 'IMAGE_COUNT', budget: 50, unit: 'count', threshold: 'warning' },
  { name: 'Script Count', metric: 'SCRIPT_COUNT', budget: 20, unit: 'count', threshold: 'warning' },
  { name: 'CSS Count', metric: 'CSS_COUNT', budget: 10, unit: 'count', threshold: 'warning' },
  
  // Performance score budgets
  { name: 'Lighthouse Performance', metric: 'LIGHTHOUSE_PERFORMANCE', budget: 90, unit: 'score', threshold: 'error' },
  { name: 'Lighthouse Accessibility', metric: 'LIGHTHOUSE_A11Y', budget: 95, unit: 'score', threshold: 'error' },
  { name: 'Lighthouse Best Practices', metric: 'LIGHTHOUSE_BP', budget: 90, unit: 'score', threshold: 'warning' },
  { name: 'Lighthouse SEO', metric: 'LIGHTHOUSE_SEO', budget: 90, unit: 'score', threshold: 'warning' }
]

export class PerformanceBudgetChecker {
  private budgets: PerformanceBudget[]
  
  constructor(budgets = DEFAULT_BUDGETS) {
    this.budgets = budgets
  }

  checkBudgets(metrics: Record<string, number>): BudgetReport {
    const results: BudgetResult[] = []
    let passed = 0
    let failed = 0
    let warnings = 0
    let errors = 0

    this.budgets.forEach(budget => {
      const actual = metrics[budget.metric]
      if (actual === undefined) {
        console.warn(`Metric ${budget.metric} not found in provided metrics`)
        return
      }

      const budgetPassed = actual <= budget.budget
      const difference = actual - budget.budget
      const percentage = (difference / budget.budget) * 100

      const result: BudgetResult = {
        budget,
        actual,
        passed: budgetPassed,
        difference,
        percentage
      }

      results.push(result)

      if (budgetPassed) {
        passed++
      } else {
        failed++
        if (budget.threshold === 'error') {
          errors++
        } else {
          warnings++
        }
      }
    })

    return {
      passed: failed === 0,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        warnings,
        errors
      },
      timestamp: Date.now()
    }
  }

  generateReport(report: BudgetReport): string {
    const lines: string[] = []
    
    lines.push('Performance Budget Report')
    lines.push('='.repeat(50))
    lines.push(`Generated: ${new Date(report.timestamp).toISOString()}`)
    lines.push(`Overall Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`)
    lines.push('')
    
    lines.push('Summary:')
    lines.push(`  Total Budgets: ${report.summary.total}`)
    lines.push(`  Passed: ${report.summary.passed}`)
    lines.push(`  Failed: ${report.summary.failed}`)
    lines.push(`  Errors: ${report.summary.errors}`)
    lines.push(`  Warnings: ${report.summary.warnings}`)
    lines.push('')

    // Group results by status
    const failedResults = report.results.filter(r => !r.passed)
    const passedResults = report.results.filter(r => r.passed)

    if (failedResults.length > 0) {
      lines.push('❌ Failed Budgets:')
      failedResults.forEach(result => {
        const icon = result.budget.threshold === 'error' ? '🚨' : '⚠️'
        const unit = result.budget.unit
        lines.push(`  ${icon} ${result.budget.name}`)
        lines.push(`     Budget: ${result.budget.budget}${unit}`)
        lines.push(`     Actual: ${result.actual}${unit}`)
        lines.push(`     Over by: ${result.difference.toFixed(2)}${unit} (${result.percentage.toFixed(1)}%)`)
        lines.push('')
      })
    }

    if (passedResults.length > 0) {
      lines.push('✅ Passed Budgets:')
      passedResults.forEach(result => {
        const unit = result.budget.unit
        lines.push(`  ✅ ${result.budget.name}: ${result.actual}${unit} (budget: ${result.budget.budget}${unit})`)
      })
    }

    return lines.join('\n')
  }

  exportToCI(report: BudgetReport): CIReport {
    return {
      success: report.passed,
      exitCode: report.summary.errors > 0 ? 1 : 0,
      message: report.passed ? 'All performance budgets passed' : `${report.summary.failed} budgets failed`,
      details: {
        total: report.summary.total,
        passed: report.summary.passed,
        failed: report.summary.failed,
        errors: report.summary.errors,
        warnings: report.summary.warnings
      },
      annotations: report.results
        .filter(r => !r.passed)
        .map(r => ({
          level: r.budget.threshold === 'error' ? 'failure' : 'warning',
          message: `${r.budget.name} exceeded budget: ${r.actual}${r.budget.unit} > ${r.budget.budget}${r.budget.unit}`,
          title: `Performance Budget: ${r.budget.name}`,
          file: 'performance-budget'
        }))
    }
  }
}

export interface CIReport {
  success: boolean
  exitCode: number
  message: string
  details: {
    total: number
    passed: number
    failed: number
    errors: number
    warnings: number
  }
  annotations: Array<{
    level: 'failure' | 'warning'
    message: string
    title: string
    file: string
  }>
}

// Global budget checker
export const budgetChecker = new PerformanceBudgetChecker()