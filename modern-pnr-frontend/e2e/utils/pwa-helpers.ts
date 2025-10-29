import { Page, expect, BrowserContext } from '@playwright/test';

export class PWAHelper {
  constructor(private page: Page, private context: BrowserContext) {}

  async checkServiceWorkerRegistration() {
    const swRegistration = await this.page.evaluate(() => {
      return navigator.serviceWorker.getRegistration();
    });
    expect(swRegistration).toBeTruthy();
  }

  async checkManifest() {
    const manifestLink = await this.page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();
    
    const manifestUrl = await manifestLink.getAttribute('href');
    expect(manifestUrl).toBeTruthy();
    
    // Fetch and validate manifest
    const manifestResponse = await this.page.request.get(manifestUrl!);
    expect(manifestResponse.status()).toBe(200);
    
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  }

  async checkOfflineCapability() {
    // Go offline
    await this.context.setOffline(true);
    
    // Navigate to a cached page
    await this.page.reload();
    
    // Check that the page still loads
    await expect(this.page.locator('body')).toBeVisible();
    
    // Check for offline indicator
    const offlineIndicator = this.page.locator('[data-testid="offline-indicator"]');
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toBeVisible();
    }
    
    // Go back online
    await this.context.setOffline(false);
  }

  async checkInstallPrompt() {
    // Trigger install prompt (this would need to be implemented in the app)
    const installButton = this.page.locator('[data-testid="install-button"]');
    if (await installButton.count() > 0) {
      await expect(installButton).toBeVisible();
    }
  }

  async checkCacheStrategy() {
    // Check that resources are cached
    const cacheNames = await this.page.evaluate(async () => {
      return await caches.keys();
    });
    expect(cacheNames.length).toBeGreaterThan(0);
    
    // Check specific cache entries
    const cachedResources = await this.page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const cache = await caches.open(cacheNames[0]);
      const requests = await cache.keys();
      return requests.map(req => req.url);
    });
    
    expect(cachedResources.length).toBeGreaterThan(0);
  }

  async checkPushNotificationSupport() {
    const pushSupport = await this.page.evaluate(() => {
      return 'PushManager' in window && 'serviceWorker' in navigator;
    });
    expect(pushSupport).toBeTruthy();
  }

  async simulateOfflineActions() {
    // Go offline
    await this.context.setOffline(true);
    
    // Try to perform an action (like adding a PNR)
    const addButton = this.page.locator('[data-testid="add-pnr-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      // Fill form if it exists
      const pnrInput = this.page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        await pnrInput.fill('TEST123456');
        
        const submitButton = this.page.locator('[data-testid="submit-pnr"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          
          // Check for offline queue indicator
          const queueIndicator = this.page.locator('[data-testid="offline-queue"]');
          if (await queueIndicator.count() > 0) {
            await expect(queueIndicator).toBeVisible();
          }
        }
      }
    }
    
    // Go back online and check sync
    await this.context.setOffline(false);
    await this.page.waitForTimeout(2000); // Wait for sync
  }
}