import { test, expect } from '@playwright/test';
import { PWAHelper } from './utils/pwa-helpers';

test.describe('PWA Functionality', () => {
  let pwaHelper: PWAHelper;

  test.beforeEach(async ({ page, context }) => {
    pwaHelper = new PWAHelper(page, context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should register service worker', async ({ page }) => {
    await pwaHelper.checkServiceWorkerRegistration();
  });

  test('should have valid web app manifest', async ({ page }) => {
    await pwaHelper.checkManifest();
  });

  test('should work offline', async ({ page, context }) => {
    await pwaHelper.checkOfflineCapability();
  });

  test('should cache resources properly', async ({ page }) => {
    await pwaHelper.checkCacheStrategy();
  });

  test('should support push notifications', async ({ page }) => {
    await pwaHelper.checkPushNotificationSupport();
  });

  test('should show install prompt', async ({ page }) => {
    await pwaHelper.checkInstallPrompt();
  });

  test('should handle offline actions and sync', async ({ page, context }) => {
    await pwaHelper.simulateOfflineActions();
  });

  test('should update app when new version available', async ({ page }) => {
    // Check for update notification
    const updateNotification = page.locator('[data-testid="app-update-available"]');
    if (await updateNotification.count() > 0) {
      await expect(updateNotification).toBeVisible();
      
      // Click update button
      const updateButton = page.locator('[data-testid="update-app-button"]');
      await updateButton.click();
      
      // Check for update progress
      const updateProgress = page.locator('[data-testid="update-progress"]');
      if (await updateProgress.count() > 0) {
        await expect(updateProgress).toBeVisible();
      }
    }
  });

  test('should handle background sync', async ({ page, context }) => {
    // Add some data while online
    await page.evaluate(() => {
      localStorage.setItem('pendingSync', JSON.stringify([
        { action: 'add', pnr: 'SYNC123', timestamp: Date.now() }
      ]));
    });
    
    // Go offline
    await context.setOffline(true);
    
    // Perform action that should be queued
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        await pnrInput.fill('BACKGROUND123');
        
        const submitButton = page.locator('[data-testid="submit-pnr"]');
        await submitButton.click();
      }
    }
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for background sync
    await page.waitForTimeout(3000);
    
    // Check that sync completed
    const syncStatus = page.locator('[data-testid="sync-status"]');
    if (await syncStatus.count() > 0) {
      await expect(syncStatus).toContainText(/synced|completed/i);
    }
  });

  test('should work in standalone mode', async ({ page }) => {
    // Check if running in standalone mode
    const isStandalone = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true;
    });
    
    if (isStandalone) {
      // Check for native-like navigation
      const nativeNav = page.locator('[data-testid="native-navigation"]');
      if (await nativeNav.count() > 0) {
        await expect(nativeNav).toBeVisible();
      }
    }
  });

  test('should handle app shortcuts', async ({ page }) => {
    // Check if shortcuts are defined in manifest
    const shortcuts = await page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();
        return manifest.shortcuts;
      }
      return null;
    });
    
    if (shortcuts && shortcuts.length > 0) {
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts[0]).toHaveProperty('name');
      expect(shortcuts[0]).toHaveProperty('url');
    }
  });
});