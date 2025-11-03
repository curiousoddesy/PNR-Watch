#!/usr/bin/env node

/**
 * Build Verification Script
 * Verifies that the build artifacts are properly generated
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const REQUIRED_FILES = [
  'index.html',
  'assets'
];

function verifyBuild() {
  console.log('🔍 Verifying build artifacts...');
  
  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Build directory not found:', DIST_DIR);
    process.exit(1);
  }
  
  console.log('✅ Build directory exists:', DIST_DIR);
  
  // Check required files
  const errors = [];
  
  REQUIRED_FILES.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file/directory: ${file}`);
    } else {
      console.log(`✅ Found: ${file}`);
    }
  });
  
  // Check for JavaScript and CSS assets
  const assetsDir = path.join(DIST_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    const jsFiles = assets.filter(file => file.endsWith('.js'));
    const cssFiles = assets.filter(file => file.endsWith('.css'));
    
    if (jsFiles.length === 0) {
      errors.push('No JavaScript files found in assets directory');
    } else {
      console.log(`✅ Found ${jsFiles.length} JavaScript files`);
    }
    
    if (cssFiles.length === 0) {
      console.log('⚠️  No CSS files found in assets directory (this might be expected)');
    } else {
      console.log(`✅ Found ${cssFiles.length} CSS files`);
    }
  }
  
  // Check index.html content
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (!indexContent.includes('<script')) {
      errors.push('index.html does not contain script tags');
    } else {
      console.log('✅ index.html contains script references');
    }
  }
  
  // Calculate build size
  try {
    const stats = getDirectorySize(DIST_DIR);
    console.log(`📦 Total build size: ${formatBytes(stats.size)}`);
    console.log(`📁 Total files: ${stats.files}`);
    
    // Warn if build is too large
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      console.log('⚠️  Build size is quite large (>10MB). Consider optimizing assets.');
    }
  } catch (error) {
    console.log('⚠️  Could not calculate build size:', error.message);
  }
  
  // Handle errors
  if (errors.length > 0) {
    console.log('\n❌ Build verification failed:');
    errors.forEach(error => console.log(`   ${error}`));
    process.exit(1);
  } else {
    console.log('\n✅ Build verification passed! Ready for deployment.');
  }
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  let totalFiles = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        calculateSize(path.join(currentPath, file));
      });
    } else {
      totalSize += stats.size;
      totalFiles++;
    }
  }
  
  calculateSize(dirPath);
  return { size: totalSize, files: totalFiles };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run verification
verifyBuild();