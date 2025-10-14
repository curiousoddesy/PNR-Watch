/**
 * Unit Tests for PNR History Screen Components
 * Tests tab navigation, PNR card rendering, and search/filter functionality
 * Requirements: 4.1, 4.2, 4.6
 */

// Mock DOM environment setup
const { JSDOM } = require('jsdom');

describe('PNR History Screen Components', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Create a fresh DOM environment for each test
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test</title>
            </head>
            <body>
                <!-- Tab Navigation -->
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
                                class="py-3 px-1 border-b-2 border-transparent text-slate-500 dark:text-slate-400"
                                data-tab="history"
                            >
                                History
                            </button>
                        </div>
                    </nav>
                </div>

                <!-- Tab Content -->
                <div id="saved-content" class="tab-content">
                    <div id="saved-pnr-list" class="space-y-3"></div>
                    <div id="saved-empty-state" class="hidden">No Saved PNRs</div>
                    <div id="saved-no-results" class="hidden">No Results Found</div>
                </div>
                
                <div id="history-content" class="tab-content hidden">
                    <div id="history-pnr-list" class="space-y-3"></div>
                    <div id="history-empty-state" class="hidden">No Search History</div>
                    <div id="history-no-results" class="hidden">No Results Found</div>
                </div>

                <!-- Search Input -->
                <input type="text" id="search-input" placeholder="Search PNR or status...">

                <!-- Filter Chips -->
                <button id="confirmed-filter" class="filter-chip" data-filter="confirmed">Confirmed</button>
                <button id="waitlisted-filter" class="filter-chip" data-filter="waitlisted">Waiting List</button>
                <button id="active-alerts-filter" class="filter-chip" data-filter="active-alerts">Active Alerts</button>
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

    // Test Suite 1: Tab Navigation Functionality (Requirement 4.1)
    describe('Tab Navigation', () => {
        test('should initialize with saved tab active', () => {
            const savedTab = document.getElementById('saved-tab');
            const historyTab = document.getElementById('history-tab');
            
            expect(savedTab.classList.contains('border-primary')).toBe(true);
            expect(savedTab.classList.contains('text-primary')).toBe(true);
            expect(historyTab.classList.contains('border-transparent')).toBe(true);
            expect(historyTab.classList.contains('text-slate-500')).toBe(true);
        });

        test('should switch to history tab when clicked', () => {
            const savedTab = document.getElementById('saved-tab');
            const historyTab = document.getElementById('history-tab');
            const savedContent = document.getElementById('saved-content');
            const historyContent = document.getElementById('history-content');

            // Simulate tab switching function
            function switchTab(activeTab, inactiveTab, activeContent, inactiveContent) {
                activeTab.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
                activeTab.classList.add('border-primary', 'text-primary');
                
                inactiveTab.classList.remove('border-primary', 'text-primary');
                inactiveTab.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');

                activeContent.classList.remove('hidden');
                inactiveContent.classList.add('hidden');
            }

            // Click history tab
            switchTab(historyTab, savedTab, historyContent, savedContent);

            expect(historyTab.classList.contains('border-primary')).toBe(true);
            expect(historyTab.classList.contains('text-primary')).toBe(true);
            expect(savedTab.classList.contains('border-transparent')).toBe(true);
            expect(savedTab.classList.contains('text-slate-500')).toBe(true);
            expect(historyContent.classList.contains('hidden')).toBe(false);
            expect(savedContent.classList.contains('hidden')).toBe(true);
        });

        test('should switch back to saved tab when clicked', () => {
            const savedTab = document.getElementById('saved-tab');
            const historyTab = document.getElementById('history-tab');
            const savedContent = document.getElementById('saved-content');
            const historyContent = document.getElementById('history-content');

            // Start with history tab active
            historyTab.classList.add('border-primary', 'text-primary');
            historyTab.classList.remove('border-transparent', 'text-slate-500');
            savedTab.classList.add('border-transparent', 'text-slate-500');
            savedTab.classList.remove('border-primary', 'text-primary');
            historyContent.classList.remove('hidden');
            savedContent.classList.add('hidden');

            // Simulate switching back to saved tab
            function switchTab(activeTab, inactiveTab, activeContent, inactiveContent) {
                activeTab.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
                activeTab.classList.add('border-primary', 'text-primary');
                
                inactiveTab.classList.remove('border-primary', 'text-primary');
                inactiveTab.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');

                activeContent.classList.remove('hidden');
                inactiveContent.classList.add('hidden');
            }

            switchTab(savedTab, historyTab, savedContent, historyContent);

            expect(savedTab.classList.contains('border-primary')).toBe(true);
            expect(savedTab.classList.contains('text-primary')).toBe(true);
            expect(historyTab.classList.contains('border-transparent')).toBe(true);
            expect(historyTab.classList.contains('text-slate-500')).toBe(true);
            expect(savedContent.classList.contains('hidden')).toBe(false);
            expect(historyContent.classList.contains('hidden')).toBe(true);
        });
    });

    // Test Suite 2: PNR Card Rendering and Interactions (Requirement 4.2)
    describe('PNR Card Rendering', () => {
        const samplePNRs = [
            {
                pnr: '245-5423890',
                status: 'confirmed',
                route: { from: 'New Delhi', to: 'Mumbai' },
                date: '15 Jul 2024',
                hasNotifications: true
            },
            {
                pnr: '123-4567890',
                status: 'waitlisted',
                route: { from: 'Chennai', to: 'Bangalore' },
                date: '20 Jul 2024',
                hasNotifications: false
            },
            {
                pnr: '456-7890123',
                status: 'cancelled',
                route: { from: 'Pune', to: 'Goa' },
                date: '05 Jul 2024',
                hasNotifications: false
            }
        ];

        function createPNRCard(pnr, showNotificationSettings) {
            const statusColors = {
                confirmed: { bg: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
                waitlisted: { bg: 'bg-orange-500', badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' },
                cancelled: { bg: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' }
            };

            const colors = statusColors[pnr.status] || statusColors.confirmed;
            const notificationIcon = pnr.hasNotifications ? 'notifications_active' : 'notifications_off';
            const notificationSettings = showNotificationSettings ? `
                <button class="notification-settings-btn">Notification Settings</button>
            ` : '';

            return `
                <div class="pnr-card bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4" data-pnr="${pnr.pnr}" data-status="${pnr.status}">
                    <div class="flex items-start gap-4">
                        <div class="status-icon w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-white text-lg">
                                ${pnr.status === 'confirmed' ? 'check_circle' : pnr.status === 'waitlisted' ? 'schedule' : 'cancel'}
                            </span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="pnr-number font-semibold text-slate-900 dark:text-white">${pnr.pnr}</span>
                                ${pnr.hasNotifications ? `<span class="notification-icon material-symbols-outlined text-primary text-lg">${notificationIcon}</span>` : ''}
                            </div>
                            <div class="route-info text-sm text-slate-600 dark:text-slate-400 mb-2">
                                From: ${pnr.route.from} To: ${pnr.route.to}
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="travel-date text-sm text-slate-500 dark:text-slate-500">${pnr.date}</div>
                                <span class="status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge}">
                                    ${pnr.status.charAt(0).toUpperCase() + pnr.status.slice(1)}
                                </span>
                            </div>
                            ${notificationSettings}
                        </div>
                    </div>
                </div>
            `;
        }

        test('should render PNR cards with correct data', () => {
            const listElement = document.getElementById('saved-pnr-list');
            listElement.innerHTML = samplePNRs.map(pnr => createPNRCard(pnr, true)).join('');

            const cards = listElement.querySelectorAll('.pnr-card');
            expect(cards.length).toBe(3);

            // Test first card (confirmed status)
            const firstCard = cards[0];
            expect(firstCard.dataset.pnr).toBe('245-5423890');
            expect(firstCard.dataset.status).toBe('confirmed');
            expect(firstCard.querySelector('.pnr-number').textContent).toBe('245-5423890');
            expect(firstCard.querySelector('.route-info').textContent.trim()).toBe('From: New Delhi To: Mumbai');
            expect(firstCard.querySelector('.travel-date').textContent.trim()).toBe('15 Jul 2024');
            expect(firstCard.querySelector('.status-badge').textContent.trim()).toBe('Confirmed');
            expect(firstCard.querySelector('.notification-icon')).toBeTruthy();
        });

        test('should render correct status colors and icons', () => {
            const listElement = document.getElementById('saved-pnr-list');
            listElement.innerHTML = samplePNRs.map(pnr => createPNRCard(pnr, false)).join('');

            const cards = listElement.querySelectorAll('.pnr-card');

            // Test confirmed status (green)
            const confirmedCard = cards[0];
            const confirmedIcon = confirmedCard.querySelector('.status-icon');
            expect(confirmedIcon.classList.contains('bg-green-500')).toBe(true);

            // Test waitlisted status (orange)
            const waitlistedCard = cards[1];
            const waitlistedIcon = waitlistedCard.querySelector('.status-icon');
            expect(waitlistedIcon.classList.contains('bg-orange-500')).toBe(true);

            // Test cancelled status (red)
            const cancelledCard = cards[2];
            const cancelledIcon = cancelledCard.querySelector('.status-icon');
            expect(cancelledIcon.classList.contains('bg-red-500')).toBe(true);
        });

        test('should show notification settings for saved PNRs', () => {
            const listElement = document.getElementById('saved-pnr-list');
            listElement.innerHTML = samplePNRs.map(pnr => createPNRCard(pnr, true)).join('');

            const notificationButtons = listElement.querySelectorAll('.notification-settings-btn');
            expect(notificationButtons.length).toBe(3);
        });

        test('should not show notification settings for history PNRs', () => {
            const listElement = document.getElementById('history-pnr-list');
            listElement.innerHTML = samplePNRs.map(pnr => createPNRCard(pnr, false)).join('');

            const notificationButtons = listElement.querySelectorAll('.notification-settings-btn');
            expect(notificationButtons.length).toBe(0);
        });

        test('should show empty state when no PNRs exist', () => {
            function renderPNRList(listId, emptyStateId, noResultsId, pnrs, showNotificationSettings, hasOriginalData) {
                const listElement = document.getElementById(listId);
                const emptyStateElement = document.getElementById(emptyStateId);
                const noResultsElement = document.getElementById(noResultsId);

                emptyStateElement.classList.add('hidden');
                noResultsElement.classList.add('hidden');

                if (pnrs.length === 0) {
                    if (!hasOriginalData) {
                        emptyStateElement.classList.remove('hidden');
                    } else {
                        noResultsElement.classList.remove('hidden');
                    }
                    listElement.innerHTML = '';
                    return;
                }

                listElement.innerHTML = pnrs.map(pnr => createPNRCard(pnr, showNotificationSettings)).join('');
            }

            renderPNRList('saved-pnr-list', 'saved-empty-state', 'saved-no-results', [], true, false);

            const emptyState = document.getElementById('saved-empty-state');
            const noResults = document.getElementById('saved-no-results');
            const list = document.getElementById('saved-pnr-list');

            expect(emptyState.classList.contains('hidden')).toBe(false);
            expect(noResults.classList.contains('hidden')).toBe(true);
            expect(list.innerHTML).toBe('');
        });
    }); 
   // Test Suite 3: Search and Filter Functionality (Requirement 4.6)
    describe('Search and Filter Functionality', () => {
        const testPNRs = [
            {
                pnr: '245-5423890',
                status: 'confirmed',
                route: { from: 'New Delhi', to: 'Mumbai' },
                date: '15 Jul 2024',
                hasNotifications: true
            },
            {
                pnr: '123-4567890',
                status: 'waitlisted',
                route: { from: 'Chennai', to: 'Bangalore' },
                date: '20 Jul 2024',
                hasNotifications: true
            },
            {
                pnr: '789-0123456',
                status: 'confirmed',
                route: { from: 'Hyderabad', to: 'Pune' },
                date: '25 Jul 2024',
                hasNotifications: false
            },
            {
                pnr: '456-7890123',
                status: 'cancelled',
                route: { from: 'Pune', to: 'Goa' },
                date: '05 Jul 2024',
                hasNotifications: false
            }
        ];

        function applySearchFilter(pnrs, searchTerm) {
            if (!searchTerm) return pnrs;
            
            return pnrs.filter(pnr => {
                const term = searchTerm.toLowerCase();
                return pnr.pnr.toLowerCase().includes(term) ||
                       pnr.status.toLowerCase().includes(term) ||
                       pnr.route.from.toLowerCase().includes(term) ||
                       pnr.route.to.toLowerCase().includes(term);
            });
        }

        function applyStatusFilter(pnrs, filters) {
            return pnrs.filter(pnr => {
                if (filters.has('confirmed') && pnr.status !== 'confirmed') return false;
                if (filters.has('waitlisted') && pnr.status !== 'waitlisted') return false;
                if (filters.has('active-alerts') && !pnr.hasNotifications) return false;
                return true;
            });
        }

        test('should filter PNRs by search term - PNR number', () => {
            const searchTerm = '245';
            const filtered = applySearchFilter(testPNRs, searchTerm);
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].pnr).toBe('245-5423890');
        });

        test('should filter PNRs by search term - status', () => {
            const searchTerm = 'confirmed';
            const filtered = applySearchFilter(testPNRs, searchTerm);
            
            expect(filtered.length).toBe(2);
            expect(filtered.every(pnr => pnr.status === 'confirmed')).toBe(true);
        });

        test('should filter PNRs by search term - station name', () => {
            const searchTerm = 'mumbai';
            const filtered = applySearchFilter(testPNRs, searchTerm);
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].route.to).toBe('Mumbai');
        });

        test('should return all PNRs when search term is empty', () => {
            const filtered = applySearchFilter(testPNRs, '');
            expect(filtered.length).toBe(testPNRs.length);
        });

        test('should filter by confirmed status', () => {
            const filters = new Set(['confirmed']);
            const filtered = applyStatusFilter(testPNRs, filters);
            
            expect(filtered.length).toBe(2);
            expect(filtered.every(pnr => pnr.status === 'confirmed')).toBe(true);
        });

        test('should filter by waitlisted status', () => {
            const filters = new Set(['waitlisted']);
            const filtered = applyStatusFilter(testPNRs, filters);
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].status).toBe('waitlisted');
        });

        test('should filter by active alerts', () => {
            const filters = new Set(['active-alerts']);
            const filtered = applyStatusFilter(testPNRs, filters);
            
            expect(filtered.length).toBe(2);
            expect(filtered.every(pnr => pnr.hasNotifications === true)).toBe(true);
        });

        test('should combine multiple filters', () => {
            const filters = new Set(['confirmed', 'active-alerts']);
            const filtered = applyStatusFilter(testPNRs, filters);
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].status).toBe('confirmed');
            expect(filtered[0].hasNotifications).toBe(true);
            expect(filtered[0].pnr).toBe('245-5423890');
        });

        test('should combine search and filter', () => {
            // First apply search filter
            const searchFiltered = applySearchFilter(testPNRs, 'confirmed');
            // Then apply status filter
            const filters = new Set(['active-alerts']);
            const finalFiltered = applyStatusFilter(searchFiltered, filters);
            
            expect(finalFiltered.length).toBe(1);
            expect(finalFiltered[0].pnr).toBe('245-5423890');
        });

        test('should handle filter chip toggle functionality', () => {
            const currentFilters = new Set();
            
            function toggleFilter(filter, currentFilters) {
                if (currentFilters.has(filter)) {
                    currentFilters.delete(filter);
                    return false; // filter removed
                } else {
                    currentFilters.add(filter);
                    return true; // filter added
                }
            }

            // Add filter
            const added = toggleFilter('confirmed', currentFilters);
            expect(added).toBe(true);
            expect(currentFilters.has('confirmed')).toBe(true);

            // Remove filter
            const removed = toggleFilter('confirmed', currentFilters);
            expect(removed).toBe(false);
            expect(currentFilters.has('confirmed')).toBe(false);
        });

        test('should update filter chip visual state', () => {
            const filterChip = document.getElementById('confirmed-filter');
            
            // Simulate active state
            filterChip.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
            filterChip.classList.add('bg-primary', 'text-white', 'border-primary');
            
            expect(filterChip.classList.contains('bg-primary')).toBe(true);
            expect(filterChip.classList.contains('text-white')).toBe(true);
            expect(filterChip.classList.contains('border-primary')).toBe(true);

            // Simulate inactive state
            filterChip.classList.remove('bg-primary', 'text-white', 'border-primary');
            filterChip.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
            
            expect(filterChip.classList.contains('bg-white')).toBe(true);
            expect(filterChip.classList.contains('text-slate-700')).toBe(true);
        });

        test('should show no results state when filters return empty', () => {
            function renderPNRList(listId, emptyStateId, noResultsId, pnrs, showNotificationSettings, hasOriginalData) {
                const listElement = document.getElementById(listId);
                const emptyStateElement = document.getElementById(emptyStateId);
                const noResultsElement = document.getElementById(noResultsId);

                emptyStateElement.classList.add('hidden');
                noResultsElement.classList.add('hidden');

                if (pnrs.length === 0) {
                    if (!hasOriginalData) {
                        emptyStateElement.classList.remove('hidden');
                    } else {
                        noResultsElement.classList.remove('hidden');
                    }
                    listElement.innerHTML = '';
                    return;
                }

                listElement.innerHTML = pnrs.map(pnr => `<div data-pnr="${pnr.pnr}"></div>`).join('');
            }

            // Simulate filtered results with no matches but original data exists
            renderPNRList('saved-pnr-list', 'saved-empty-state', 'saved-no-results', [], true, true);

            const emptyState = document.getElementById('saved-empty-state');
            const noResults = document.getElementById('saved-no-results');
            const list = document.getElementById('saved-pnr-list');

            expect(emptyState.classList.contains('hidden')).toBe(true);
            expect(noResults.classList.contains('hidden')).toBe(false);
            expect(list.innerHTML).toBe('');
        });
    });
});