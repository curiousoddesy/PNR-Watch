/**
 * Simple Navigation Tests
 * Basic tests for navigation functionality
 */

const NavigationManager = require('../navigation-manager.js');

// Mock DOM environment
const mockDOM = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    addEventListener: jest.fn(),
    createElement: jest.fn(),
    title: 'Test'
};

// Mock window and document
global.window = {
    addEventListener: jest.fn(),
    history: {
        pushState: jest.fn()
    },
    matchMedia: jest.fn().mockReturnValue({ matches: false }),
    DOMParser: function() {
        return {
            parseFromString: jest.fn().mockReturnValue({
                querySelector: jest.fn().mockReturnValue({
                    innerHTML: '<div>Mock content</div>'
                })
            })
        };
    }
};

global.document = mockDOM;
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    theme: 'light'
};

global.fetch = jest.fn();

describe('NavigationManager', () => {
    let navigationManager;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock screen container
        const mockScreenContainer = {
            innerHTML: '',
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };
        
        mockDOM.getElementById.mockImplementation((id) => {
            if (id === 'screen-container') {
                return mockScreenContainer;
            }
            return null;
        });
    });

    test('should initialize with correct screen configuration', () => {
        navigationManager = new NavigationManager();
        
        expect(navigationManager.screens).toBeDefined();
        expect(navigationManager.screens['pnr-input']).toBeDefined();
        expect(navigationManager.screens['ticket-status']).toBeDefined();
        expect(navigationManager.screens['pnr-history']).toBeDefined();
    });

    test('should validate PNR format correctly', () => {
        navigationManager = new NavigationManager();
        
        // Mock alert to avoid actual alerts in tests
        global.alert = jest.fn();
        
        expect(navigationManager.validatePNR('')).toBe(false);
        expect(navigationManager.validatePNR('invalid')).toBe(false);
        expect(navigationManager.validatePNR('245-1234567')).toBe(true);
        expect(navigationManager.validatePNR('123456789')).toBe(true);
    });

    test('should handle navigation history correctly', async () => {
        navigationManager = new NavigationManager();
        
        // Mock successful fetch
        global.fetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('<div id="app"><div>Test content</div></div>')
        });

        // Mock the loadScreen method to avoid DOM manipulation issues
        navigationManager.loadScreen = jest.fn().mockImplementation((screenId, data) => {
            navigationManager.currentScreen = screenId;
            navigationManager.currentScreenData = data;
            return Promise.resolve();
        });

        // Navigate to a screen
        await navigationManager.navigateTo('ticket-status', { pnr: '245-1234567' });
        
        expect(navigationManager.currentScreen).toBe('ticket-status');
        expect(navigationManager.currentScreenData).toEqual({ pnr: '245-1234567' });
    });

    test('should handle back navigation', () => {
        navigationManager = new NavigationManager();
        
        // Add some history
        navigationManager.navigationHistory.push({
            screen: 'pnr-input',
            data: null
        });
        
        navigationManager.currentScreen = 'ticket-status';
        
        // Mock loadScreen method
        navigationManager.loadScreen = jest.fn();
        
        navigationManager.goBack();
        
        expect(navigationManager.loadScreen).toHaveBeenCalledWith('pnr-input', null, true);
        expect(navigationManager.navigationHistory).toHaveLength(0);
    });

    test('should show UI feedback correctly', () => {
        navigationManager = new NavigationManager();
        
        // Mock button element
        const mockButton = {
            querySelector: jest.fn().mockReturnValue({
                style: { animation: '' }
            }),
            disabled: false,
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            innerHTML: 'Original Text'
        };
        
        navigationManager.showRefreshLoading(mockButton);
        
        expect(mockButton.disabled).toBe(true);
        expect(mockButton.classList.add).toHaveBeenCalledWith('opacity-75');
    });

    test('should handle errors gracefully', async () => {
        navigationManager = new NavigationManager();
        
        // Mock failed fetch
        global.fetch.mockRejectedValue(new Error('Network error'));
        
        // Mock console.error to avoid actual console output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        await navigationManager.loadScreen('ticket-status', { pnr: '245-1234567' });
        
        expect(consoleSpy).toHaveBeenCalledWith('Error loading screen:', expect.any(Error));
        
        consoleSpy.mockRestore();
    });
});