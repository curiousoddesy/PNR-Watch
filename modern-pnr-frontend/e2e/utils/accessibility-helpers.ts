import { Page, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

export class AccessibilityHelper {
  constructor(private page: Page) {}

  async injectAxe() {
    await injectAxe(this.page);
  }

  async checkAccessibility(options?: {
    include?: string[];
    exclude?: string[];
    tags?: string[];
  }) {
    await checkA11y(this.page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      ...options
    });
  }

  async getAccessibilityViolations() {
    return await getViolations(this.page);
  }

  async checkKeyboardNavigation() {
    // Test tab navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Check if focus is visible
    const focusOutline = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });
    expect(focusOutline).toBeTruthy();
  }

  async checkAriaLabels() {
    // Check for interactive elements without accessible names
    const interactiveElements = await this.page.locator('button, input, select, textarea, [role="button"], [role="link"]').all();
    
    for (const element of interactiveElements) {
      const accessibleName = await element.getAttribute('aria-label') || 
                           await element.getAttribute('aria-labelledby') ||
                           await element.textContent();
      expect(accessibleName).toBeTruthy();
    }
  }

  async checkColorContrast() {
    // This would typically be handled by axe-core
    await this.checkAccessibility({ tags: ['wcag2aa'] });
  }

  async checkScreenReaderContent() {
    // Check for proper heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for skip links
    const skipLinks = await this.page.locator('a[href^="#"]').first();
    if (await skipLinks.count() > 0) {
      await expect(skipLinks).toHaveText(/skip/i);
    }
  }
}