// Shared navigation utilities for PNR Status Application
// This file provides common navigation functions that can be used across all screens

// Navigation helper functions
window.PNRApp = window.PNRApp || {};

window.PNRApp.navigation = {
    // Navigate to different screens
    navigateToInput: (pnr = null) => {
        if (window.navigateTo) {
            window.navigateTo('pnr-input', pnr ? { pnr } : null);
        }
    },

    navigateToStatus: (pnr, variant = 'basic') => {
        if (window.navigateTo) {
            const screenMap = {
                'basic': 'ticket-status',
                'save': 'ticket-status-save', 
                'notifications': 'ticket-status-notifications',
                'share': 'ticket-status-share'
            };
            window.navigateTo(screenMap[variant] || 'ticket-status', { pnr });
        }
    },

    navigateToHistory: (variant = 'basic') => {
        if (window.navigateTo) {
            const screenMap = {
                'basic': 'pnr-history',
                'simple': 'pnr-history-simple',
                'nav': 'pnr-history-nav',
                'enhanced': 'pnr-history-enhanced'
            };
            window.navigateTo(screenMap[variant] || 'pnr-history');
        }
    },

    goBack: () => {
        if (window.goBack) {
            window.goBack();
        }
    }
};

// Data management utilities
window.PNRApp.data = {
    // Sample PNR data for demonstration
    samplePNRs: {
        '245-5423890': {
            pnr: '245-5423890',
            status: 'confirmed',
            train: {
                number: '12345',
                name: 'SUPERFAST EXP',
                class: 'Sleeper (SL)'
            },
            journey: {
                from: 'New Delhi (NDLS)',
                to: 'Mumbai Central (MMCT)',
                departure: '15 Jul 2024, 20:40',
                arrival: '16 Jul 2024, 12:30'
            },
            passengers: [
                {
                    name: 'John Doe',
                    age: 28,
                    gender: 'Male',
                    coach: 'S5',
                    berth: '32 (Upper)',
                    status: 'confirmed'
                }
            ]
        },
        '123-4567890': {
            pnr: '123-4567890',
            status: 'waitlisted',
            train: {
                number: '67890',
                name: 'EXPRESS TRAIN',
                class: 'AC 3 Tier (3A)'
            },
            journey: {
                from: 'Mumbai Central (MMCT)',
                to: 'Chennai Central (MAS)',
                departure: '20 Jul 2024, 14:30',
                arrival: '21 Jul 2024, 08:15'
            },
            passengers: [
                {
                    name: 'Jane Smith',
                    age: 32,
                    gender: 'Female',
                    coach: 'B2',
                    berth: 'WL 15',
                    status: 'waitlisted'
                }
            ]
        },
        '987-6543210': {
            pnr: '987-6543210',
            status: 'cancelled',
            train: {
                number: '54321',
                name: 'MAIL EXPRESS',
                class: 'General (GEN)'
            },
            journey: {
                from: 'Delhi Junction (DLI)',
                to: 'Kolkata (KOAA)',
                departure: '25 Jul 2024, 22:00',
                arrival: '26 Jul 2024, 16:45'
            },
            passengers: [
                {
                    name: 'Bob Johnson',
                    age: 45,
                    gender: 'Male',
                    coach: 'GEN',
                    berth: 'Cancelled',
                    status: 'cancelled'
                }
            ]
        }
    },

    // Get PNR data
    getPNRData: (pnr) => {
        return window.PNRApp.data.samplePNRs[pnr] || null;
    },

    // Get recent searches from localStorage
    getRecentSearches: () => {
        return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    },

    // Add to recent searches
    addToRecentSearches: (pnr) => {
        const recent = window.PNRApp.data.getRecentSearches();
        if (!recent.includes(pnr)) {
            recent.unshift(pnr);
            if (recent.length > 5) recent.pop();
            localStorage.setItem('recentSearches', JSON.stringify(recent));
        }
    },

    // Get saved PNRs from localStorage
    getSavedPNRs: () => {
        return JSON.parse(localStorage.getItem('savedPNRs') || '[]');
    },

    // Save PNR
    savePNR: (pnr) => {
        const saved = window.PNRApp.data.getSavedPNRs();
        if (!saved.includes(pnr)) {
            saved.push(pnr);
            localStorage.setItem('savedPNRs', JSON.stringify(saved));
        }
    },

    // Remove saved PNR
    removeSavedPNR: (pnr) => {
        const saved = window.PNRApp.data.getSavedPNRs();
        const filtered = saved.filter(p => p !== pnr);
        localStorage.setItem('savedPNRs', JSON.stringify(filtered));
    },

    // Get notification settings
    getNotificationSettings: (pnr) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        return settings[pnr] || { enabled: false };
    },

    // Update notification settings
    updateNotificationSettings: (pnr, settings) => {
        const allSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        allSettings[pnr] = settings;
        localStorage.setItem('notificationSettings', JSON.stringify(allSettings));
    }
};

