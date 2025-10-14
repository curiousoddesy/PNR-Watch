/**
 * NavigationManager - Handles client-side routing and screen management
 */

class NavigationManager {
    constructor() {
        this.currentScreen = null;
        this.navigationHistory = [];
        this.screenContainer = document.getElementById('screen-container');
        this.screens = {
            'pnr-input': {
                path: 'pnr_input/code.html',
                title: 'PNR Status'
            },
            'ticket-status': {
                path: 'ticket_status_display_1/code.html',
                title: 'PNR Status'
            },
            'ticket-status-save': {
                path: 'ticket_status_display_2/code.html',
                title: 'PNR Status'
            },
            'ticket-status-notifications': {
                path: 'ticket_status_display_3/code.html',
                title: 'PNR Status'
            },
            'ticket-status-share': {
                path: 'ticket_status_display_4/code.html',
                title: 'PNR Status'
            },
            'pnr-history': {
                path: 'pnr_history_1/code.html',
                title: 'My PNRs'
            },
            'pnr-history-simple': {
                path: 'pnr_history_2/code.html',
                title: 'My PNRs'
            },
            'pnr-history-nav': {
                path: 'pnr_history_3/code.html',
                title: 'My PNRs'
            },
            'pnr-history-enhanced': {
                path: 'pnr_history_4/code.html',
                title: 'My PNRs'
            }
        };
        
        this.init();
    }

