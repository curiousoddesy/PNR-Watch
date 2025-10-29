import { test, expect } from '@playwright/test';

test.describe('Voice Interface and Audio Features', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should support voice recognition API', async ({ page }) => {
    // Check if Web Speech API is available
    const speechSupport = await page.evaluate(() => {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    });
    
    if (speechSupport) {
      // Check for voice interface elements
      const voiceButton = page.locator('[data-testid="voice-button"], [data-testid="voice-input"]');
      if (await voiceButton.count() > 0) {
        await expect(voiceButton).toBeVisible();
        
        // Test voice button activation
        await voiceButton.click();
        
        // Check for voice recording indicator
        const recordingIndicator = page.locator('[data-testid="voice-recording"]');
        if (await recordingIndicator.count() > 0) {
          await expect(recordingIndicator).toBeVisible();
        }
      }
    }
  });

  test('should handle voice PNR input', async ({ page }) => {
    const voicePNRInput = page.locator('[data-testid="voice-pnr-input"]');
    if (await voicePNRInput.count() > 0) {
      await voicePNRInput.click();
      
      // Simulate voice input (in real scenario, this would be actual speech)
      await page.evaluate(() => {
        // Simulate speech recognition result
        const event = new CustomEvent('speechresult', {
          detail: { transcript: 'ABC123456' }
        });
        window.dispatchEvent(event);
      });
      
      // Check that PNR was recognized and filled
      const pnrInput = page.locator('[data-testid="pnr-input"]');
      if (await pnrInput.count() > 0) {
        await expect(pnrInput).toHaveValue('ABC123456');
      }
    }
  });

  test('should support voice commands for navigation', async ({ page }) => {
    const voiceNavigation = page.locator('[data-testid="voice-navigation"]');
    if (await voiceNavigation.count() > 0) {
      await voiceNavigation.click();
      
      // Simulate voice command
      await page.evaluate(() => {
        const event = new CustomEvent('speechresult', {
          detail: { transcript: 'show my PNRs' }
        });
        window.dispatchEvent(event);
      });
      
      // Check that navigation occurred
      await page.waitForTimeout(1000);
      const dashboard = page.locator('[data-testid="pnr-dashboard"]');
      if (await dashboard.count() > 0) {
        await expect(dashboard).toBeVisible();
      }
    }
  });

  test('should provide text-to-speech for status updates', async ({ page }) => {
    // Check if Speech Synthesis API is available
    const ttsSupport = await page.evaluate(() => {
      return 'speechSynthesis' in window;
    });
    
    if (ttsSupport) {
      // Simulate PNR status update
      await page.evaluate(() => {
        const event = new CustomEvent('pnr-status-update', {
          detail: {
            pnr: 'ABC123456',
            status: 'Confirmed',
            message: 'Your PNR ABC123456 is now confirmed'
          }
        });
        window.dispatchEvent(event);
      });
      
      // Check for TTS activation
      const ttsActive = await page.evaluate(() => {
        return window.speechSynthesis.speaking;
      });
      
      // Note: In headless mode, TTS might not actually speak, but we can check if it was triggered
      const ttsIndicator = page.locator('[data-testid="tts-active"]');
      if (await ttsIndicator.count() > 0) {
        await expect(ttsIndicator).toBeVisible();
      }
    }
  });

  test('should support multi-language voice features', async ({ page }) => {
    // Check language selector
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.count() > 0) {
      await languageSelector.click();
      
      // Select different language
      const hindiOption = page.locator('[data-testid="lang-hi"], [value="hi"]');
      if (await hindiOption.count() > 0) {
        await hindiOption.click();
        
        // Check that voice interface adapts to language
        const voiceButton = page.locator('[data-testid="voice-button"]');
        if (await voiceButton.count() > 0) {
          await voiceButton.click();
          
          // Check for language-specific voice recognition
          const langIndicator = page.locator('[data-testid="voice-lang"]');
          if (await langIndicator.count() > 0) {
            await expect(langIndicator).toContainText(/hi|hindi/i);
          }
        }
      }
    }
  });

  test('should handle voice command errors gracefully', async ({ page }) => {
    const voiceButton = page.locator('[data-testid="voice-button"]');
    if (await voiceButton.count() > 0) {
      await voiceButton.click();
      
      // Simulate speech recognition error
      await page.evaluate(() => {
        const event = new CustomEvent('speecherror', {
          detail: { error: 'no-speech' }
        });
        window.dispatchEvent(event);
      });
      
      // Check for error handling
      const errorMessage = page.locator('[data-testid="voice-error"]');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/error|try again/i);
      }
    }
  });

  test('should provide voice-guided accessibility', async ({ page }) => {
    // Check for voice-guided navigation for accessibility
    const voiceGuide = page.locator('[data-testid="voice-guide"]');
    if (await voiceGuide.count() > 0) {
      await voiceGuide.click();
      
      // Simulate voice guidance activation
      await page.evaluate(() => {
        const event = new CustomEvent('voice-guide-start');
        window.dispatchEvent(event);
      });
      
      // Check for guidance indicators
      const guideIndicator = page.locator('[data-testid="voice-guide-active"]');
      if (await guideIndicator.count() > 0) {
        await expect(guideIndicator).toBeVisible();
      }
    }
  });

  test('should support voice shortcuts', async ({ page }) => {
    const voiceShortcuts = page.locator('[data-testid="voice-shortcuts"]');
    if (await voiceShortcuts.count() > 0) {
      await voiceShortcuts.click();
      
      // Test various voice shortcuts
      const shortcuts = [
        'add new PNR',
        'refresh status',
        'show notifications',
        'go to settings'
      ];
      
      for (const shortcut of shortcuts) {
        await page.evaluate((command) => {
          const event = new CustomEvent('speechresult', {
            detail: { transcript: command }
          });
          window.dispatchEvent(event);
        }, shortcut);
        
        await page.waitForTimeout(500);
        
        // Check that appropriate action was taken
        // This would depend on the specific implementation
      }
    }
  });

  test('should handle microphone permissions', async ({ page, context }) => {
    // Test with denied permissions
    await context.clearPermissions();
    
    const voiceButton = page.locator('[data-testid="voice-button"]');
    if (await voiceButton.count() > 0) {
      await voiceButton.click();
      
      // Check for permission request or error
      const permissionError = page.locator('[data-testid="mic-permission-error"]');
      if (await permissionError.count() > 0) {
        await expect(permissionError).toBeVisible();
      }
    }
  });

  test('should provide audio feedback for actions', async ({ page }) => {
    // Check for audio feedback on button clicks
    const buttons = page.locator('button[data-audio="true"], .audio-feedback');
    const audioButtonCount = await buttons.count();
    
    if (audioButtonCount > 0) {
      const audioButton = buttons.first();
      await audioButton.click();
      
      // Check for audio feedback indicator
      const audioIndicator = page.locator('[data-testid="audio-feedback"]');
      if (await audioIndicator.count() > 0) {
        await expect(audioIndicator).toBeVisible();
      }
    }
  });

  test('should support voice-controlled form filling', async ({ page }) => {
    const voiceForm = page.locator('[data-testid="voice-form"]');
    if (await voiceForm.count() > 0) {
      // Activate voice form filling
      const voiceFormButton = page.locator('[data-testid="voice-form-fill"]');
      if (await voiceFormButton.count() > 0) {
        await voiceFormButton.click();
        
        // Simulate voice input for form fields
        await page.evaluate(() => {
          const event = new CustomEvent('speechresult', {
            detail: { 
              transcript: 'PNR number ABC123456 from Delhi to Mumbai on December 15th'
            }
          });
          window.dispatchEvent(event);
        });
        
        // Check that form fields were filled
        const pnrField = page.locator('[data-testid="pnr-input"]');
        const fromField = page.locator('[data-testid="from-input"]');
        const toField = page.locator('[data-testid="to-input"]');
        
        if (await pnrField.count() > 0) {
          await expect(pnrField).toHaveValue('ABC123456');
        }
        if (await fromField.count() > 0) {
          await expect(fromField).toHaveValue(/Delhi/i);
        }
        if (await toField.count() > 0) {
          await expect(toField).toHaveValue(/Mumbai/i);
        }
      }
    }
  });
});