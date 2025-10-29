# Implementation Plan

- [x] 1. Set up project structure and migrate existing functionality

  - Create new web application directory structure with separate frontend/backend folders
  - Copy and adapt existing PNR checking modules from the CLI repository
  - Set up TypeScript configuration for both frontend and backend
  - Initialize package.json files with dependencies from existing repo plus web framework dependencies
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 6.4_

- [x] 2. Implement core PNR services using existing repository logic

- [x] 2.1 Create PNR validation and management service

  - Adapt `tools.js` validatePnr function to TypeScript service class
  - Port PNR management logic from `addPnr.js`, `getPnrs.js`, `deletePnrs.js` to database-backed service
  - Implement PNR format validation with existing 10-digit validation rules
  - _Requirements: 2.1, 2.3_

- [x] 2.2 Implement IRCTC scraping service

  - Port `checkPnrStatus.js` performRequest function to TypeScript service
  - Adapt HTML parsing logic from `tools.js` getDataFromHtml function
  - Integrate existing CSS selectors from `defineSelectors.js` for data extraction
  - Implement flushed PNR detection using existing pattern matching logic
  - _Requirements: 3.1, 3.2, 6.1, 6.2_

- [x] 2.3 Create batch processing service for multiple PNRs

  - Adapt `checkAllPnrStatus.js` async batch processing logic to service class
  - Implement request throttling and rate limiting for IRCTC requests
  - Add error handling and retry logic with exponential backoff
  - _Requirements: 3.1, 6.1, 6.3_

- [x] 2.4 Write unit tests for core PNR services

  - Test PNR validation logic with various input formats
  - Mock IRCTC responses to test HTML parsing functionality
  - Test batch processing with multiple PNR scenarios
  - _Requirements: 2.1, 3.1, 6.1_

- [x] 3. Set up database and data models

- [x] 3.1 Configure PostgreSQL database and connection

  - Set up database connection with connection pooling
  - Create database migration system for schema management
  - Configure environment-based database settings
  - _Requirements: 1.1, 2.2, 5.1_

- [x] 3.2 Implement user data models and migrations

  - Create users table schema with authentication fields
  - Implement User model with password hashing using bcrypt
  - Create database migration for users table
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.3 Implement PNR tracking data models

  - Create tracked_pnrs table schema linking users to PNRs
  - Create pnr_status_history table for tracking status changes over time
  - Implement TrackedPNR and PNRStatusHistory models with relationships
  - Create database migrations for PNR tracking tables
  - _Requirements: 2.2, 2.5, 5.1, 5.2_

- [x] 3.4 Implement notification data models

  - Create notifications table schema for in-app notifications
  - Implement Notification model with user relationships
  - Create database migration for notifications table
  - _Requirements: 4.3, 4.2_

- [x] 4. Implement authentication system

- [x] 4.1 Create user registration and login API endpoints

  - Implement user registration with email validation and password hashing
  - Create login endpoint with credential validation
  - Add input validation and sanitization for user data
  - _Requirements: 1.1, 1.2_

- [x] 4.2 Implement JWT authentication middleware

  - Create JWT token generation and validation functions
  - Implement authentication middleware for protected routes
  - Add refresh token functionality for session management
  - _Requirements: 1.2, 1.5_

- [x] 4.3 Create password reset functionality

  - Implement password reset request endpoint with email verification
  - Create secure password reset token system
  - Add password update endpoint with token validation
  - _Requirements: 1.4_

- [x] 4.4 Write authentication tests

  - Test user registration with various input scenarios
  - Test login functionality and JWT token validation
  - Test password reset flow end-to-end
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 5. Build PNR management API endpoints

- [x] 5.1 Create PNR CRUD API endpoints

  - Implement POST /api/pnrs endpoint to add new PNRs with validation
  - Create GET /api/pnrs endpoint to retrieve user's tracked PNRs
  - Implement DELETE /api/pnrs/:id endpoint to remove PNRs
  - Add middleware to ensure users can only access their own PNRs
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [x] 5.2 Implement PNR status checking endpoints

  - Create GET /api/pnrs/:id/status endpoint for individual PNR status
  - Implement POST /api/pnrs/check-all endpoint for batch status checking
  - Add status caching to reduce
    IRCTC request frequency
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 5.3 Create PNR history endpoints

  - Implement GET /api/pnrs/:id/history endpoint for s
    tatus change history
  - Create data export endpoint for user's PNR history
  - Add pagination for large history datasets
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 5.4 Write API endpoint tests

  - Test PNR CRUD operations with authentication

  - Test status checking functionality with mocked IRCTC responses

  - Test history retrieval and pagination
  - _Requirements: 2.1, 3.1, 5.1_

