import { Page, expect } from '@playwright/test';
import { performanceThresholds } from '../fixtures/test-data';

export class PerformanceHelper {
  constructor(private page: Page) {}

  async measureWebVitals() {
    const vitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {};
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          });
        }).observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            vitals.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Time to First Byte
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        vitals.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;

        setTimeout(() => resolve(vitals), 3000);
      });
    });

    return vitals;
  }

  async checkPerformanceThresholds() {
    const vitals = await this.measureWebVitals();
    
    if (vitals.fcp) {
      expect(vitals.fcp).toBeLessThan(performanceThresholds.fcp);
    }
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(performanceThresholds.lcp);
    }
    if (vitals.fid) {
      expect(vitals.fid).toBeLessThan(performanceThresholds.fid);
    }
    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(performanceThresholds.cls);
    }
    if (vitals.ttfb) {
      expect(vitals.ttfb).toBeLessThan(performanceThresholds.ttfb);
    }

    return vitals;
  }

  async measureBundleSize() {
    const resourceSizes = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources.map(resource => ({
        name: resource.name,
        size: resource.transferSize,
        type: resource.initiatorType
      }));
    });

    const jsSize = resourceSizes
      .filter(r => r.type === 'script')
      .reduce((total, r) => total + r.size, 0);

    const cssSize = resourceSizes
      .filter(r => r.type === 'link' && r.name.includes('.css'))
      .reduce((total, r) => total + r.size, 0);

    return { jsSize, cssSize, totalSize: jsSize + cssSize };
  }

  async checkMemoryUsage() {
    const memoryInfo = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (memoryInfo) {
      // Check that memory usage is reasonable (less than 50MB)
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    }

    return memoryInfo;
  }
}