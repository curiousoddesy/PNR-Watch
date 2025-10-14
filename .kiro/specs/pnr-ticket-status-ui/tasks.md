# Implementation Plan

- [x] 1. Set up project structure and base HTML template

  - Create main HTML file with proper DOCTYPE and meta tags
  - Set up Tailwind CSS configuration with exact custom theme colors (#137fec primary, #f6f7f8 background-light, #101922 background-dark)
  - Include Material Symbols font and Public Sans typography (weights 400, 500, 600, 700)
  - Configure dark mode support and responsive viewport settings
  - Add body min-height styling (max(884px, 100dvh))
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.4_

- [x] 2. Implement PNR Input Screen component (pnr_input/code.html)

  - [x] 2.1 Create header component with back navigation

    - Build header with back arrow icon (material-symbols-outlined), centered "PNR Status" title
    - Use exact spacing: p-4 pb-2 justify-between with size-12 back button
    - Implement responsive header layout without sticky positioning
    - _Requirements: 1.1, 6.3_

  - [x] 2.2 Build PNR input form with validation

    - Create labeled input field "Enter PNR Number" with placeholder "e.g., 245-1234567"
    - Implement input with clear button (close icon) on the right side
    - Use exact styling: rounded-lg, h-14, border styling with focus states
    - Add primary "Check Status" button with full width and proper styling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.2_

  - [x] 2.3 Implement recent searches section and info text
    - Add informational text about PNR explanation
    - Create "Recent Searches" section with h3 heading
    - Build recent search items with PNR numbers and forward arrow icons
    - Style with bg-white dark:bg-gray-800 cards and proper spacing
    - _Requirements: 1.5, 6.2, 7.2_

- [x] 3. Create ticket status display component (ticket_status_display_1/code.html)

  - [x] 3.1 Build status header and navigation

    - Implement sticky header with back button, centered "PNR Status" title, and share button
    - Use exact styling: sticky top-0 z-10 shadow-sm with proper button sizing
    - Add share button with share icon on the right side
    - _Requirements: 2.7, 6.2, 6.3_

  - [x] 3.2 Implement status card with color coding

    - Create prominent green status card (bg-[#28a745]) with pt-[100px] padding
    - Display "PNR: 245-5423890", "CONFIRMED" status, and description text
    - Use exact text styling: white text with proper font weights and sizes
    - Add shadow styling: shadow-[0_0_4px_rgba(0,0,0,0.1)]
    - _Requirements: 2.1, 2.2, 7.1_

  - [x] 3.3 Build train details section

    - Create "Train Details" h2 heading with exact styling
    - Implement white card with grid layout for train info
    - Display "Train: 12345 | SUPERFAST EXP" and "Class: Sleeper (SL)"
    - Use border-b styling between grid items
    - _Requirements: 2.3_

  - [x] 3.4 Create journey itinerary with visual timeline

    - Build "Journey Itinerary" section with timeline component
    - Implement visual dots (w-3 h-3 bg-primary rounded-full) connected by line
    - Display departure: "New Delhi (NDLS) 15 Jul 2024, 20:40"
    - Display arrival: "Mumbai Central (MMCT) 16 Jul 2024, 12:30"
    - _Requirements: 2.4_

  - [x] 3.5 Implement passenger information section

    - Create "Passenger Information" section with passenger cards
    - Display passenger details in grid: name/age, coach/berth, status badge
    - Use green status badges: bg-green-100 dark:bg-green-900/50 text-green-800
    - Implement border-b between passenger entries
    - _Requirements: 2.5, 7.1_

  - [x] 3.6 Add floating refresh button
    - Create fixed bottom-6 right-6 circular button (h-14 w-14)
    - Use primary background with refresh icon
    - Add shadow-lg styling
    - _Requirements: 2.6, 6.2, 7.2_

- [x] 4. Implement save PNR functionality and notification toggle

  - [x] 4.1 Create save PNR button component (ticket_status_display_2/code.html)

    - Build "Save PNR for Notifications" button with bookmark_add icon
    - Use bg-primary/10 dark:bg-primary/20 styling with full width
    - Add proper spacing (px-4 py-3) and gap-2 for icon and text
    - _Requirements: 3.1, 6.2_

  - [x] 4.2 Implement notification toggle component (ticket_status_display_3/code.html)
    - Create "Status Change Alerts" section with notifications_active icon
    - Build toggle switch component with proper styling
    - Use checkbox input with custom toggle styling (w-11 h-6)
    - Implement peer classes for toggle state management
    - _Requirements: 3.2, 3.3, 7.4_

- [x] 5. Build PNR history and saved PNRs screen

  - [x] 5.1 Create tab navigation component (pnr_history_1/code.html)

    - Build tab interface with "Saved PNRs" (active) and "History" tabs
    - Implement active tab styling: text-primary border-b-2 border-primary
    - Use border-b border-slate-200 dark:border-slate-700 for tab container
    - _Requirements: 4.1, 6.4_

  - [x] 5.2 Implement PNR card list component with notification settings

    - Create PNR cards with color-coded icons (green/orange/red backgrounds)
    - Display PNR number, status badge, route info, and travel date
    - Add notification bell icon (notifications_active) for saved PNRs
    - Include "Notification Settings" button with settings icon
    - _Requirements: 4.2, 4.3, 4.4, 7.1, 7.3_

  - [x] 5.3 Build simplified PNR history view (pnr_history_2/code.html)

    - Create simplified PNR cards without notification settings
    - Remove tab navigation and notification settings sections
    - Keep same card structure but without settings buttons
    - _Requirements: 4.2, 4.4_

  - [x] 5.4 Create floating add button

    - Implement circular floating action button (h-14 w-14)
    - Position fixed bottom-6 right-6 with primary background
    - Add add icon and hover:bg-primary/90 transition
    - _Requirements: 4.5, 6.2, 7.2_

  - [x] 5.5 Implement enhanced PNR list with search and filters (pnr_history_4/code.html)

    - Add search input with search icon and placeholder "Search PNR or status..."
    - Create filter buttons: Filter, Active Alerts, Confirmed, Waiting List, Date Range
    - Use rounded-full styling for filter chips with proper color coding
    - _Requirements: 4.6, 7.2_

  - [x] 5.6 Add navigation to detailed status view (pnr_history_3/code.html)
    - Wrap PNR cards in anchor tags with hover states
    - Implement hover:bg-slate-50 dark:hover:bg-slate-700/50 effects
    - Create proper link structure for navigation
    - _Requirements: 4.7_

- [x] 6. Implement share modal functionality (ticket_status_display_4/code.html)

  - [x] 6.1 Create share modal overlay

    - Build modal with fixed inset-0 bg-black bg-opacity-50 z-20 overlay
    - Create bottom sheet modal with rounded-t-xl styling
    - Add modal header with "Share PNR Status" title and close button
    - _Requirements: 2.7, 7.2_

  - [x] 6.2 Build share content and options

    - Create formatted PNR information display in gray background box
    - Implement share options grid with WhatsApp, Messenger, Email, Copy
    - Use circular buttons (w-14 h-14) with proper icons and labels
    - Add more_vert icon option in header instead of share icon
    - _Requirements: 2.7, 6.2_

  - [x] 6.3 Add modal interaction logic
    - Implement modal open/close functionality
    - Create share option click handlers
    - Add proper z-index management for floating refresh button
    - _Requirements: 7.2, 7.4_

- [x] 7. Implement navigation and routing logic

  - [x] 7.1 Create navigation state management

    - Implement client-side routing between screens
    - Create navigation history management
    - Add back button functionality
    - _Requirements: 6.3_

  - [x] 7.2 Connect all screen components
    - Wire up navigation between PNR input, status, and history screens
    - Implement data passing between components
    - Create consistent navigation patterns
    - _Requirements: 1.5, 4.7, 6.3_

- [x] 8. Enhance theme support and accessibility

  - [x] 8.1 Optimize dark mode implementation

    - Verify consistent dark mode classes throughout all components
    - Ensure proper contrast ratios in both themes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.2 Add accessibility enhancements

    - Implement proper ARIA labels and roles
    - Ensure keyboard navigation support
    - Add focus management for interactive elements
    - Test screen reader compatibility
    - _Requirements: 6.3, 7.2_

  - [x] 8.3 Optimize responsive behavior
    - Ensure proper mobile viewport handling across all screens
    - Implement responsive typography and spacing
    - Test touch target sizes across components
    - Optimize layout for different screen sizes
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 9. Write comprehensive unit tests

  - [x] 9.1 Write unit tests for PNR input validation

    - Test PNR format validation logic
    - Test form submission handling
    - Test recent searches functionality
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 9.2 Write unit tests for status display components

    - Test status card color coding logic
    - Test passenger information rendering
    - Test journey timeline display
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 9.3 Write unit tests for save functionality

    - Test PNR saving logic
    - Test toggle switch functionality
    - Test notification state management
    - _Requirements: 3.2, 3.3_

  - [x] 9.4 Write unit tests for history screen components
    - Test tab navigation functionality
    - Test PNR card rendering and interactions
    - Test search and filter functionality
    - _Requirements: 4.1, 4.2, 4.6_

- [ ] 10. Final integration and polish

  - [x] 10.1 Add error handling and loading states

    - Implement loading indicators for async operations
    - Create error message displays with retry mechanisms
    - Add network connectivity error handling
    - Implement graceful degradation for offline scenarios
    - _Requirements: 7.4_

  - [x] 10.2 Write end-to-end integration tests

    - Test complete user workflows from PNR input to status display
    - Test navigation between all screens with data persistence

    - Test error handling scenarios and recovery
    - Validate accessibility compliance across all user flows
    - _Requirements: 1.1, 2.1, 4.1_

  - [x] 10.3 Optimize performance and bundle size

    - Minimize CSS and JavaScript bundles

    - Optimize font loading and icon usage
    - Implement efficient rendering patterns
    - Add performance monitoring and metrics
    - _Requirements: 6.1, 6.4_

  - [ ] 10.4 Add final visual polish and animations


    - Implement smooth transitions between states
    - Add hover and focus animations (hover:shadow-md transition-shadow)
    - Create loading and success animations
    - Polish micro-interactions and feedback
    - _Requirements: 7.2, 7.4_

  - [ ] 10.5 Cross-browser testing and fixes

    - Test functionality across modern browsers (Chrome, Firefox, Safari, Edge)
    - Fix any browser-specific issues
    - Ensure consistent behavior on mobile devices
    - Validate responsive design across different screen sizes
    - _Requirements: 6.1, 6.2_