    init() {
        // Only initialize if we have a screen container (browser environment)
        if (this.screenContainer) {
            // Initialize with PNR input screen
            this.navigateTo('pnr-input');
        }
        
        // Handle browser back/forward buttons
        if (typeof window !== 'undefined') {
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.screen) {
                    this.loadScreen(event.state.screen, event.state.data, false);
                }
            });
        }
    }

    async navigateTo(screenId, data = null, addToHistory = true) {
        if (!this.screens[screenId]) {
            console.error('Screen not found:', screenId);
            return;
        }

        // Add to navigation history
        if (addToHistory && this.currentScreen) {
            this.navigationHistory.push({
                screen: this.currentScreen,
                data: this.currentScreenData
            });
        }

        await this.loadScreen(screenId, data, addToHistory);
    }

    async loadScreen(screenId, data = null, updateHistory = true) {
        const screen = this.screens[screenId];
        
        try {
            // Use error handler if available, otherwise handle directly
            if (window.ErrorHandler) {
                const loadOperation = async () => {
                    const response = await fetch(screen.path);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to load screen: ${response.status}`);
                    }
                    
                    const html = await response.text();
                    
                    // Extract only the content inside the main app div
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const appContent = doc.querySelector('#app');
                    
                    if (appContent) {
                        this.screenContainer.innerHTML = appContent.innerHTML;
                    } else {
                        // Fallback: use the entire body content
                        const bodyContent = doc.querySelector('body');
                        this.screenContainer.innerHTML = bodyContent.innerHTML;
                    }

                    // Add fade-in animation to new content
                    this.screenContainer.classList.add('fade-in');

                    // Update current screen tracking
                    this.currentScreen = screenId;
                    this.currentScreenData = data;

                    // Update browser history
                    if (updateHistory) {
                        const state = { screen: screenId, data: data };
                        history.pushState(state, screen.title, `#${screenId}`);
                    }

                    // Update document title
                    document.title = screen.title;

                    // Initialize screen-specific functionality
                    this.initializeScreen(screenId, data);
                };

                await window.ErrorHandler.wrapAsyncOperation(
                    loadOperation,
                    this.screenContainer,
                    `loading-screen-${screenId}`
                );
            } else {
                // Direct implementation without ErrorHandler
                const response = await fetch(screen.path);
                
                if (!response.ok) {
                    throw new Error(`Failed to load screen: ${response.status}`);
                }
                
                const html = await response.text();
                
                // Extract only the content inside the main app div
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const appContent = doc.querySelector('#app');
                
                if (appContent) {
                    this.screenContainer.innerHTML = appContent.innerHTML;
                } else {
                    // Fallback: use the entire body content
                    const bodyContent = doc.querySelector('body');
                    this.screenContainer.innerHTML = bodyContent.innerHTML;
                }

                // Add fade-in animation to new content
                this.screenContainer.classList.add('fade-in');

                // Update current screen tracking
                this.currentScreen = screenId;
                this.currentScreenData = data;

                // Update browser history
                if (updateHistory) {
                    const state = { screen: screenId, data: data };
                    history.pushState(state, screen.title, `#${screenId}`);
                }

                // Update document title
                document.title = screen.title;

                // Initialize screen-specific functionality
                this.initializeScreen(screenId, data);
            }
        } catch (error) {
            console.error('Error loading screen:', error);
            this.showError('Failed to load screen. Please try again.');
        }
    }

    goBack() {
        if (this.navigationHistory.length > 0) {
            const previousScreen = this.navigationHistory.pop();
            this.loadScreen(previousScreen.screen, previousScreen.data, true);
        } else {
            // If no history, go to default screen
            this.navigateTo('pnr-input', null, false);
        }
    }

    initializeScreen(screenId, data) {
        // Re-run theme initialization
        this.initializeTheme();

        // Add back button functionality to all screens
        this.setupBackButtons();

        // Initialize screen-specific functionality
        switch (screenId) {
            case 'pnr-input':
                this.initializePNRInput(data);
                break;
            case 'ticket-status':
            case 'ticket-status-save':
            case 'ticket-status-notifications':
            case 'ticket-status-share':
                this.initializeTicketStatus(screenId, data);
                break;
            case 'pnr-history':
            case 'pnr-history-simple':
            case 'pnr-history-nav':
            case 'pnr-history-enhanced':
                this.initializePNRHistory(screenId, data);
                break;
        }
    }

    setupBackButtons() {
        // Find all back buttons and add click handlers
        const backButtons = document.querySelectorAll('[data-back-button], .back-button, button[aria-label*="back"], button[title*="back"]');
        
        // Also find buttons with back arrow icons
        const backArrowButtons = document.querySelectorAll('button span.material-symbols-outlined');
        backArrowButtons.forEach(span => {
            if (span.textContent.trim() === 'arrow_back') {
                backButtons.push(span.parentElement);
            }
        });

        backButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.goBack();
            });
        });
    }

    initializePNRInput(data) {
        // Initialize PNR input screen functionality
        const pnrInput = document.getElementById('pnr-input');
        const clearBtn = document.getElementById('clear-btn');
        const checkStatusBtn = document.getElementById('check-status-btn');

        if (!pnrInput || !clearBtn || !checkStatusBtn) return;

        // Pre-fill PNR if provided
        if (data && data.pnr) {
            pnrInput.value = data.pnr;
            this.toggleClearButton(pnrInput, clearBtn);
        }

        // Clear button functionality
        clearBtn.addEventListener('click', () => {
            pnrInput.value = '';
            this.toggleClearButton(pnrInput, clearBtn);
            pnrInput.focus();
        });

        // Input change handler
        pnrInput.addEventListener('input', () => {
            this.toggleClearButton(pnrInput, clearBtn);
        });

        // Set up form validation
        if (window.FormValidator && pnrInput) {
            pnrInput.setAttribute('data-validate', 'pnr');
            window.FormValidator.setupRealtimeValidation(pnrInput, 'pnr');
        }

        // Check status button
        checkStatusBtn.addEventListener('click', async () => {
            const pnrValue = pnrInput.value.trim();
            if (!this.validatePNR(pnrValue, pnrInput)) return;
            
            const checkStatusOperation = async () => {
                // Simulate API call to check PNR status
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        // Simulate various response scenarios
                        const random = Math.random();
                        if (random < 0.1) { // 10% network error
                            reject(new Error('NetworkError: Unable to connect to server'));
                        } else if (random < 0.15) { // 5% PNR not found
                            reject(new Error('PNR not found. Please check your PNR number and try again.'));
                        } else if (random < 0.2) { // 5% server error
                            reject(new Error('Server temporarily unavailable. Please try again later.'));
                        } else {
                            resolve();
                        }
                    }, 1000);
                });
                
                // Add to recent searches on success
                window.PNRApp.data.addToRecentSearches(pnrValue);
                this.navigateTo('ticket-status', { pnr: pnrValue });
            };

            try {
                if (window.ErrorHandler) {
                    window.ErrorHandler.showLoading(checkStatusBtn, 'Checking...', 'button');
                    await window.ErrorHandler.wrapAsyncOperation(
                        checkStatusOperation,
                        null,
                        'check-pnr-status'
                    );
                } else {
                    await checkStatusOperation();
                }
            } catch (error) {
                console.error('PNR check failed:', error);
                this.showError('Failed to check PNR status. Please try again.');
            } finally {
                if (window.ErrorHandler) {
                    window.ErrorHandler.hideLoading(checkStatusBtn);
                }
            }
        });

        // Enter key submission
        pnrInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkStatusBtn.click();
            }
        });

        // Initialize recent searches
        this.initializeRecentSearches();

        // Add navigation to history screen
        const historyBtn = document.querySelector('[data-navigate="history"]');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.navigateTo('pnr-history-enhanced');
            });
        }
    }

    initializeTicketStatus(screenId, data) {
        // Populate ticket status with actual data
        if (data && data.pnr) {
            this.populateTicketStatusData(data.pnr);
        }

        // Find buttons by looking for specific icons or text content
        const buttons = document.querySelectorAll('button');
        let shareBtn, refreshBtn, saveBtn, notificationToggle;

        buttons.forEach(button => {
            const icon = button.querySelector('span.material-symbols-outlined');
            const text = button.textContent.toLowerCase();
            
            if (icon) {
                const iconText = icon.textContent.trim();
                if (iconText === 'share' || iconText === 'more_vert') {
                    shareBtn = button;
                } else if (iconText === 'refresh') {
                    refreshBtn = button;
                } else if (iconText === 'bookmark_add' || text.includes('save')) {
                    saveBtn = button;
                }
            }
        });

        // Find notification toggle
        notificationToggle = document.querySelector('input[type="checkbox"]');

        // Share button functionality
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                if (screenId !== 'ticket-status-share') {
                    this.navigateTo('ticket-status-share', data);
                } else {
                    // Show share modal
                    const modal = document.querySelector('#share-modal, .share-modal');
                    if (modal) {
                        modal.classList.remove('hidden');
                    }
                }
            });
        }

        // Refresh button functionality
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                if (!data?.pnr) return;
                
                const refreshOperation = async () => {
                    // Simulate API call with potential failure
                    await new Promise((resolve, reject) => {
                        setTimeout(() => {
                            // Simulate random failures for demonstration
                            if (Math.random() < 0.2) { // 20% failure rate
                                reject(new Error('Failed to fetch updated status from server'));
                            } else {
                                resolve();
                            }
                        }, 1500);
                    });
                    
                    // Update the data
                    this.populateTicketStatusData(data.pnr);
                    if (window.ErrorHandler) {
                        window.ErrorHandler.showToast('Status updated successfully', 'success');
                    }
                };

                try {
                    if (window.ErrorHandler) {
                        window.ErrorHandler.showLoading(refreshBtn, 'Refreshing...', 'button');
                        await window.ErrorHandler.wrapAsyncOperation(
                            refreshOperation,
                            null,
                            'refresh-status'
                        );
                    } else {
                        this.showRefreshLoading(refreshBtn);
                        await refreshOperation();
                    }
                } catch (error) {
                    console.error('Refresh failed:', error);
                    this.showError('Failed to refresh status. Please try again.');
                } finally {
                    if (window.ErrorHandler) {
                        window.ErrorHandler.hideLoading(refreshBtn);
                    } else {
                        this.hideRefreshLoading(refreshBtn);
                    }
                }
            });
        }

        // Save PNR button functionality
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!data?.pnr) return;
                
                // Check if offline
                if (window.OfflineManager && !window.OfflineManager.isOnline) {
                    window.OfflineManager.handleOfflineOperation('savePNR', { pnr: data.pnr });
                    this.showSaveSuccess(saveBtn);
                    setTimeout(() => {
                        this.navigateTo('ticket-status-notifications', data);
                    }, 1000);
                    return;
                }
                
                const saveOperation = async () => {
                    // Simulate potential save failure
                    await new Promise((resolve, reject) => {
                        setTimeout(() => {
                            try {
                                window.PNRApp.data.savePNR(data.pnr);
                                resolve();
                            } catch (error) {
                                reject(new Error('Failed to save PNR. Please try again.'));
                            }
                        }, 500);
                    });
                };

                try {
                    if (window.ErrorHandler) {
                        window.ErrorHandler.showLoading(saveBtn, 'Saving...', 'button');
                    }
                    await saveOperation();
                    
                    // Show success feedback
                    this.showSaveSuccess(saveBtn);
                    if (window.ErrorHandler) {
                        window.ErrorHandler.showToast('PNR saved successfully', 'success');
                    }
                    
                    // Navigate to notifications screen after brief delay
                    setTimeout(() => {
                        this.navigateTo('ticket-status-notifications', data);
                    }, 1000);
                    
                } catch (error) {
                    if (window.ErrorHandler) {
                        window.ErrorHandler.handleError(error, 'save-pnr');
                        window.ErrorHandler.hideLoading(saveBtn);
                    } else {
                        this.showError('Failed to save PNR. Please try again.');
                    }
                }
            });
        }

        // Notification toggle functionality
        if (notificationToggle && data?.pnr) {
            const settings = window.PNRApp.data.getNotificationSettings(data.pnr);
            notificationToggle.checked = settings.enabled;
            
            notificationToggle.addEventListener('change', () => {
                const newSettings = { enabled: notificationToggle.checked };
                
                // Check if offline
                if (window.OfflineManager && !window.OfflineManager.isOnline) {
                    window.OfflineManager.handleOfflineOperation('updateNotifications', {
                        pnr: data.pnr,
                        settings: newSettings
                    });
                } else {
                    window.PNRApp.data.updateNotificationSettings(data.pnr, newSettings);
                    if (window.ErrorHandler) {
                        window.ErrorHandler.showToast(
                            notificationToggle.checked ? 'Notifications enabled' : 'Notifications disabled',
                            'success'
                        );
                    }
                }
                
                // Show feedback
                this.showNotificationToggleFeedback(notificationToggle);
            });
        }

        // Initialize share modal if present
        this.initializeShareModal();

        // Add navigation to history from status screen
        const historyBtn = document.querySelector('[data-navigate="history"]');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.navigateTo('pnr-history-enhanced');
            });
        }
    }

    initializePNRHistory(screenId, data) {
        // Populate history with actual data
        this.populateHistoryData(screenId);

        // Find add button by looking for add icon
        const buttons = document.querySelectorAll('button');
        let addBtn;

        buttons.forEach(button => {
            const icon = button.querySelector('span.material-symbols-outlined');
            if (icon && icon.textContent.trim() === 'add') {
                addBtn = button;
            }
        });

        // Add button functionality
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.navigateTo('pnr-input');
            });
        }

        // Initialize tab navigation if present
        this.initializeTabNavigation();

        // Initialize search and filters if present
        this.initializeSearchAndFilters();

        // Handle empty state actions
        const emptyStateBtn = document.querySelector('[data-action="add-first-pnr"]');
        if (emptyStateBtn) {
            emptyStateBtn.addEventListener('click', () => {
                this.navigateTo('pnr-input');
            });
        }

        // Handle bulk actions if present
        const bulkActionBtns = document.querySelectorAll('[data-bulk-action]');
        bulkActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.bulkAction;
                this.handleBulkAction(action);
            });
        });
    }

    // Helper methods
    toggleClearButton(input, clearBtn) {
        if (input.value.trim()) {
            clearBtn.classList.remove('opacity-0', 'invisible');
            clearBtn.classList.add('opacity-100', 'visible');
        } else {
            clearBtn.classList.add('opacity-0', 'invisible');
            clearBtn.classList.remove('opacity-100', 'visible');
        }
    }

    validatePNR(pnr, field = null) {
        if (field && window.FormValidator) {
            const result = window.FormValidator.validateField(field, 'pnr');
            if (!result.isValid) {
                window.FormValidator.showFieldError(field, result.errors);
                return false;
            }
            return true;
        }

        // Fallback validation if FormValidator is not available
        if (!pnr) {
            this.showError('Please enter a PNR number');
            return false;
        }

        if (pnr.length < 9) {
            this.showError('PNR number must be at least 9 characters long');
            return false;
        }

        const pnrPattern = /^[0-9-]+$/;
        if (!pnrPattern.test(pnr)) {
            this.showError('Please enter a valid PNR number (numbers and dashes only)');
            return false;
        }

        // Additional validation for PNR format
        const cleanPNR = pnr.replace(/-/g, '');
        if (cleanPNR.length < 9 || cleanPNR.length > 10) {
            this.showError('PNR number must be 9-10 digits');
            return false;
        }

        return true;
    }

    showError(message) {
        // Use ErrorHandler if available, otherwise fallback
        if (window.ErrorHandler) {
            window.ErrorHandler.showError(message);
        } else {
            console.error('Navigation Error:', message);
        }
    }

    initializeTheme() {
        // Re-initialize theme functionality for dynamically loaded content
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // Enhanced UI feedback methods
    showRefreshLoading(button) {
        const icon = button.querySelector('span.material-symbols-outlined');
        if (icon) {
            icon.style.animation = 'spin 1s linear infinite';
            button.disabled = true;
            button.classList.add('opacity-75');
        }
    }

    hideRefreshLoading(button) {
        const icon = button.querySelector('span.material-symbols-outlined');
        if (icon) {
            icon.style.animation = '';
            button.disabled = false;
            button.classList.remove('opacity-75');
        }
    }

    showSaveSuccess(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="material-symbols-outlined">check</span> Saved!';
        button.classList.add('bg-green-500', 'text-white');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('bg-green-500', 'text-white');
        }, 2000);
    }

    showNotificationToggleFeedback(toggle) {
        const label = toggle.nextElementSibling;
        if (label) {
            const originalText = label.textContent;
            label.textContent = toggle.checked ? 'Notifications enabled!' : 'Notifications disabled';
            
            setTimeout(() => {
                label.textContent = originalText;
            }, 2000);
        }
    }

    // Additional methods would be implemented here...
    initializeRecentSearches() {
        // Implementation for recent searches
    }

    initializeShareModal() {
        // Implementation for share modal
    }

    initializeTabNavigation() {
        // Implementation for tab navigation
    }

    initializeSearchAndFilters() {
        // Implementation for search and filters
    }

    populateTicketStatusData(pnr) {
        // Implementation for populating ticket status data
    }

    populateHistoryData(screenId) {
        // Implementation for populating history data
    }

    handleBulkAction(action) {
        // Implementation for bulk actions
    }
}

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}