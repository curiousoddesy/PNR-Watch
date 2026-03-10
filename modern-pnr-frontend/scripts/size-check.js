#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { gzipSync } from 'zlib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Performance budgets (in bytes)
const BUDGETS = {
  maxBundleSize: 250 * 1024, // 250KB
  maxChunkSize: 100 * 1024,  // 100KB
  maxTotalSize: 500 * 1024,  // 500KB
  maxGzipSize: 150 * 1024    // 150KB gzipped
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function analyzeBundle() {
  const distPath = path.join(__dirname, '../dist')

  if (!fs.existsSync(distPath)) {
    console.error('❌ Build directory not found. Run "npm run build" first.')
    process.exit(1)
  }

  const assets = []
  let totalSize = 0
  let totalGzipSize = 0

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir)

    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.css'))) {
        const content = fs.readFileSync(filePath)
        const size = stat.size
        const gzipSize = gzipSync(content).length

        assets.push({
          name: path.relative(distPath, filePath),
          size,
          gzipSize,
          type: file.endsWith('.js') ? 'js' : 'css'
        })

        totalSize += size
        totalGzipSize += gzipSize
      }
    })
  }

  scanDirectory(distPath)

  // Sort by size (largest first)
  assets.sort((a, b) => b.size - a.size)

  console.log('\n📊 Bundle Size Analysis')
  console.log('========================\n')

  // Overall stats
  console.log('📈 Overall Statistics:')
  console.log(`   Total Size: ${formatSize(totalSize)}`)
  console.log(`   Total Gzipped: ${formatSize(totalGzipSize)}`)
  console.log(`   Compression Ratio: ${((1 - totalGzipSize / totalSize) * 100).toFixed(1)}%\n`)

  // Individual assets
  console.log('📁 Individual Assets:')
  assets.forEach(asset => {
    const sizeStr = formatSize(asset.size).padEnd(8)
    const gzipStr = formatSize(asset.gzipSize).padEnd(8)
    const compressionRatio = ((1 - asset.gzipSize / asset.size) * 100).toFixed(1)

    console.log(`   ${asset.name.padEnd(30)} ${sizeStr} → ${gzipStr} (${compressionRatio}%)`)
  })

  // Budget checks
  console.log('\n🎯 Budget Analysis:')
  let budgetPassed = true

  // Check total size
  if (totalSize > BUDGETS.maxTotalSize) {
    console.log(`   ⚠️  Total size exceeds budget: ${formatSize(totalSize)} > ${formatSize(BUDGETS.maxTotalSize)}`)
    budgetPassed = false
  } else {
    console.log(`   ✅ Total size within budget: ${formatSize(totalSize)} ≤ ${formatSize(BUDGETS.maxTotalSize)}`)
  }

  // Check gzip size
  if (totalGzipSize > BUDGETS.maxGzipSize) {
    console.log(`   ⚠️  Gzipped size exceeds budget: ${formatSize(totalGzipSize)} > ${formatSize(BUDGETS.maxGzipSize)}`)
    budgetPassed = false
  } else {
    console.log(`   ✅ Gzipped size within budget: ${formatSize(totalGzipSize)} ≤ ${formatSize(BUDGETS.maxGzipSize)}`)
  }

  // Check individual chunks
  const largeChunks = assets.filter(asset => asset.size > BUDGETS.maxChunkSize)
  if (largeChunks.length > 0) {
    console.log(`   ⚠️  Large chunks detected:`)
    largeChunks.forEach(chunk => {
      console.log(`      ${chunk.name}: ${formatSize(chunk.size)}`)
    })
    budgetPassed = false
  } else {
    console.log(`   ✅ All chunks within size budget`)
  }

  // Recommendations
  console.log('\n💡 Recommendations:')

  if (largeChunks.length > 0) {
    console.log('   • Consider code splitting for large chunks')
  }

  if (totalGzipSize / totalSize > 0.4) {
    console.log('   • Consider enabling better compression or removing unused code')
  }

  const jsAssets = assets.filter(a => a.type === 'js')
  if (jsAssets.length > 10) {
    console.log('   • Consider consolidating small chunks to reduce HTTP requests')
  }

  console.log('\n' + '='.repeat(50))

  if (budgetPassed) {
    console.log('✅ All performance budgets passed!')
  } else {
    console.log('⚠️  Some performance budgets exceeded — review recommendations above.')
  }
}

analyzeBundle()
