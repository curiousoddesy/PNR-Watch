# Design Document

## Overview

The PNR Ticket Status Display UI is a mobile-first web application built with modern web technologies. The application uses Tailwind CSS for styling, Material Symbols for icons, and follows a component-based architecture. The design emphasizes accessibility, responsive layout, and intuitive user experience with support for both light and dark themes.

## Architecture

### Technology Stack
- **HTML5**: Semantic markup structure
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Material Symbols**: Google's icon system for consistent iconography
- **Public Sans**: Primary font family for modern, readable typography
- **JavaScript**: Client-side interactivity and state management

### Design System
- **Primary Color**: #137fec (blue)
- **Background Light**: #f6f7f8
- **Background Dark**: #101922
- **Typography**: Public Sans font family with weights 400, 500, 600, 700
- **Border Radius**: Default 0.25rem, lg 0.5rem, xl 0.75rem
- **Spacing**: Consistent 4px grid system

## Components and Interfaces

### 1. PNR Input Screen Component
**Purpose**: Allow users to enter PNR numbers and access recent searches

**Key Elements**:
- Header with back navigation and title
- PNR input field with validation
- Clear button for input reset
- "Check Status" primary action button
- Recent searches list with clickable items
- Informational text about PNR

**Interactions**:
- Input validation for PNR format
- Clear button functionality
- Navigation to status screen on form submission
- Quick access to recent searches

### 2. Ticket Status Display Component
**Purpose**: Show comprehensive ticket information and status

**Key Elements**:
- Sticky header with back navigation, centered title, and share/more button
- Prominent green status card with specific padding (pt-[100px])
- Save PNR button or notification toggle switch
- Train details section with grid layout
- Journey itinerary with visual timeline (dots and connecting line)
- Passenger information with three-column grid layout
- Floating refresh button (bottom-right)
- Share modal overlay (optional)

**Status Color Coding**:
- Green (#28a745): Confirmed tickets
- Orange: Waitlisted tickets  
- Red: Cancelled tickets

**Visual Hierarchy**:
- Prominent status card with shadow styling
- Sectioned information with h2 headings
- Card-based layout with proper spacing
- Grid layouts for structured data display

**Variations**:
- Basic status view (ticket_status_display_1)
- With save button (ticket_status_display_2)  
- With notification toggle (ticket_status_display_3)
- With share modal (ticket_status_display_4)

### 3. PNR History/Saved PNRs Component
**Purpose**: Manage and display user's PNR collection

**Key Elements**:
- Header with back navigation and "My PNRs" title
- Tab navigation (Saved PNRs / History) with border styling
- PNR card list with status indicators and hover effects
- Notification settings access for saved PNRs
- Search functionality with filter chips
- Floating add button
- Enhanced navigation with anchor links

**PNR Card Structure**:
- Color-coded circular icon (green=confirmed, orange=waitlisted, red=cancelled)
- PNR number with notification bell indicator (for saved items)
- Route information (From: X To: Y format)
- Travel date
- Status badge with matching colors
- Notification settings button (settings icon + text)
- Hover states and transition effects

**Variations**:
- Basic list view (pnr_history_2)
- Enhanced view with notification settings (pnr_history_1)
- Clickable navigation version (pnr_history_3)
- Advanced search and filter version (pnr_history_4)

### 4. Navigation and Layout Components

**Header Component**:
- Consistent across all screens
- Back navigation button
- Screen title (centered)
- Optional action buttons (share, etc.)
- Sticky positioning for mobile

**Floating Action Buttons**:
- Primary actions (Add PNR, Refresh)
- Fixed positioning in bottom-right
- Consistent sizing (56px diameter)
- Material Design elevation

## Data Models

### PNR Data Structure
```javascript
{
  pnrNumber: "245-5423890",
  status: "confirmed" | "waitlisted" | "cancelled",
  trainDetails: {
    number: "12345",
    name: "SUPERFAST EXP",
    class: "Sleeper (SL)"
  },
  journey: {
    departure: {
      station: "New Delhi (NDLS)",
      datetime: "2024-07-15T20:40:00"
    },
    arrival: {
      station: "Mumbai Central (MMCT)",
      datetime: "2024-07-16T12:30:00"
    }
  },
  passengers: [
    {
      id: 1,
      age: 28,
      gender: "Male",
      coach: "S5",
      berth: "32 (Upper)",
      status: "confirmed"
    }
  ],
  savedForNotifications: boolean,
  lastChecked: timestamp
}
```

### User Preferences
```javascript
{
  theme: "light" | "dark",
  recentSearches: ["245-5423890", "123-4567890"],
  savedPNRs: [pnrNumber],
  notificationSettings: {
    [pnrNumber]: {
      enabled: boolean,
      statusChanges: boolean,
      timeUpdates: boolean
    }
  }
}
```

## Error Handling

### Input Validation
- PNR format validation with clear error messages
- Network connectivity error handling
- Invalid PNR number responses
- Timeout handling for API requests

### User Feedback
- Loading states during API calls
- Success confirmations for save actions
- Error messages with retry options
- Offline state indicators

### Graceful Degradation
- Fallback for missing data
- Default states for empty lists
- Progressive enhancement for advanced features

## Testing Strategy

### Component Testing
- Individual component rendering
- User interaction testing
- Theme switching functionality
- Responsive behavior validation

### Integration Testing
- Navigation flow between screens
- Data persistence and retrieval
- Form submission and validation
- Status update workflows

### Accessibility Testing
- Keyboard navigation support
- Screen reader compatibility
- Color contrast validation
- Touch target size verification

### Cross-browser Testing
- Modern browser compatibility
- Mobile device testing
- Performance optimization
- Progressive web app features

## Responsive Design Considerations

### Mobile-First Approach
- Base styles optimized for mobile viewport
- Touch-friendly interactive elements
- Optimized typography and spacing
- Efficient use of screen real estate

### Breakpoint Strategy
- Primary focus on mobile (320px-768px)
- Tablet adaptations where beneficial
- Desktop enhancements for larger screens
- Flexible grid system using Tailwind utilities

### Performance Optimization
- Minimal CSS bundle with Tailwind purging
- Optimized font loading
- Efficient icon usage
- Lazy loading for non-critical content

## Theme Implementation

### Light Theme
- Background: #f6f7f8
- Text: #0d141b
- Cards: White backgrounds
- Borders: Light gray (#cfdbe7)

### Dark Theme
- Background: #101922
- Text: White
- Cards: Dark gray (#1C2A38)
- Borders: Dark gray variants

### Theme Switching
- CSS custom properties for dynamic theming
- Tailwind dark mode classes
- Consistent component theming
- User preference persistence