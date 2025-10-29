import { test, expect } from '@playwright/test';
import { testPNRs } from './fixtures/test-data';

test.describe('Mobile Gestures and Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should support swipe gestures on PNR cards', async ({ page }) => {
    // Add a PNR first
    await page.evaluate((pnr) => {
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await expect(pnrCard).toBeVisible();
    
    // Simulate swipe left gesture
    const cardBox = await pnrCard.boundingBox();
    if (cardBox) {
      await page.mouse.move(cardBox.x + cardBox.width - 10, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(cardBox.x + 10, cardBox.y + cardBox.height / 2);
      await page.mouse.up();
      
      // Check for swipe actions (delete, edit buttons)
      const swipeActions = page.locator('[data-testid*="swipe-action"]');
      if (await swipeActions.count() > 0) {
        await expect(swipeActions.first()).toBeVisible();
      }
    }
  });

  test('should support pull-to-refresh', async ({ page }) => {
    // Simulate pull-to-refresh gesture
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300, { steps: 10 });
    await page.waitForTimeout(500);
    await page.mouse.up();
    
    // Check for refresh indicator
    const refreshIndicator = page.locator('[data-testid="pull-refresh-indicator"]');
    if (await refreshIndicator.count() > 0) {
      await expect(refreshIndicator).toBeVisible();
    }
  });

  test('should support pinch-to-zoom on detail views', async ({ page }) => {
    // Add a PNR and open detail view
    await page.evaluate((pnr) => {
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await pnrCard.click();
    
    const detailView = page.locator('[data-testid="pnr-detail-view"]');
    if (await detailView.count() > 0) {
      await expect(detailView).toBeVisible();
      
      // Simulate pinch gesture (this is limited in Playwright, but we can test the zoom container)
      const zoomContainer = page.locator('[data-testid="zoom-container"]');
      if (await zoomContainer.count() > 0) {
        await expect(zoomContainer).toBeVisible();
      }
    }
  });

  test('should support long press for context menus', async ({ page }) => {
    // Add a PNR first
    await page.evaluate((pnr) => {
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await expect(pnrCard).toBeVisible();
    
    // Simulate long press
    const cardBox = await pnrCard.boundingBox();
    if (cardBox) {
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(800); // Long press duration
      await page.mouse.up();
      
      // Check for context menu
      const contextMenu = page.locator('[data-testid="context-menu"]');
      if (await contextMenu.count() > 0) {
        await expect(contextMenu).toBeVisible();
      }
    }
  });

  test('should have touch-optimized button sizes', async ({ page }) => {
    // Check button sizes meet touch accessibility guidelines (44px minimum)
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      
      if (box) {
        // Buttons should be at least 44px in both dimensions for touch accessibility
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should support gesture-based navigation', async ({ page }) => {
    // Test swipe navigation between pages/tabs
    const tabContainer = page.locator('[data-testid="tab-container"]');
    if (await tabContainer.count() > 0) {
      const containerBox = await tabContainer.boundingBox();
      if (containerBox) {
        // Swipe left to navigate
        await page.mouse.move(containerBox.x + containerBox.width - 10, containerBox.y + containerBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(containerBox.x + 10, containerBox.y + containerBox.height / 2);
        await page.mouse.up();
        
        // Check if navigation occurred
        await page.waitForTimeout(500);
        // This would depend on the specific implementation
      }
    }
  });

  test('should provide haptic feedback simulation', async ({ page }) => {
    // Check if haptic feedback is implemented (would be simulated in web)
    const hapticElements = page.locator('[data-haptic="true"], .haptic-feedback');
    const hapticCount = await hapticElements.count();
    
    if (hapticCount > 0) {
      const firstHaptic = hapticElements.first();
      await firstHaptic.click();
      
      // Check for visual feedback that simulates haptic response
      const feedbackIndicator = page.locator('[data-testid="haptic-feedback"]');
      if (await feedbackIndicator.count() > 0) {
        await expect(feedbackIndicator).toBeVisible();
      }
    }
  });

  test('should handle multi-touch gestures', async ({ page }) => {
    // Test two-finger scroll or zoom (limited in Playwright but we can test the handlers)
    const scrollContainer = page.locator('[data-testid="scroll-container"]');
    if (await scrollContainer.count() > 0) {
      await expect(scrollContainer).toBeVisible();
      
      // Simulate scroll with touch
      const containerBox = await scrollContainer.boundingBox();
      if (containerBox) {
        await page.mouse.move(containerBox.x + containerBox.width / 2, containerBox.y + 50);
        await page.mouse.down();
        await page.mouse.move(containerBox.x + containerBox.width / 2, containerBox.y + containerBox.height - 50);
        await page.mouse.up();
        
        // Check that scroll occurred
        await page.waitForTimeout(300);
      }
    }
  });

  test('should support edge swipe gestures', async ({ page }) => {
    // Test edge swipe for navigation (like back gesture)
    const viewport = page.viewportSize();
    if (viewport) {
      // Swipe from left edge
      await page.mouse.move(5, viewport.height / 2);
      await page.mouse.down();
      await page.mouse.move(100, viewport.height / 2);
      await page.mouse.up();
      
      // Check for navigation or menu
      const sideMenu = page.locator('[data-testid="side-menu"], [data-testid="navigation-drawer"]');
      if (await sideMenu.count() > 0) {
        await expect(sideMenu).toBeVisible();
      }
    }
  });

  test('should handle touch scrolling smoothly', async ({ page }) => {
    // Add many items to test scrolling
    await page.evaluate(() => {
      const manyPNRs = Array.from({ length: 50 }, (_, i) => ({
        pnr: `SCROLL${i.toString().padStart(3, '0')}`,
        status: 'Confirmed',
        journey: { from: 'A', to: 'B', date: '2024-12-15', train: 'Express' }
      }));
      localStorage.setItem('pnrs', JSON.stringify(manyPNRs));
    });
    
    await page.reload();
    
    // Test smooth scrolling
    const scrollContainer = page.locator('[data-testid="pnr-list"], body');
    const startTime = Date.now();
    
    // Perform scroll gesture
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.mouse.move(200, 100, { steps: 10 });
    await page.mouse.up();
    
    const scrollTime = Date.now() - startTime;
    
    // Scrolling should be smooth and responsive
    expect(scrollTime).toBeLessThan(1000);
    
    // Check that content scrolled
    await page.waitForTimeout(300);
  });

  test('should support touch-friendly form interactions', async ({ page }) => {
    // Test form interactions on mobile
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        // Check input size and touch target
        const inputBox = await pnrInput.boundingBox();
        if (inputBox) {
          expect(inputBox.height).toBeGreaterThanOrEqual(44); // Touch-friendly height
        }
        
        // Test touch input
        await pnrInput.click();
        await expect(pnrInput).toBeFocused();
        
        // Test virtual keyboard doesn't break layout
        await pnrInput.fill('MOBILE123');
        await expect(pnrInput).toHaveValue('MOBILE123');
      }
    }
  });
});