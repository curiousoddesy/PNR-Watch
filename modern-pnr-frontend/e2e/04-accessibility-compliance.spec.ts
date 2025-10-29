import { test, expect } from '@playwright/test';
import { AccessibilityHelper } from './utils/accessibility-helpers';

test.describe('Accessibility Compliance', () => {
  let a11yHelper: AccessibilityHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityHelper(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await a11yHelper.injectAxe();
  });

  test('should pass WCAG 2.1 AA compliance', async ({ page }) => {
    await a11yHelper.checkAccessibility({
      tags: ['wcag2a', 'wcag2aa']
    });
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    await a11yHelper.checkKeyboardNavigation();
    
    // Test tab order through main elements
    await page.keyboard.press('Tab'); // Should focus first interactive element
    const firstFocus = await page.locator(':focus');
    await expect(firstFocus).toBeVisible();
    
    // Continue tabbing through elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = await page.locator(':focus');
      await expect(currentFocus).toBeVisible();
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await a11yHelper.checkAriaLabels();
    
    // Check specific ARIA implementations
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent).toBeTruthy();
    }
  });

  test('should support screen readers', async ({ page }) => {
    await a11yHelper.checkScreenReaderContent();
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1); // Should have exactly one h1
    
    // Check for landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await a11yHelper.checkColorContrast();
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    
    // Check that content is still visible and accessible
    await a11yHelper.checkAccessibility();
    
    // Check specific high contrast elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check that animations are reduced or disabled
    const animatedElements = page.locator('[data-testid*="animation"], .animate-');
    const count = await animatedElements.count();
    
    if (count > 0) {
      // Check that animations respect reduced motion
      const firstAnimated = animatedElements.first();
      const animationDuration = await firstAnimated.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.animationDuration;
      });
      
      // Should be 0s or very short for reduced motion
      expect(animationDuration === '0s' || parseFloat(animationDuration) < 0.1).toBeTruthy();
    }
  });

  test('should have accessible forms', async ({ page }) => {
    // Find form elements
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      const form = forms.first();
      
      // Check form labels
      const inputs = form.locator('input, select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          
          // Input should have label, aria-label, or aria-labelledby
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    }
  });

  test('should have accessible error messages', async ({ page }) => {
    // Try to trigger form validation
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const submitButton = page.locator('[data-testid="submit-pnr"]');
      if (await submitButton.count() > 0) {
        await submitButton.click(); // Submit empty form to trigger validation
        
        // Check for accessible error messages
        const errorMessages = page.locator('[role="alert"], .error-message, [data-testid*="error"]');
        const errorCount = await errorMessages.count();
        
        if (errorCount > 0) {
          const firstError = errorMessages.first();
          await expect(firstError).toBeVisible();
          
          // Error should be associated with the input
          const ariaDescribedBy = await firstError.getAttribute('id');
          if (ariaDescribedBy) {
            const associatedInput = page.locator(`[aria-describedby="${ariaDescribedBy}"]`);
            await expect(associatedInput).toBeAttached();
          }
        }
      }
    }
  });

  test('should support focus management in modals', async ({ page }) => {
    // Open a modal if available
    const modalTrigger = page.locator('[data-testid*="modal"], [data-testid*="dialog"]');
    if (await modalTrigger.count() > 0) {
      await modalTrigger.first().click();
      
      // Check that focus is trapped in modal
      const modal = page.locator('[role="dialog"], [data-testid*="modal-content"]');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        
        // Focus should be in modal
        const focusedElement = page.locator(':focus');
        const isInModal = await focusedElement.evaluate((el, modalEl) => {
          return modalEl.contains(el);
        }, await modal.elementHandle());
        
        expect(isInModal).toBeTruthy();
      }
    }
  });

  test('should have accessible skip links', async ({ page }) => {
    // Check for skip links
    const skipLinks = page.locator('a[href^="#"]:has-text("skip"), .skip-link');
    const skipCount = await skipLinks.count();
    
    if (skipCount > 0) {
      const firstSkip = skipLinks.first();
      
      // Skip link should be focusable
      await firstSkip.focus();
      await expect(firstSkip).toBeFocused();
      
      // Should navigate to target when clicked
      const href = await firstSkip.getAttribute('href');
      if (href && href.startsWith('#')) {
        await firstSkip.click();
        const target = page.locator(href);
        if (await target.count() > 0) {
          await expect(target).toBeVisible();
        }
      }
    }
  });
});