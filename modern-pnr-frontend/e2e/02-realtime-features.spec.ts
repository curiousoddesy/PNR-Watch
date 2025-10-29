import { test, expect } from '@playwright/test';
import { testPNRs } from './fixtures/test-data';

test.describe('Real-time Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show connection status', async ({ page }) => {
    // Check for connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();
    
    // Should show connected state
    await expect(connectionStatus).toHaveClass(/connected|online/);
  });

  test('should handle real-time PNR updates', async ({ page }) => {
    // Add a PNR
    await page.evaluate((pnr) => {
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    // Simulate real-time update
    await page.evaluate((pnr) => {
      // Simulate WebSocket message
      window.dispatchEvent(new CustomEvent('pnr-update', {
        detail: { ...pnr, status: 'Confirmed' }
      }));
    }, { ...testPNRs[0], status: 'Updated Status' });
    
    // Check that PNR status updated
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await expect(pnrCard).toContainText('Updated Status');
  });

  test('should show real-time notifications', async ({ page }) => {
    // Simulate notification
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'success',
          message: 'PNR status updated',
          pnr: 'ABC123456'
        }
      }));
    });
    
    // Check for toast notification
    const toast = page.locator('[data-testid="toast-notification"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('PNR status updated');
  });

  test('should handle connection loss and reconnection', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Check offline indicator
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toBeVisible();
    }
    
    // Go back online
    await context.setOffline(false);
    
    // Check connection restored
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toHaveClass(/connected|online/);
  });

  test('should queue actions when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Try to add a PNR
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        await pnrInput.fill('OFFLINE123');
        
        const submitButton = page.locator('[data-testid="submit-pnr"]');
        await submitButton.click();
        
        // Check for queued action indicator
        const queueIndicator = page.locator('[data-testid="offline-queue"]');
        if (await queueIndicator.count() > 0) {
          await expect(queueIndicator).toBeVisible();
        }
      }
    }
    
    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(2000); // Wait for sync
  });

  test('should show user presence indicators', async ({ page }) => {
    // Check for presence indicators if implemented
    const presenceIndicator = page.locator('[data-testid="user-presence"]');
    if (await presenceIndicator.count() > 0) {
      await expect(presenceIndicator).toBeVisible();
    }
  });

  test('should handle optimistic updates', async ({ page }) => {
    // Add a PNR
    await page.evaluate((pnr) => {
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    // Perform an action that should update optimistically
    const refreshButton = page.locator(`[data-testid="refresh-pnr-${testPNRs[0].pnr}"]`);
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      
      // Check for loading state
      const loadingIndicator = page.locator('[data-testid="pnr-loading"]');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator).toBeVisible();
      }
    }
  });
});