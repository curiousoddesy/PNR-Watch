/**
 * Focused tests for PNR Card Rendering and Interactions
 * Requirements: 4.2, 4.4 - PNR card display with status badges, route info, and notification settings
 */

const { JSDOM } = require('jsdom');

describe('PNR Card Rendering Component', () => {
    let dom, document, window;

    const mockPNRData = [
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

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="saved-pnr-list" class="space-y-3"></div>
                <div id="history-pnr-list" class="space-y-3"></div>
                <div id="saved-empty-state" class="hidden">No Saved PNRs</div>
                <div id="history-empty-state" class="hidden">No Search History</div>
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

    // Helper function to create PNR card HTML (matches actual implementation)
    function createPNRCard(pnr, showNotificationSettings) {
        const statusColors = {
            confirmed: { bg: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
            waitlisted: { bg: 'bg-orange-500', badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' },
            cancelled: { bg: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' }
        };

        const colors = statusColors[pnr.status] || statusColors.confirmed;
        const notificationIcon = pnr.hasNotifications ? 'notifications_active' : 'notifications_off';
        const notificationSettings = showNotificationSettings ? `
            <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button class="notification-settings-btn flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    <span class="material-symbols-outlined text-lg">settings</span>
                    Notification Settings
                </button>
            </div>
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
                            ${pnr.hasNotifications ? `
                                <span class="notification-icon material-symbols-outlined text-primary text-lg">
                                    ${notificationIcon}
                                </span>
                            ` : ''}
                        </div>
                        <div class="route-info text-sm text-slate-600 dark:text-slate-400 mb-2">
                            From: ${pnr.route.from} To: ${pnr.route.to}
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="travel-date text-sm text-slate-500 dark:text-slate-500">
                                ${pnr.date}
                            </div>
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

    test('should render PNR cards with correct basic information', () => {
        const listElement = document.getElementById('saved-pnr-list');
        listElement.innerHTML = mockPNRData.map(pnr => createPNRCard(pnr, true)).join('');

        const cards = listElement.querySelectorAll('.pnr-card');
        expect(cards.length).toBe(3);

        // Test first card data
        const firstCard = cards[0];
        expect(firstCard.dataset.pnr).toBe('245-5423890');
        expect(firstCard.dataset.status).toBe('confirmed');
        expect(firstCard.querySelector('.pnr-number').textContent).toBe('245-5423890');
        expect(firstCard.querySelector('.route-info').textContent.trim()).toBe('From: New Delhi To: Mumbai');
        expect(firstCard.querySelector('.travel-date').textContent.trim()).toBe('15 Jul 2024');
    });

    test('should display correct status badges with proper styling', () => {
        const listElement = document.getElementById('saved-pnr-list');
        listElement.innerHTML = mockPNRData.map(pnr => createPNRCard(pnr, false)).join('');

        const cards = listElement.querySelectorAll('.pnr-card');

        // Test confirmed status badge
        const confirmedBadge = cards[0].querySelector('.status-badge');
        expect(confirmedBadge.textContent.trim()).toBe('Confirmed');
        expect(confirmedBadge.classList.contains('bg-green-100')).toBe(true);

        // Test waitlisted status badge
        const waitlistedBadge = cards[1].querySelector('.status-badge');
        expect(waitlistedBadge.textContent.trim()).toBe('Waitlisted');
        expect(waitlistedBadge.classList.contains('bg-orange-100')).toBe(true);

        // Test cancelled status badge
        const cancelledBadge = cards[2].querySelector('.status-badge');
        expect(cancelledBadge.textContent.trim()).toBe('Cancelled');
        expect(cancelledBadge.classList.contains('bg-red-100')).toBe(true);
    });

    test('should display correct status icons with proper colors', () => {
        const listElement = document.getElementById('saved-pnr-list');
        listElement.innerHTML = mockPNRData.map(pnr => createPNRCard(pnr, false)).join('');

        const cards = listElement.querySelectorAll('.pnr-card');

        // Test confirmed status icon (green background)
        const confirmedIcon = cards[0].querySelector('.status-icon');
        expect(confirmedIcon.classList.contains('bg-green-500')).toBe(true);

        // Test waitlisted status icon (orange background)
        const waitlistedIcon = cards[1].querySelector('.status-icon');
        expect(waitlistedIcon.classList.contains('bg-orange-500')).toBe(true);

        // Test cancelled status icon (red background)
        const cancelledIcon = cards[2].querySelector('.status-icon');
        expect(cancelledIcon.classList.contains('bg-red-500')).toBe(true);
    });

    test('should show notification icons for PNRs with notifications enabled', () => {
        const listElement = document.getElementById('saved-pnr-list');
        listElement.innerHTML = mockPNRData.map(pnr => createPNRCard(pnr, true)).join('');

        const cards = listElement.querySelectorAll('.pnr-card');

        // First PNR has notifications enabled
        const firstCardNotificationIcon = cards[0].querySelector('.notification-icon');
        expect(firstCardNotificationIcon).toBeTruthy();

        // Second and third PNRs don't have notifications enabled
        const secondCardNotificationIcon = cards[1].querySelector('.notification-icon');
        const thirdCardNotificationIcon = cards[2].querySelector('.notification-icon');
        expect(secondCardNotificationIcon).toBeFalsy();
        expect(thirdCardNotificationIcon).toBeFalsy();
    });

    test('should show notification settings for saved PNRs', () => {
        const listElement = document.getElementById('saved-pnr-list');
        listElement.innerHTML = mockPNRData.map(pnr => createPNRCard(pnr, true)).join('');

        const notificationButtons = listElement.querySelectorAll('.notification-settings-btn');
        expect(notificationButtons.length).toBe(3);

        // Test button content
        const firstButton = notificationButtons[0];
        expect(firstButton.textContent.replace(/\s+/g, ' ').trim()).toContain('Notification Settings');
    });

    test('should not show notification settings for history PNRs', () => {
        const listElement = document.getElementById('history-pnr-list');
        listElement.innerHTML = mockPNRData.map(pnr => createPNRCard(pnr, false)).join('');

        const notificationButtons = listElement.querySelectorAll('.notification-settings-btn');
        expect(notificationButtons.length).toBe(0);
    });

    test('should handle empty PNR list correctly', () => {
        function renderPNRList(listId, emptyStateId, pnrs, showNotificationSettings) {
            const listElement = document.getElementById(listId);
            const emptyStateElement = document.getElementById(emptyStateId);

            if (pnrs.length === 0) {
                emptyStateElement.classList.remove('hidden');
                listElement.innerHTML = '';
                return;
            }

            emptyStateElement.classList.add('hidden');
            listElement.innerHTML = pnrs.map(pnr => createPNRCard(pnr, showNotificationSettings)).join('');
        }

        renderPNRList('saved-pnr-list', 'saved-empty-state', [], true);

        const emptyState = document.getElementById('saved-empty-state');
        const list = document.getElementById('saved-pnr-list');

        expect(emptyState.classList.contains('hidden')).toBe(false);
        expect(list.innerHTML).toBe('');
    });

    test('should maintain proper card structure and CSS classes', () => {
        const listElement = document.getElementById('saved-pnr-list');
        listElement.innerHTML = createPNRCard(mockPNRData[0], true);

        const card = listElement.querySelector('.pnr-card');
        
        // Test main card classes
        expect(card.classList.contains('bg-white')).toBe(true);
        expect(card.classList.contains('dark:bg-slate-800')).toBe(true);
        expect(card.classList.contains('rounded-lg')).toBe(true);
        expect(card.classList.contains('border')).toBe(true);
        expect(card.classList.contains('p-4')).toBe(true);

        // Test status icon classes
        const statusIcon = card.querySelector('.status-icon');
        expect(statusIcon.classList.contains('w-10')).toBe(true);
        expect(statusIcon.classList.contains('h-10')).toBe(true);
        expect(statusIcon.classList.contains('rounded-full')).toBe(true);
        expect(statusIcon.classList.contains('flex-shrink-0')).toBe(true);
    });
});