import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Test Runner
 * This file orchestrates all E2E tests and provides utilities for test execution
 */

export class E2ETestRunner {
  static async runAllTests() {
    console.log('Starting comprehensive E2E test suite...');
    
    // Test categories in order of importance
    const testCategories = [
      '01-core-functionality',
      '02-realtime-features', 
      '03-pwa-functionality',
      '04-accessibility-compliance',
      '05-performance-benchmarks',
      '06-mobile-gestures',
      '07-voice-interface',
      '08-intelligent-features',
      '09-complete-user-journeys'
    ];
    
    return testCategories;
  }
  
  static async validateTestEnvironment(page: any) {
    // Check if app is running
    try {
      await page.goto('/');
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      return true;
    } catch (error) {
      console.error('Test environment validation failed:', error);
      return false;
    }
  }
  
  static async setupTestData(page: any) {
    // Clear any existing test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Set up clean test environment
    await page.evaluate(() => {
      // Initialize app state for testing
      localStorage.setItem('testMode', 'true');
    });
  }
  
  static async cleanupTestData(page: any) {
    // Clean up after tests
    await page.evaluate(() => {
      // Remove test data but preserve user preferences if any
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('test') || key.includes('pnr') || key.includes('temp')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    });
  }
}

// Global test configuration
test.beforeAll(async () => {
  console.log('🚀 Starting E2E Test Suite');
  console.log('Testing modern PNR frontend application');
});

test.afterAll(async () => {
  console.log('✅ E2E Test Suite completed');
});

export default E2ETestRunner;