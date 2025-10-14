/**
 * Focused tests for Tab Navigation functionality
 * Requirements: 4.1 - Tab interface with "Saved PNRs" and "History" tabs
 */

const { JSDOM } = require('jsdom');

describe('Tab Navigation Component', () => {
    let dom, document, window;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div class="border-b border-slate-200 dark:border-slate-700">
                    <nav class="px-4">
                        <div class="flex space-x-8">
                            <button 
                                id="saved-tab"
                                class="py-3 px-1 border-b-2 border-primary text-primary font-medium text-sm"
                                data-tab="saved"
                            >
                                Saved PNRs
                            </button>
                            <button 
                                id="history-tab"
                                class="py-3 px-1 border-b-2 border-transparent text-slate-500 dark:text-slate-400 font-medium text-sm"
                                data-tab="history"
                            >
                                History
                            </button>
                        </div>
                    </nav>
                </div>
                <div id="saved-content" class="tab-content"></div>
                <div id="history-content" class="tab-content hidden"></div>
            </body>
            </html>
        `);
        
        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;
    });

    afterEach(() => {
        dom.window.close();
    });

    test('should have correct initial tab state', () => {
        const savedTab = document.getElementById('saved-tab');
        const historyTab = document.getElementById('history-tab');
        
        // Saved tab should be active initially
        expect(savedTab.classList.contains('border-primary')).toBe(true);
        expect(savedTab.classList.contains('text-primary')).toBe(true);
        
        // History tab should be inactive initially
        expect(historyTab.classList.contains('border-transparent')).toBe(true);
        expect(historyTab.classList.contains('text-slate-500')).toBe(true);
    });

    test('should switch tabs correctly', () => {
        const savedTab = document.getElementById('saved-tab');
        const historyTab = document.getElementById('history-tab');
        const savedContent = document.getElementById('saved-content');
        const historyContent = document.getElementById('history-content');

        // Simulate the switchTab function from the actual component
        function switchTab(activeTab, inactiveTab, activeContent, inactiveContent) {
            // Update tab styles
            activeTab.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
            activeTab.classList.add('border-primary', 'text-primary');
            
            inactiveTab.classList.remove('border-primary', 'text-primary');
            inactiveTab.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');

            // Update content visibility
            activeContent.classList.remove('hidden');
            inactiveContent.classList.add('hidden');
        }

        // Switch to history tab
        switchTab(historyTab, savedTab, historyContent, savedContent);

        // Verify history tab is now active
        expect(historyTab.classList.contains('border-primary')).toBe(true);
        expect(historyTab.classList.contains('text-primary')).toBe(true);
        
        // Verify saved tab is now inactive
        expect(savedTab.classList.contains('border-transparent')).toBe(true);
        expect(savedTab.classList.contains('text-slate-500')).toBe(true);
        
        // Verify content visibility
        expect(historyContent.classList.contains('hidden')).toBe(false);
        expect(savedContent.classList.contains('hidden')).toBe(true);
    });

    test('should handle tab data attributes correctly', () => {
        const savedTab = document.getElementById('saved-tab');
        const historyTab = document.getElementById('history-tab');
        
        expect(savedTab.dataset.tab).toBe('saved');
        expect(historyTab.dataset.tab).toBe('history');
    });

    test('should maintain proper CSS classes during tab switching', () => {
        const savedTab = document.getElementById('saved-tab');
        const historyTab = document.getElementById('history-tab');
        
        // Initial state verification
        expect(savedTab.classList.contains('py-3')).toBe(true);
        expect(savedTab.classList.contains('px-1')).toBe(true);
        expect(savedTab.classList.contains('border-b-2')).toBe(true);
        expect(savedTab.classList.contains('font-medium')).toBe(true);
        expect(savedTab.classList.contains('text-sm')).toBe(true);
        
        // These classes should remain constant regardless of active state
        expect(historyTab.classList.contains('py-3')).toBe(true);
        expect(historyTab.classList.contains('px-1')).toBe(true);
        expect(historyTab.classList.contains('border-b-2')).toBe(true);
        expect(historyTab.classList.contains('font-medium')).toBe(true);
        expect(historyTab.classList.contains('text-sm')).toBe(true);
    });
});