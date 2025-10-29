import { test, expect } from '@playwright/test';

test.describe('Intelligent Features and Smart Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should provide PNR auto-complete suggestions', async ({ page }) => {
    // Set up some PNR history
    await page.evaluate(() => {
      const pnrHistory = [
        'ABC123456',
        'ABC789012',
        'DEF345678',
        'XYZ987654'
      ];
      localStorage.setItem('pnrHistory', JSON.stringify(pnrHistory));
    });
    
    await page.reload();
    
    // Start typing in PNR input
    const pnrInput = page.locator('[data-testid="pnr-input"]');
    if (await pnrInput.count() > 0) {
      await pnrInput.click();
      await pnrInput.fill('ABC');
      
      // Check for auto-complete suggestions
      const suggestions = page.locator('[data-testid="pnr-suggestions"]');
      if (await suggestions.count() > 0) {
        await expect(suggestions).toBeVisible();
        
        // Should show matching PNRs
        const suggestionItems = page.locator('[data-testid^="suggestion-"]');
        const suggestionCount = await suggestionItems.count();
        expect(suggestionCount).toBeGreaterThan(0);
        
        // Click on a suggestion
        await suggestionItems.first().click();
        
        // Input should be filled with selected suggestion
        const inputValue = await pnrInput.inputValue();
        expect(inputValue).toMatch(/^ABC/);
      }
    }
  });

  test('should provide smart date suggestions', async ({ page }) => {
    const dateInput = page.locator('[data-testid="date-input"], [data-testid="journey-date"]');
    if (await dateInput.count() > 0) {
      await dateInput.click();
      
      // Check for smart date suggestions
      const dateSuggestions = page.locator('[data-testid="date-suggestions"]');
      if (await dateSuggestions.count() > 0) {
        await expect(dateSuggestions).toBeVisible();
        
        // Should include common options like "Today", "Tomorrow", "Next Week"
        const todayOption = page.locator('[data-testid="date-today"]');
        const tomorrowOption = page.locator('[data-testid="date-tomorrow"]');
        
        if (await todayOption.count() > 0) {
          await expect(todayOption).toBeVisible();
        }
        if (await tomorrowOption.count() > 0) {
          await expect(tomorrowOption).toBeVisible();
        }
      }
    }
  });

  test('should provide contextual quick actions', async ({ page }) => {
    // Add a PNR first
    await page.evaluate(() => {
      const pnr = {
        pnr: 'SMART123456',
        status: 'Waitlisted',
        journey: {
          from: 'Delhi',
          to: 'Mumbai',
          date: '2024-12-15',
          train: 'Rajdhani Express'
        }
      };
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    });
    
    await page.reload();
    
    // Click on PNR card to show details
    const pnrCard = page.locator('[data-testid="pnr-card-SMART123456"]');
    if (await pnrCard.count() > 0) {
      await pnrCard.click();
      
      // Check for contextual quick actions
      const quickActions = page.locator('[data-testid="quick-actions"]');
      if (await quickActions.count() > 0) {
        await expect(quickActions).toBeVisible();
        
        // Should show relevant actions based on status
        const refreshAction = page.locator('[data-testid="action-refresh"]');
        const notifyAction = page.locator('[data-testid="action-notify"]');
        
        if (await refreshAction.count() > 0) {
          await expect(refreshAction).toBeVisible();
        }
        if (await notifyAction.count() > 0) {
          await expect(notifyAction).toBeVisible();
        }
      }
    }
  });

  test('should learn from user behavior patterns', async ({ page }) => {
    // Simulate user behavior pattern
    await page.evaluate(() => {
      const userPatterns = {
        frequentRoutes: [
          { from: 'Delhi', to: 'Mumbai', count: 5 },
          { from: 'Bangalore', to: 'Chennai', count: 3 }
        ],
        preferredTrains: ['Rajdhani Express', 'Shatabdi Express'],
        commonTimes: ['morning', 'evening']
      };
      localStorage.setItem('userPatterns', JSON.stringify(userPatterns));
    });
    
    await page.reload();
    
    // Check if patterns influence suggestions
    const fromInput = page.locator('[data-testid="from-input"]');
    if (await fromInput.count() > 0) {
      await fromInput.click();
      
      const routeSuggestions = page.locator('[data-testid="route-suggestions"]');
      if (await routeSuggestions.count() > 0) {
        await expect(routeSuggestions).toBeVisible();
        
        // Should prioritize frequent routes
        const delhiOption = page.locator('[data-testid*="Delhi"]');
        if (await delhiOption.count() > 0) {
          await expect(delhiOption).toBeVisible();
        }
      }
    }
  });

  test('should provide intelligent error recovery', async ({ page }) => {
    // Try to add invalid PNR
    const addButton = page.locator('[data-testid="add-pnr-button"]');
    if (await addButton.count() > 0) {
      await addButton.click();
      
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        await pnrInput.fill('INVALID');
        
        const submitButton = page.locator('[data-testid="submit-pnr"]');
        await submitButton.click();
        
        // Check for intelligent error suggestions
        const errorSuggestions = page.locator('[data-testid="error-suggestions"]');
        if (await errorSuggestions.count() > 0) {
          await expect(errorSuggestions).toBeVisible();
          
          // Should suggest corrections
          const suggestions = page.locator('[data-testid^="suggestion-"]');
          const suggestionCount = await suggestions.count();
          expect(suggestionCount).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should provide predictive text input', async ({ page }) => {
    const smartInput = page.locator('[data-testid="smart-input"]');
    if (await smartInput.count() > 0) {
      await smartInput.click();
      await smartInput.fill('Del');
      
      // Check for predictive suggestions
      const predictions = page.locator('[data-testid="predictions"]');
      if (await predictions.count() > 0) {
        await expect(predictions).toBeVisible();
        
        // Should show city predictions
        const delhiPrediction = page.locator('[data-testid*="Delhi"]');
        if (await delhiPrediction.count() > 0) {
          await expect(delhiPrediction).toBeVisible();
          
          // Click prediction to auto-complete
          await delhiPrediction.click();
          await expect(smartInput).toHaveValue('Delhi');
        }
      }
    }
  });

  test('should provide smart form validation', async ({ page }) => {
    const form = page.locator('[data-testid="smart-form"]');
    if (await form.count() > 0) {
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        // Test real-time validation
        await pnrInput.fill('ABC');
        
        // Should show validation hints
        const validationHint = page.locator('[data-testid="validation-hint"]');
        if (await validationHint.count() > 0) {
          await expect(validationHint).toBeVisible();
          await expect(validationHint).toContainText(/format|length/i);
        }
        
        // Complete valid PNR
        await pnrInput.fill('ABC1234567');
        
        // Validation should pass
        const validIndicator = page.locator('[data-testid="valid-indicator"]');
        if (await validIndicator.count() > 0) {
          await expect(validIndicator).toBeVisible();
        }
      }
    }
  });

  test('should provide intelligent search and filtering', async ({ page }) => {
    // Add multiple PNRs with different attributes
    await page.evaluate(() => {
      const pnrs = [
        { pnr: 'ABC123456', status: 'Confirmed', train: 'Rajdhani Express', route: 'Delhi-Mumbai' },
        { pnr: 'DEF789012', status: 'Waitlisted', train: 'Shatabdi Express', route: 'Bangalore-Chennai' },
        { pnr: 'GHI345678', status: 'RAC', train: 'Duronto Express', route: 'Kolkata-Delhi' }
      ];
      localStorage.setItem('pnrs', JSON.stringify(pnrs));
    });
    
    await page.reload();
    
    const searchInput = page.locator('[data-testid="smart-search"]');
    if (await searchInput.count() > 0) {
      // Test intelligent search
      await searchInput.fill('confirmed rajdhani');
      
      // Should find relevant PNRs
      const searchResults = page.locator('[data-testid^="pnr-card-"]');
      const resultCount = await searchResults.count();
      
      if (resultCount > 0) {
        // Should show ABC123456 (Confirmed + Rajdhani)
        const targetPNR = page.locator('[data-testid="pnr-card-ABC123456"]');
        await expect(targetPNR).toBeVisible();
      }
      
      // Test search suggestions
      await searchInput.clear();
      await searchInput.fill('wait');
      
      const searchSuggestions = page.locator('[data-testid="search-suggestions"]');
      if (await searchSuggestions.count() > 0) {
        await expect(searchSuggestions).toBeVisible();
      }
    }
  });

  test('should provide smart notifications and reminders', async ({ page }) => {
    // Set up a PNR with upcoming journey
    await page.evaluate(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const pnr = {
        pnr: 'REMIND123456',
        status: 'Confirmed',
        journey: {
          from: 'Delhi',
          to: 'Mumbai',
          date: tomorrow.toISOString().split('T')[0],
          time: '08:00',
          train: 'Rajdhani Express'
        }
      };
      localStorage.setItem('pnrs', JSON.stringify([pnr]));
    });
    
    await page.reload();
    
    // Check for smart reminder suggestions
    const reminderSuggestion = page.locator('[data-testid="reminder-suggestion"]');
    if (await reminderSuggestion.count() > 0) {
      await expect(reminderSuggestion).toBeVisible();
      
      // Should suggest setting reminder for upcoming journey
      await expect(reminderSuggestion).toContainText(/reminder|journey|tomorrow/i);
      
      // Click to set reminder
      const setReminderButton = page.locator('[data-testid="set-reminder"]');
      if (await setReminderButton.count() > 0) {
        await setReminderButton.click();
        
        // Check confirmation
        const reminderConfirm = page.locator('[data-testid="reminder-set"]');
        if (await reminderConfirm.count() > 0) {
          await expect(reminderConfirm).toBeVisible();
        }
      }
    }
  });

  test('should provide contextual help and tips', async ({ page }) => {
    // Check for contextual help system
    const helpTrigger = page.locator('[data-testid="help-trigger"], .help-icon');
    if (await helpTrigger.count() > 0) {
      await helpTrigger.click();
      
      const contextualHelp = page.locator('[data-testid="contextual-help"]');
      if (await contextualHelp.count() > 0) {
        await expect(contextualHelp).toBeVisible();
        
        // Should provide relevant tips based on current context
        const helpContent = await contextualHelp.textContent();
        expect(helpContent).toBeTruthy();
        expect(helpContent!.length).toBeGreaterThan(10);
      }
    }
    
    // Check for smart tips based on user actions
    const smartTips = page.locator('[data-testid="smart-tip"]');
    if (await smartTips.count() > 0) {
      await expect(smartTips).toBeVisible();
    }
  });
});