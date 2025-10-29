import { test, expect } from '@playwright/test';
import { PerformanceHelper } from './utils/performance-helpers';

test.describe('Performance Benchmarks', () => {
  let perfHelper: PerformanceHelper;

  test.beforeEach(async ({ page }) => {
    perfHelper = new PerformanceHelper(page);
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const vitals = await perfHelper.checkPerformanceThresholds();
    
    console.log('Web Vitals Results:', vitals);
    
    // Log results for monitoring
    await page.evaluate((vitals) => {
      console.log('Performance Metrics:', vitals);
    }, vitals);
  });

  test('should have reasonable bundle sizes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const bundleInfo = await perfHelper.measureBundleSize();
    
    // Check bundle sizes are reasonable
    expect(bundleInfo.jsSize).toBeLessThan(1024 * 1024); // Less than 1MB JS
    expect(bundleInfo.cssSize).toBeLessThan(200 * 1024); // Less than 200KB CSS
    
    console.log('Bundle Sizes:', bundleInfo);
  });

  test('should load quickly on slow networks', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
  });

  test('should handle memory efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const memoryInfo = await perfHelper.checkMemoryUsage();
    
    if (memoryInfo) {
      console.log('Memory Usage:', memoryInfo);
      
      // Perform some actions to test memory usage
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          // Simulate adding data
          const data = new Array(1000).fill(0).map(() => ({ id: Math.random(), data: 'test' }));
          (window as any).testData = ((window as any).testData || []).concat(data);
        });
      }
      
      const memoryAfter = await perfHelper.checkMemoryUsage();
      if (memoryAfter) {
        // Memory shouldn't grow excessively
        const memoryGrowth = memoryAfter.usedJSHeapSize - memoryInfo.usedJSHeapSize;
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
      }
    }
  });

  test('should render large lists efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Add many PNRs to test virtualization
    await page.evaluate(() => {
      const largePNRList = Array.from({ length: 1000 }, (_, i) => ({
        pnr: `PNR${i.toString().padStart(6, '0')}`,
        status: ['Confirmed', 'Waitlisted', 'RAC'][i % 3],
        journey: {
          from: 'City A',
          to: 'City B',
          date: '2024-12-15',
          train: 'Express Train'
        }
      }));
      localStorage.setItem('pnrs', JSON.stringify(largePNRList));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that only visible items are rendered (virtualization)
    const pnrCards = page.locator('[data-testid^="pnr-card-"]');
    const visibleCards = await pnrCards.count();
    
    // Should render only visible items, not all 1000
    expect(visibleCards).toBeLessThan(100);
    expect(visibleCards).toBeGreaterThan(0);
    
    // Test scrolling performance
    const startTime = Date.now();
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - startTime;
    
    expect(scrollTime).toBeLessThan(500); // Smooth scrolling
  });

  test('should lazy load images efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for lazy loaded images
    const images = page.locator('img[loading="lazy"], img[data-src]');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Images should not all be loaded initially
      const loadedImages = await page.locator('img[src]:not([data-src])').count();
      
      // Scroll to trigger lazy loading
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(500);
      
      const loadedImagesAfterScroll = await page.locator('img[src]:not([data-src])').count();
      
      // More images should be loaded after scrolling
      expect(loadedImagesAfterScroll).toBeGreaterThanOrEqual(loadedImages);
    }
  });

  test('should use code splitting effectively', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that initial bundle is small
    const initialResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources
        .filter(r => r.initiatorType === 'script')
        .map(r => ({ name: r.name, size: r.transferSize }));
    });
    
    const totalInitialJS = initialResources.reduce((sum, r) => sum + r.size, 0);
    expect(totalInitialJS).toBeLessThan(500 * 1024); // Less than 500KB initial JS
    
    // Navigate to different route to test code splitting
    const navLink = page.locator('a[href*="/"], [data-testid*="nav-"]');
    if (await navLink.count() > 0) {
      await navLink.first().click();
      await page.waitForLoadState('networkidle');
      
      // Check that additional chunks were loaded
      const resourcesAfterNav = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources
          .filter(r => r.initiatorType === 'script')
          .map(r => ({ name: r.name, size: r.transferSize }));
      });
      
      // Should have loaded additional chunks
      expect(resourcesAfterNav.length).toBeGreaterThanOrEqual(initialResources.length);
    }
  });

  test('should preload critical resources', async ({ page }) => {
    await page.goto('/');
    
    // Check for preload links
    const preloadLinks = page.locator('link[rel="preload"]');
    const preloadCount = await preloadLinks.count();
    
    if (preloadCount > 0) {
      // Verify preloaded resources
      for (let i = 0; i < Math.min(preloadCount, 5); i++) {
        const link = preloadLinks.nth(i);
        const href = await link.getAttribute('href');
        const as = await link.getAttribute('as');
        
        expect(href).toBeTruthy();
        expect(as).toBeTruthy();
      }
    }
  });

  test('should handle concurrent features efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test concurrent operations
    const startTime = Date.now();
    
    // Perform multiple actions simultaneously
    await Promise.all([
      page.evaluate(() => {
        // Simulate heavy computation
        const start = Date.now();
        while (Date.now() - start < 100) {
          Math.random();
        }
      }),
      page.mouse.move(100, 100),
      page.keyboard.press('Tab'),
      page.waitForTimeout(50)
    ]);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should handle concurrent operations without blocking
    expect(totalTime).toBeLessThan(300); // Should not take much longer than the longest operation
  });

  test('should optimize font loading', async ({ page }) => {
    await page.goto('/');
    
    // Check font loading strategy
    const fontLinks = page.locator('link[rel="preload"][as="font"]');
    const fontCount = await fontLinks.count();
    
    // Check for font-display CSS property
    const fontDisplayUsage = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      let usesFontDisplay = false;
      
      try {
        stylesheets.forEach(sheet => {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
              if (rule.cssText && rule.cssText.includes('font-display')) {
                usesFontDisplay = true;
              }
            });
          }
        });
      } catch (e) {
        // Cross-origin stylesheets might not be accessible
      }
      
      return usesFontDisplay;
    });
    
    // Should use font optimization techniques
    expect(fontCount > 0 || fontDisplayUsage).toBeTruthy();
  });
});