// UI utilities
window.PNRApp.ui = {
    // Get status color class
    getStatusColorClass: (status) => {
        const colorMap = {
            'confirmed': 'text-green-800 bg-green-100 dark:bg-green-900/50',
            'waitlisted': 'text-orange-800 bg-orange-100 dark:bg-orange-900/50',
            'cancelled': 'text-red-800 bg-red-100 dark:bg-red-900/50'
        };
        return colorMap[status] || 'text-gray-800 bg-gray-100 dark:bg-gray-900/50';
    },

    // Get status icon color
    getStatusIconColor: (status) => {
        const colorMap = {
            'confirmed': 'bg-green-500',
            'waitlisted': 'bg-orange-500',
            'cancelled': 'bg-red-500'
        };
        return colorMap[status] || 'bg-gray-500';
    },

    // Format date for display
    formatDate: (dateString) => {
        // Simple date formatting - in real app would use proper date library
        return dateString;
    },

    // Show loading state
    showLoading: (element) => {
        if (element) {
            element.innerHTML = '<div class="flex items-center justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';
        }
    },

    // Show error message
    showError: (message, element = null) => {
        if (element) {
            element.innerHTML = `<div class="text-center py-8 text-red-600 dark:text-red-400">${message}</div>`;
        } else {
            // Fallback to alert - in real app would use toast notification
            alert(message);
        }
    }
};

// Common initialization functions
window.PNRApp.init = {
    // Initialize back buttons
    setupBackButtons: () => {
        const backButtons = document.querySelectorAll('button');
        backButtons.forEach(button => {
            const icon = button.querySelector('span.material-symbols-outlined');
            if (icon && icon.textContent.trim() === 'arrow_back') {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.PNRApp.navigation.goBack();
                });
            }
        });
    },

    // Initialize theme
    setupTheme: () => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
};

// Enhanced navigation patterns
window.PNRApp.patterns = {
    // Common navigation flows
    checkPNRStatus: (pnr) => {
        if (!pnr) return;
        
        // Add to recent searches
        window.PNRApp.data.addToRecentSearches(pnr);
        
        // Navigate to status screen
        window.PNRApp.navigation.navigateToStatus(pnr);
    },

    savePNRAndNavigate: (pnr) => {
        if (!pnr) return;
        
        // Save PNR
        window.PNRApp.data.savePNR(pnr);
        
        // Navigate to notifications screen
        window.PNRApp.navigation.navigateToStatus(pnr, 'notifications');
    },

    shareTicketStatus: (pnr) => {
        if (!pnr) return;
        
        // Navigate to share screen
        window.PNRApp.navigation.navigateToStatus(pnr, 'share');
    },

    // Navigation with data validation
    navigateWithValidation: (targetScreen, data) => {
        // Validate required data based on target screen
        switch (targetScreen) {
            case 'ticket-status':
                if (!data?.pnr) {
                    window.PNRApp.ui.showError('PNR number is required');
                    return false;
                }
                break;
        }
        
        return true;
    }
};

// Screen state management
window.PNRApp.state = {
    currentPNR: null,
    currentScreen: null,
    searchFilters: {
        term: '',
        status: 'all',
        notifications: 'all'
    },
    
    // Update current state
    updateState: (updates) => {
        Object.assign(window.PNRApp.state, updates);
    },
    
    // Get current state
    getState: () => {
        return { ...window.PNRApp.state };
    }
};