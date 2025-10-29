// Bundle analysis and size monitoring utilities
export interface BundleStats {
  totalSize: number
  gzippedSize: number
  chunks: ChunkInfo[]
  assets: AssetInfo[]
  timestamp: number
}

export interface ChunkInfo {
  name: string
  size: number
  gzippedSize: number
  modules: string[]
  isEntry: boolean
  isAsync: boolean
}

export interface AssetInfo {
  name: string
  size: number
  type: 'js' | 'css' | 'image' | 'font' | 'other'
}

export interface PerformanceBudget {
  maxBundleSize: number // in bytes
  maxChunkSize: number
  maxAssetSize: number
  maxTotalSize: number
}

// Default performance budgets
export const DEFAULT_BUDGETS: PerformanceBudget = {
  maxBundleSize: 250 * 1024, // 250KB
  maxChunkSize: 100 * 1024,  // 100KB
  maxAssetSize: 50 * 1024,   // 50KB
  maxTotalSize: 500 * 1024   // 500KB
}

export class BundleAnalyzer {
  private budgets: PerformanceBudget
  private stats: BundleStats | null = null

  constructor(budgets: PerformanceBudget = DEFAULT_BUDGETS) {
    this.budgets = budgets
  }

  // Analyze bundle from build stats
  analyzeBundleStats(stats: any): BundleStats {
    const chunks: ChunkInfo[] = []
    const assets: AssetInfo[] = []
    let totalSize = 0

    // Process chunks
    if (stats.chunks) {
      stats.chunks.forEach((chunk: any) => {
        const chunkInfo: ChunkInfo = {
          name: chunk.name || chunk.id,
          size: chunk.size || 0,
          gzippedSize: this.estimateGzipSize(chunk.size || 0),
          modules: chunk.modules?.map((m: any) => m.name || m.id) || [],
          isEntry: chunk.isEntry || false,
          isAsync: !chunk.isEntry
        }
        chunks.push(chunkInfo)
        totalSize += chunkInfo.size
      })
    }

    // Process assets
    if (stats.assets) {
      stats.assets.forEach((asset: any) => {
        const assetInfo: AssetInfo = {
          name: asset.name,
          size: asset.size,
          type: this.getAssetType(asset.name)
        }
        assets.push(assetInfo)
      })
    }

    this.stats = {
      totalSize,
      gzippedSize: this.estimateGzipSize(totalSize),
      chunks,
      assets,
      timestamp: Date.now()
    }

    return this.stats
  }

  // Check if bundle meets performance budgets
  checkBudgets(stats: BundleStats = this.stats!): BudgetResult {
    if (!stats) {
      throw new Error('No bundle stats available')
    }

    const violations: BudgetViolation[] = []

    // Check total size
    if (stats.totalSize > this.budgets.maxTotalSize) {
      violations.push({
        type: 'total-size',
        actual: stats.totalSize,
        budget: this.budgets.maxTotalSize,
        severity: 'error'
      })
    }

    // Check individual chunks
    stats.chunks.forEach(chunk => {
      if (chunk.size > this.budgets.maxChunkSize) {
        violations.push({
          type: 'chunk-size',
          name: chunk.name,
          actual: chunk.size,
          budget: this.budgets.maxChunkSize,
          severity: chunk.isEntry ? 'error' : 'warning'
        })
      }
    })

    // Check assets
    stats.assets.forEach(asset => {
      if (asset.size > this.budgets.maxAssetSize) {
        violations.push({
          type: 'asset-size',
          name: asset.name,
          actual: asset.size,
          budget: this.budgets.maxAssetSize,
          severity: 'warning'
        })
      }
    })

    return {
      passed: violations.length === 0,
      violations,
      stats
    }
  }

  // Generate optimization recommendations
  generateRecommendations(stats: BundleStats = this.stats!): OptimizationRecommendation[] {
    if (!stats) return []

    const recommendations: OptimizationRecommendation[] = []

    // Large chunks recommendations
    const largeChunks = stats.chunks.filter(chunk => chunk.size > 50 * 1024)
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code-splitting',
        priority: 'high',
        description: 'Consider splitting large chunks',
        details: largeChunks.map(chunk => `${chunk.name}: ${this.formatSize(chunk.size)}`),
        impact: 'Reduces initial bundle size and improves loading performance'
      })
    }

    // Duplicate modules
    const moduleUsage = new Map<string, number>()
    stats.chunks.forEach(chunk => {
      chunk.modules.forEach(module => {
        moduleUsage.set(module, (moduleUsage.get(module) || 0) + 1)
      })
    })

    const duplicateModules = Array.from(moduleUsage.entries())
      .filter(([_, count]) => count > 1)
      .map(([module, count]) => ({ module, count }))

    if (duplicateModules.length > 0) {
      recommendations.push({
        type: 'deduplication',
        priority: 'medium',
        description: 'Duplicate modules detected',
        details: duplicateModules.map(({ module, count }) => `${module} (${count} times)`),
        impact: 'Reduces bundle size by eliminating duplicate code'
      })
    }

    // Large assets
    const largeAssets = stats.assets.filter(asset => asset.size > 25 * 1024)
    if (largeAssets.length > 0) {
      recommendations.push({
        type: 'asset-optimization',
        priority: 'medium',
        description: 'Large assets detected',
        details: largeAssets.map(asset => `${asset.name}: ${this.formatSize(asset.size)}`),
        impact: 'Optimizing assets can significantly reduce load times'
      })
    }

    return recommendations
  }

  private getAssetType(filename: string): AssetInfo['type'] {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'mjs':
        return 'js'
      case 'css':
        return 'css'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image'
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'eot':
        return 'font'
      default:
        return 'other'
    }
  }

  private estimateGzipSize(size: number): number {
    // Rough estimation: gzip typically reduces size by 60-70%
    return Math.round(size * 0.35)
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

export interface BudgetResult {
  passed: boolean
  violations: BudgetViolation[]
  stats: BundleStats
}

export interface BudgetViolation {
  type: 'total-size' | 'chunk-size' | 'asset-size'
  name?: string
  actual: number
  budget: number
  severity: 'error' | 'warning'
}

export interface OptimizationRecommendation {
  type: 'code-splitting' | 'deduplication' | 'asset-optimization' | 'lazy-loading'
  priority: 'high' | 'medium' | 'low'
  description: string
  details: string[]
  impact: string
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer()

// Development helper for runtime bundle analysis
export function analyzeBundleInDev() {
  if (process.env.NODE_ENV !== 'development') return

  // Analyze loaded modules
  const loadedModules = new Set<string>()
  const moduleGraph = new Map<string, string[]>()

  // Hook into module loading (development only)
  const originalImport = window.__vitePreload || (() => {})
  
  window.__vitePreload = function(deps: string[], cb?: () => void) {
    deps.forEach(dep => loadedModules.add(dep))
    return originalImport.call(this, deps, cb)
  }

  // Provide runtime analysis
  ;(window as any).__bundleAnalysis = {
    getLoadedModules: () => Array.from(loadedModules),
    getModuleCount: () => loadedModules.size,
    getModuleGraph: () => Object.fromEntries(moduleGraph)
  }
}