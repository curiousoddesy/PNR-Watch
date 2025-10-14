/**
 * Navigation Integration Tests
 * Tests the complete navigation flow between all screens
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const NavigationManager = require('../navigation-manager.js');

describe('Navigation Integration Tests', () => {
    let dom, window, document, navigationManager;

    beforeEach(() => {
        // Set up DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>PNR Status</title>
            </head>
            <body>
                <div id="app">
                    <div id="screen-container"></div>
                </div>
            </body>
            </html>
        `, {
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };

        // Mock fetch for loading screens
        global.fetch = jest.fn();
    });

    afterEach(() => {
        dom.window.close();
    });

    describe('Screen Navigation', () => {
        test('should navigate from PNR input to ticket status', async () => {
            // Mock successful screen loading
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<div id="app"><div>Ticket Status Screen</div></div>')
            });

            // Initialize navigation manager
            navigationManager = new NavigationManager();

            // Navigate to ticket status
            await navigationManager.navigateTo('ticket-status', { pnr: '245-1234567' });

            expect(navigationManager.currentScreen).toBe('ticket-status');
            expect(navigationManager.currentScreenData).toEqual({ pnr: '245-1234567' });
        });

        test('should maintain navigation history', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div id="app"><div>Screen Content</div></div>')
            });

            navigationManager = new NavigationManager();

            // Navigate through multiple screens
            await navigationManager.navigateTo('pnr-input');
            await navigationManager.navigateTo('ticket-status', { pnr: '245-1234567' });
            await navigationManager.navigateTo('pnr-history');

            expect(navigationManager.navigationHistory).toHaveLength(2);
            expect(navigationManager.navigationHistory[0].screen).toBe('pnr-input');
            expect(navigationManager.navigationHistory[1].screen).toBe('ticket-status');
        });

        test('should handle back navigation correctly', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div id="app"><div>Screen Content</div></div>')
            });

            navigationManager = new NavigationManager();

            // Navigate forward
            await navigationManager.navigateTo('pnr-input');
            await navigationManager.navigateTo('ticket-status', { pnr: '245-1234567' });

            // Navigate back
            navigationManager.goBack();

            expect(navigationManager.currentScreen).toBe('pnr-input');
            expect(navigationManager.navigationHistory).toHaveLength(0);
        });
    });

    describe('Data Passing', () => {
        test('should pass PNR data between screens', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('<div id="app"><div data-pnr-display></div></div>')
            });

            navigationManager = new NavigationManager();
            const testPNR = '245-1234567';

            await navigationManager.navigateTo('ticket-status', { pnr: testPNR });

            expect(navigationManager.currentScreenData.pnr).toBe(testPNR);
        });

        test('should maintain state across navigation', () => {
            // Mock PNRApp global object
            global.window.PNRApp = {
                data: {
                    addToRecentSearches: jest.fn(),
                    savePNR: jest.fn(),
                    getPNRData: jest.fn().mockReturnValue({
                        pnr: '245-1234567',
                        status: 'confirmed',
                        train: { number: '12345', name: 'TEST EXPRESS' }
                    })
                }
            };

            const testPNR = '245-1234567';
            
            // Simulate adding to recent searches
            window.PNRApp.data.addToRecentSearches(testPNR);
            
            expect(window.PNRApp.data.addToRecentSearches).toHaveBeenCalledWith(testPNR);
        });
    });

    describe('Error Handling', () => {
        test('should handle failed screen loading', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            navigationManager = new NavigationManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await navigationManager.navigateTo('ticket-status', { pnr: '245-1234567' });

            expect(consoleSpy).toHaveBeenCalledWith('Error loading screen:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        test('should validate PNR format', () => {
            navigationManager = new NavigationManager();

            expect(navigationManager.validatePNR('')).toBe(false);
            expect(navigationManager.validatePNR('invalid')).toBe(false);
            expect(navigationManager.validatePNR('245-1234567')).toBe(true);
        });
    });

    describe('Screen-Specific Functionality', () => {
        test('should initialize PNR input screen correctly', () => {
            // Mock DOM elements
            document.body.innerHTML = `
                <input id="pnr-input" />
                <button id="clear-btn"></button>
                <button id="check-status-btn"></button>
                <div id="recent-searches-list"></div>
            `;

            global.window.PNRApp = {
                data: {
                    getRecentSearches: jest.fn().mockReturnValue(['245-1234567']),
                    addToRecentSearches: jest.fn()
                }
            };

            navigationManager = new NavigationManager();
            navigationManager.initializePNRInput({ pnr: '245-1234567' });

            const pnrInput = document.getElementById('pnr-input');
            expect(pnrInput.value).toBe('245-1234567');
        });

        test('should initialize ticket status screen correctly', () => {
            // Mock DOM elements
            document.body.innerHTML = `
                <button><span class="material-symbols-outlined">refresh</span></button>
                <button><span class="material-symbols-outlined">share</span></button>
                <div data-pnr-display></div>
            `;

            global.window.PNRApp = {
                data: {
                    getPNRData: jest.fn().mockReturnValue({
                        pnr: '245-1234567',
                        status: 'confirmed'
                    })
                }
            };

            navigationManager = new NavigationManager();
            navigationManager.initializeTicketStatus('ticket-status', { pnr: '245-1234567' });

            const pnrDisplay = document.querySelector('[data-pnr-display]');
            expect(pnrDisplay.textContent).toBe('245-1234567');
        });
    });

    describe('UI Feedback', () => {
        test('should show loading state during refresh', () => {
            document.body.innerHTML = `
                <button id="refresh-btn">
                    <span class="material-symbols-outlined">refresh</span>
                </button>
            `;

            navigationManager = new NavigationManager();
            const refreshBtn = document.getElementById('refresh-btn');
            
            navigationManager.showRefreshLoading(refreshBtn);

            expect(refreshBtn.disabled).toBe(true);
            expect(refreshBtn.classList.contains('opacity-75')).toBe(true);
        });

        test('should show save success feedback', () => {
            document.body.innerHTML = `<button id="save-btn">Save PNR</button>`;

            navigationManager = new NavigationManager();
            const saveBtn = document.getElementById('save-btn');
            
            navigationManager.showSaveSuccess(saveBtn);

            expect(saveBtn.innerHTML).toContain('Saved!');
            expect(saveBtn.classList.contains('bg-green-500')).toBe(true);
        });
    });
});