- [x] 6. Implement notification system

- [x] 6.1 Create notification service infrastructure

  - Set up email service using Nodemailer with SMTP configuration

  - Implement push notification service using Web Push API
  - Create notification template system for different notification types
  - _Requirements: 4.1, 4.4_

- [x] 6.2 Implement status change detection and notification triggers

  - Create background service to detect PNR status changes
  - Implement notification dispatch logic based on user preferences
  - Add notification queuing system for reliable delivery
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 6.3 Create notification management endpoints

  - Implement GET /api/notifications endpoint for in-app notifications
  - Create PUT /api/notifications/:id/read endpoint to mark notifications as read
  - Add notification preferences management endpoints
  - _Requirements: 4.2, 4.3_

- [x] 6.4 Write notification system tests

  - Test email notification delivery with mock SMTP
  - Test push notification functionality

  - Test notification preference management
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Build background scheduler for automatic PNR checking

- [x] 7.1 Implement scheduled PNR status checking

  - Create cron-based scheduler using node-cron for periodic status checks
  - Implement intelligent scheduling based on travel dates and current status
  - Add job queue system for managing scheduled tasks
  - _Requirements: 3.1, 6.1_

- [x] 7.2 Create status change detection and notification pipeline

  - Implement status comparison logic to detect meaningful changes
  - Create notification dispatch pipeline for status changes
  - Add automatic PNR archiving after travel date completion
  - _Requirements: 4.1, 5.5, 6.1_

- [x] 7.3 Write scheduler tests

  - Test scheduled job execution and status checking
  - Test status change detection logic
  - Test notification pipeline integration
  - _Requirements: 3.1, 4.1, 5.5_

- [-] 8. Create React frontend application

- [x] 8.1 Set up React application with routing and state management

  - Initialize React application with TypeScript and routing setup

  - Configure state management using Context API or Redux Toolkit
  - Set up API client for backend communication
  - _Requirements: 7.1, 7.2_

- [x] 8.2 Implement authentication UI components

  - Create login and registration forms with validation
  - Implement protected route components with authentication checks
  - Add password reset UI flow
  - Create user profile management interface
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8.3 Build PNR management dashboard

  - Create PNR list component displaying tracked PNRs with current status

  - Implement add PNR form with validation and error handling
  - Create PNR detail view showing journey information and status history
  - Add PNR removal functionality with confirmation dialogs
  - _Requirements: 2.2, 2.4, 2.5, 3.2, 3.3_

- [x] 8.4 Implement real-time status updates

  - Set up WebSocket connection for real-time status updates

  - Create status update components that refresh automatically
  - Add loading states and error handling for status checks
  - Implement manual refresh functionality for immediate status checks
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 8.5 Create notification interface

  - Implement in-app notification display component
  - Create notification preferences management interface
  - Add push notification permission request and setup
  - Build notification history view with read/unread states
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 8.6 Implement responsive design and mobile optimization

  - Create responsive layout components using CSS Grid/Flexbox
  - Optimize interface for mobile devices with touch-friendly interactions
  - Implement Progressive Web App (PWA) features for mobile installation
  - Add mobile-specific navigation and gesture support
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8.7 Write frontend component tests

  - Test authentication components with various user scenarios
  - Test PNR management interface functionality
  - Test responsive design across different screen sizes
  - _Requirements: 1.1, 2.2, 7.1_

- [x] 9. Implement error handling and monitoring

- [x] 9.1 Add comprehensive error handling across the application

  - Implement global error handling middleware for API endpoints

  - Implement global error handling middleware for API endpoints
  - Create user-friendly error messages for common failure scenarios
  - Add error logging and monitoring for system administrators
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 9.2 Create system health monitoring and logging

  - Implement application health check endpoints
  - Add structured logging for debugging and monitoring
  - Create error alerting system for critical failures
  - _Requirements: 6.5_

-

- [x] 9.3 Write error handling tests

  - Test error scenarios and recovery mechanisms
  - Test system monitoring and alerting functionality
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 10. Final integration and deployment preparation

- [x] 10.1 Integrate all components and perform end-to-end testing

  - Connect frontend and backend with complete API integration
  - Test complete user workflows from registration to PNR tracking
  - Verify notification delivery across all channels
  - Test system performance under realistic load conditions
  - _Requirements: All requirements_

- [x] 10.2 Prepare production deployment configuration

  - Create production environment configuration files
  - Set up database migration scripts for production deployment
  - Configure production security settings and environment variables
  - Create deployment documentation and setup instructions
  - _Requirements: All requirements_
