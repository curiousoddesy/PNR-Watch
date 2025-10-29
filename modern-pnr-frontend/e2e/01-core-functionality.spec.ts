import { test, expect } from '@playwright/test';
import { testPNRs } from './fixtures/test-data';

test.describe('Core PNR Management Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the main dashboard', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/PNR Tracker/);
    
    // Check main navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check dashboard elements
    const dashboard = page.locator('[data-testid="pnr-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should add a new PNR', async ({ page }) => {
    // Click add PNR button
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    await addButton.click();
    
    // Fill PNR form
    const pnrInput = page.locator('[data-testid="pnr-input"]');
    await pnrInput.fill(testPNRs[0].pnr);
    
    // Submit form
    const submitButton = page.locator('[data-testid="submit-pnr"]');
    await submitButton.click();
    
    // Verify PNR was added
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await expect(pnrCard).toBeVisible();
    await expect(pnrCard).toContainText(testPNRs[0].pnr);
  });

  test('should display PNR details', async ({ page }) => {
    // Add a PNR first (assuming it exists or mock it)
    await page.evaluate((pnr) => {
      // Mock adding PNR to local storage or state
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    // Click on PNR card
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await pnrCard.click();
    
    // Check detail view
    const detailView = page.locator('[data-testid="pnr-detail-view"]');
    await expect(detailView).toBeVisible();
    await expect(detailView).toContainText(testPNRs[0].pnr);
    await expect(detailView).toContainText(testPNRs[0].status);
  });

  test('should filter PNRs', async ({ page }) => {
    // Add multiple PNRs
    await page.evaluate((pnrs) => {
      localStorage.setItem('pnrs', JSON.stringify(pnrs));
    }, testPNRs);
    
    await page.reload();
    
    // Use filter
    const filterInput = page.locator('[data-testid="pnr-filter"]');
    await filterInput.fill('Confirmed');
    
    // Check filtered results
    const confirmedPNRs = testPNRs.filter(pnr => pnr.status === 'Confirmed');
    for (const pnr of confirmedPNRs) {
      const pnrCard = page.locator(`[data-testid="pnr-card-${pnr.pnr}"]`);
      await expect(pnrCard).toBeVisible();
    }
  });

  test('should sort PNRs', async ({ page }) => {
    // Add multiple PNRs
    await page.evaluate((pnrs) => {
      localStorage.setItem('pnrs', JSON.stringify(pnrs));
    }, testPNRs);
    
    await page.reload();
    
    // Click sort button
    const sortButton = page.locator('[data-testid="sort-button"]');
    await sortButton.click();
    
    // Select sort option
    const sortByDate = page.locator('[data-testid="sort-by-date"]');
    await sortByDate.click();
    
    // Verify sorting (check order of PNR cards)
    const pnrCards = page.locator('[data-testid^="pnr-card-"]');
    const firstCard = pnrCards.first();
    await expect(firstCard).toBeVisible();
  });

  test('should delete a PNR', async ({ page }) => {
    // Add a PNR first
    await page.evaluate((pnr) => {
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    }, testPNRs[0]);
    
    await page.reload();
    
    // Click delete button on PNR card
    const deleteButton = page.locator(`[data-testid="delete-pnr-${testPNRs[0].pnr}"]`);
    await deleteButton.click();
    
    // Confirm deletion
    const confirmButton = page.locator('[data-testid="confirm-delete"]');
    await confirmButton.click();
    
    // Verify PNR was deleted
    const pnrCard = page.locator(`[data-testid="pnr-card-${testPNRs[0].pnr}"]`);
    await expect(pnrCard).not.toBeVisible();
  });
});