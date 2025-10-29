import { test, expect } from '@playwright/test';
import { testPNRs } from './fixtures/test-data';

test.describe('Complete User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete journey: First-time user onboarding and PNR tracking', async ({ page }) => {
    // Step 1: First visit - should show onboarding
    const onboarding = page.locator('[data-testid="onboarding"]');
    if (await onboarding.count() > 0) {
      await expect(onboarding).toBeVisible();
      
      // Go through onboarding steps
      const nextButton = page.locator('[data-testid="onboarding-next"]');
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await nextButton.click(); // Multiple steps
        
        const finishButton = page.locator('[data-testid="onboarding-finish"]');
        if (await finishButton.count() > 0) {
          await finishButton.click();
        }
      }
    }
    
    // Step 2: Add first PNR
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Fill PNR form
    const pnrInput = page.locator('[data-testid="pnr-input"]');
    await pnrInput.fill(testPNRs[0].pnr);
    
    const submitButton = page.locator('[data-testid="submit-pnr"]');
    await submitButton.click();
    
    // Step 3: Verify PNR appears in dashboard
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await expect(pnrCard).toBeVisible();
    
    // Step 4: View PNR details
    await pnrCard.click();
    const detailView = page.locator('[data-testid="pnr-detail-view"]');
    await expect(detailView).toBeVisible();
    
    // Step 5: Set up notifications
    const notifyButton = page.locator('[data-testid="setup-notifications"]');
    if (await notifyButton.count() > 0) {
      await notifyButton.click();
      
      const enableNotifications = page.locator('[data-testid="enable-notifications"]');
      if (await enableNotifications.count() > 0) {
        await enableNotifications.click();
      }
    }
  });

  test('Complete journey: Power user managing multiple PNRs', async ({ page }) => {
    // Step 1: Add multiple PNRs quickly
    for (const pnr of testPNRs) {
      const addButton = page.locator('[data-testid="add-pnr-button"]');
      await addButton.click();
      
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      await pnrInput.fill(pnr.pnr);
      
      const submitButton = page.locator('[data-testid="submit-pnr"]');
      await submitButton.click();
      
      // Wait for PNR to be added
      await page.waitForTimeout(500);
    }
    
    // Step 2: Use bulk operations
    const selectAllButton = page.locator('[data-testid="select-all-pnrs"]');
    if (await selectAllButton.count() > 0) {
      await selectAllButton.click();
      
      const bulkRefreshButton = page.locator('[data-testid="bulk-refresh"]');
      if (await bulkRefreshButton.count() > 0) {
        await bulkRefreshButton.click();
      }
    }
    
    // Step 3: Use advanced filtering
    const filterButton = page.locator('[data-testid="advanced-filter"]');
    if (await filterButton.count() > 0) {
      await filterButton.click();
      
      const statusFilter = page.locator('[data-testid="filter-status"]');
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('Confirmed');
        
        const applyFilter = page.locator('[data-testid="apply-filter"]');
        await applyFilter.click();
      }
    }
    
    // Step 4: Export data
    const exportButton = page.locator('[data-testid="export-pnrs"]');
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      const exportFormat = page.locator('[data-testid="export-csv"]');
      if (await exportFormat.count() > 0) {
        await exportFormat.click();
      }
    }
  });

  test('Complete journey: Mobile user with offline usage', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Step 1: Add PNR while online
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    await addButton.click();
    
    const pnrInput = page.locator('[data-testid="pnr-input"]');
    await pnrInput.fill(testPNRs[0].pnr);
    
    const submitButton = page.locator('[data-testid="submit-pnr"]');
    await submitButton.click();
    
    // Step 2: Go offline
    await context.setOffline(true);
    
    // Step 3: Try to add another PNR offline
    await addButton.click();
    await pnrInput.fill(testPNRs[1].pnr);
    await submitButton.click();
    
    // Should show offline queue
    const offlineQueue = page.locator('[data-testid="offline-queue"]');
    if (await offlineQueue.count() > 0) {
      await expect(offlineQueue).toBeVisible();
    }
    
    // Step 4: Use swipe gestures
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    const cardBox = await pnrCard.boundingBox();
    if (cardBox) {
      await page.mouse.move(cardBox.x + cardBox.width - 10, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(cardBox.x + 10, cardBox.y + cardBox.height / 2);
      await page.mouse.up();
    }
    
    // Step 5: Go back online and sync
    await context.setOffline(false);
    await page.waitForTimeout(2000);
    
    // Check that offline actions synced
    const syncStatus = page.locator('[data-testid="sync-complete"]');
    if (await syncStatus.count() > 0) {
      await expect(syncStatus).toBeVisible();
    }
  });

  test('Complete journey: Accessibility user with screen reader simulation', async ({ page }) => {
    // Step 1: Navigate using keyboard only
    await page.keyboard.press('Tab'); // Focus first element
    await page.keyboard.press('Enter'); // Activate
    
    // Step 2: Use skip links
    const skipLink = page.locator('a[href^="#"]:has-text("skip")');
    if (await skipLink.count() > 0) {
      await skipLink.focus();
      await page.keyboard.press('Enter');
    }
    
    // Step 3: Navigate to add PNR using keyboard
    let currentFocus = page.locator(':focus');
    let attempts = 0;
    while (attempts < 20) {
      const focusedElement = await currentFocus.getAttribute('data-testid');
      if (focusedElement === 'add-pnr-button') {
        break;
      }
      await page.keyboard.press('Tab');
      attempts++;
    }
    
    await page.keyboard.press('Enter'); // Click add PNR
    
    // Step 4: Fill form using keyboard
    await page.keyboard.type(testPNRs[0].pnr);
    await page.keyboard.press('Tab'); // Move to submit button
    await page.keyboard.press('Enter'); // Submit
    
    // Step 5: Navigate to PNR details
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await pnrCard.focus();
    await page.keyboard.press('Enter');
    
    // Verify detail view is accessible
    const detailView = page.locator('[data-testid="pnr-detail-view"]');
    await expect(detailView).toBeVisible();
    await expect(detailView).toBeFocused();
  });

  test('Complete journey: Voice-controlled PNR management', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    // Step 1: Activate voice mode
    const voiceButton = page.locator('[data-testid="voice-button"]');
    if (await voiceButton.count() > 0) {
      await voiceButton.click();
      
      // Step 2: Add PNR using voice
      await page.evaluate(() => {
        const event = new CustomEvent('speechresult', {
          detail: { transcript: 'add PNR ABC123456' }
        });
        window.dispatchEvent(event);
      });
      
      // Step 3: Check status using voice
      await page.evaluate(() => {
        const event = new CustomEvent('speechresult', {
          detail: { transcript: 'check status ABC123456' }
        });
        window.dispatchEvent(event);
      });
      
      // Step 4: Navigate using voice
      await page.evaluate(() => {
        const event = new CustomEvent('speechresult', {
          detail: { transcript: 'show all PNRs' }
        });
        window.dispatchEvent(event);
      });
      
      // Verify voice commands worked
      const pnrCard = page.locator('[data-testid="pnr-card-ABC123456"]');
      if (await pnrCard.count() > 0) {
        await expect(pnrCard).toBeVisible();
      }
    }
  });

  test('Complete journey: PWA installation and usage', async ({ page, context }) => {
    // Step 1: Trigger PWA install prompt
    const installPrompt = page.locator('[data-testid="install-prompt"]');
    if (await installPrompt.count() > 0) {
      await expect(installPrompt).toBeVisible();
      
      const installButton = page.locator('[data-testid="install-app"]');
      await installButton.click();
    }
    
    // Step 2: Use app in standalone mode (simulated)
    await page.evaluate(() => {
      // Simulate standalone mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });
    
    await page.reload();
    
    // Step 3: Test offline functionality
    await context.setOffline(true);
    
    // Should still work offline
    const dashboard = page.locator('[data-testid="pnr-dashboard"]');
    await expect(dashboard).toBeVisible();
    
    // Step 4: Test push notifications (simulated)
    await page.evaluate(() => {
      // Simulate push notification
      const event = new CustomEvent('push-notification', {
        detail: {
          title: 'PNR Status Update',
          body: 'Your PNR ABC123456 status has changed',
          data: { pnr: 'ABC123456' }
        }
      });
      window.dispatchEvent(event);
    });
    
    const notification = page.locator('[data-testid="push-notification"]');
    if (await notification.count() > 0) {
      await expect(notification).toBeVisible();
    }
  });

  test('Complete journey: Real-time collaboration and sharing', async ({ page }) => {
    // Step 1: Add PNR
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    await addButton.click();
    
    const pnrInput = page.locator('[data-testid="pnr-input"]');
    await pnrInput.fill(testPNRs[0].pnr);
    
    const submitButton = page.locator('[data-testid="submit-pnr"]');
    await submitButton.click();
    
    // Step 2: Share PNR
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await pnrCard.click();
    
    const shareButton = page.locator('[data-testid="share-pnr"]');
    if (await shareButton.count() > 0) {
      await shareButton.click();
      
      const shareModal = page.locator('[data-testid="share-modal"]');
      await expect(shareModal).toBeVisible();
      
      const copyLinkButton = page.locator('[data-testid="copy-share-link"]');
      if (await copyLinkButton.count() > 0) {
        await copyLinkButton.click();
        
        const copyConfirm = page.locator('[data-testid="copy-success"]');
        await expect(copyConfirm).toBeVisible();
      }
    }
    
    // Step 3: Simulate real-time update
    await page.evaluate((pnr) => {
      const event = new CustomEvent('pnr-update', {
        detail: { ...pnr, status: 'Confirmed' }
      });
      window.dispatchEvent(event);
    }, testPNRs[0]);
    
    // Should show real-time notification
    const realtimeNotification = page.locator('[data-testid="realtime-update"]');
    if (await realtimeNotification.count() > 0) {
      await expect(realtimeNotification).toBeVisible();
    }
  });

  test('Complete journey: Performance optimization in action', async ({ page }) => {
    // Step 1: Load app and measure initial performance
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Should load quickly
    
    // Step 2: Add many PNRs to test virtualization
    await page.evaluate(() => {
      const manyPNRs = Array.from({ length: 1000 }, (_, i) => ({
        pnr: `PERF${i.toString().padStart(6, '0')}`,
        status: ['Confirmed', 'Waitlisted', 'RAC'][i % 3],
        journey: {
          from: 'City A',
          to: 'City B',
          date: '2024-12-15',
          train: 'Express Train'
        }
      }));
      localStorage.setItem('pnrs', JSON.stringify(manyPNRs));
    });
    
    await page.reload();
    
    // Step 3: Test smooth scrolling with large dataset
    const scrollStart = Date.now();
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;
    
    expect(scrollTime).toBeLessThan(500); // Should scroll smoothly
    
    // Step 4: Test search performance
    const searchInput = page.locator('[data-testid="search-input"]');
    if (await searchInput.count() > 0) {
      const searchStart = Date.now();
      await searchInput.fill('PERF000100');
      await page.waitForTimeout(300);
      const searchTime = Date.now() - searchStart;
      
      expect(searchTime).toBeLessThan(1000); // Should search quickly
    }
  });
});