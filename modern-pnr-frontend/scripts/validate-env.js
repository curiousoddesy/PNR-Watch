#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates required environment variables for production builds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required environment variables for production
const REQUIRED_VARS = [
  'VITE_API_URL',
  'VITE_SOCKET_URL',
  'VITE_ENVIRONMENT'
];

// Optional but recommended variables for production
const RECOMMENDED_VARS = [
  'VITE_SENTRY_DSN',
  'VITE_GA_ID',
  'VITE_BUILD_VERSION',
  'VITE_BUILD_TIMESTAMP'
];

// Netlify-specific variables (auto-generated, should not be manually set)
const NETLIFY_AUTO_VARS = [
  'NETLIFY',
  'COMMIT_REF',
  'BRANCH',
  'CONTEXT',
  'URL',
  'DEPLOY_URL',
  'DEPLOY_PRIME_URL'
];

// Production-specific feature flags that should be set correctly
const PRODUCTION_FEATURE_FLAGS = {
  'VITE_ENABLE_ANALYTICS': 'true',
  'VITE_DEV_TOOLS': 'false',
  'VITE_MOCK_API': 'false',
  'VITE_DEBUG': 'false'
};

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VITE_ENVIRONMENT === 'production';
  const isNetlify = process.env.NETLIFY === 'true';
  const context = process.env.CONTEXT || 'development';
  
  console.log(`🌍 Environment: ${process.env.VITE_ENVIRONMENT || 'development'}`);
  console.log(`🏗️  Build Context: ${context}`);
  console.log(`☁️  Netlify Build: ${isNetlify ? 'Yes' : 'No'}`);
  
  // Check required variables
  REQUIRED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName]}`);
    }
  });
  
  // Check recommended variables for production
  if (isProduction) {
    RECOMMENDED_VARS.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Missing recommended production variable: ${varName}`);
      } else {
        console.log(`✅ ${varName}: ${process.env[varName]}`);
      }
    });
  }
  
  // Validate production feature flags
  if (isProduction) {
    Object.entries(PRODUCTION_FEATURE_FLAGS).forEach(([varName, expectedValue]) => {
      const actualValue = process.env[varName];
      if (actualValue && actualValue !== expectedValue) {
        warnings.push(`Production flag ${varName} should be "${expectedValue}" but is "${actualValue}"`);
      } else if (actualValue === expectedValue) {
        console.log(`✅ ${varName}: ${actualValue} (production setting)`);
      }
    });
  }
  
  // Check Netlify auto-generated variables (informational)
  if (isNetlify) {
    console.log('\n🔧 Netlify Auto-Generated Variables:');
    NETLIFY_AUTO_VARS.forEach(varName => {
      if (process.env[varName]) {
        console.log(`   ${varName}: ${process.env[varName]}`);
      }
    });
  }
  
  // Validate URL formats
  const urlVars = ['VITE_API_URL', 'VITE_SOCKET_URL'];
  urlVars.forEach(varName => {
    if (process.env[varName]) {
      try {
        const url = new URL(process.env[varName]);
        
        // Additional validation for production
        if (isProduction && url.protocol === 'http:') {
          warnings.push(`${varName} uses HTTP in production. Consider using HTTPS for security.`);
        }
        
        // Validate WebSocket URL format
        if (varName === 'VITE_SOCKET_URL' && !['ws:', 'wss:', 'http:', 'https:'].includes(url.protocol)) {
          errors.push(`${varName} must use ws:, wss:, http:, or https: protocol`);
        }
        
      } catch (error) {
        errors.push(`Invalid ${varName} format: ${process.env[varName]}`);
      }
    }
  });
  
  // Environment-specific validations
  if (isProduction) {
    // Ensure production API URLs are HTTPS
    if (process.env.VITE_API_URL && !process.env.VITE_API_URL.startsWith('https://')) {
      warnings.push('Production API URL should use HTTPS for security');
    }
    
    // Ensure analytics is enabled in production
    if (process.env.VITE_ENABLE_ANALYTICS === 'false') {
      warnings.push('Consider enabling analytics in production (VITE_ENABLE_ANALYTICS=true)');
    }
  }
  
  // Display warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  // Handle errors
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`   ${error}`));
    
    if (isProduction && !isNetlify) {
      console.log('\n💡 For production builds, ensure all required environment variables are set in Netlify dashboard.');
      console.log('📖 See docs/ENVIRONMENT_VARIABLES.md for detailed setup instructions.');
      console.log('⚠️  Continuing with build for local testing purposes...');
    } else if (isProduction) {
      console.log('\n💡 For production builds, ensure all required environment variables are set in Netlify dashboard.');
      console.log('📖 See docs/ENVIRONMENT_VARIABLES.md for detailed setup instructions.');
      process.exit(1);
    } else {
      console.log('\n💡 For development, copy .env.example to .env and update the values.');
      console.log('📖 See docs/ENVIRONMENT_VARIABLES.md for detailed setup instructions.');
    }
  } else {
    console.log('\n✅ Environment validation passed!');
  }
  
  // Set build metadata if not provided
  if (!process.env.VITE_BUILD_VERSION) {
    process.env.VITE_BUILD_VERSION = process.env.COMMIT_REF || `dev-${Date.now()}`;
  }
  
  if (!process.env.VITE_BUILD_TIMESTAMP) {
    process.env.VITE_BUILD_TIMESTAMP = Date.now().toString();
  }
  
  console.log(`\n📦 Build Metadata:`);
  console.log(`   Version: ${process.env.VITE_BUILD_VERSION}`);
  console.log(`   Timestamp: ${process.env.VITE_BUILD_TIMESTAMP}`);
  console.log(`   Context: ${context}`);
  
  // Netlify-specific information
  if (isNetlify) {
    console.log(`\n☁️  Netlify Deployment Info:`);
    console.log(`   Site URL: ${process.env.URL || 'Not set'}`);
    console.log(`   Deploy URL: ${process.env.DEPLOY_URL || 'Not set'}`);
    console.log(`   Branch: ${process.env.BRANCH || 'Not set'}`);
    console.log(`   Commit: ${process.env.COMMIT_REF || 'Not set'}`);
  }
}

// Run validation
validateEnvironment();