# Requirements Document

## Introduction

The PNR Tracker Web Application is a comprehensive web-based system that allows users to track their Indian Railway PNR (Passenger Name Record) statuses and receive automated notifications when their booking status changes. The system builds upon the existing CLI-based PNR checker that uses IRCTC's web scraping functionality to provide a modern, user-friendly web interface with persistent tracking and real-time notifications.

## Existing Repository Features

The current CLI tool (check-pnr-status) includes the following features that will be integrated:

1. **PNR Status Checking**: Direct web scraping from IRCTC website (indianrail.gov.in)
2. **Local Storage**: Uses Configstore to store PNRs locally in comma-separated format
3. **Batch Processing**: Checks multiple PNRs sequentially using async operations
4. **Data Parsing**: HTML parsing using jsdom and jQuery to extract journey details
5. **PNR Management**: Add, delete, and list stored PNRs
6. **Error Handling**: Detects flushed/expired PNRs and suggests removal
7. **CLI Interface**: Command-line interface with spinner animations and table output
8. **Data Validation**: 10-digit PNR format validation
9. **API Integration**: Optional Railway API support with API key management

## Glossary

- **PNR_System**: The PNR Tracker Web Application system
- **User**: A registered individual who uses the system to track PNR statuses
- **PNR**: Passenger Name Record - a 10-digit unique identifier for railway bookings
- **Status_Change**: Any modification in the booking status (confirmation, waitlist position, cancellation, etc.)
- **Notification_Service**: The component responsible for sending alerts to users
- **Railway_API**: External service (railwayapi.com) that provides PNR status information (optional)
- **IRCTC_Scraper**: Web scraping component that fetches PNR data from indianrail.gov.in
- **HTML_Parser**: Component that extracts journey details from IRCTC HTML responses
- **Dashboard**: The main user interface displaying PNR tracking information
- **Tracking_Session**: An active monitoring period for a specific PNR

## Requirements

### Requirement 1

**User Story:** As a railway passenger, I want to register and manage my account, so that I can securely track my PNR statuses.

#### Acceptance Criteria

1. THE PNR_System SHALL provide user registration with email and password
2. THE PNR_System SHALL authenticate users before allowing access to tracking features
3. THE PNR_System SHALL allow users to update their profile information
4. THE PNR_System SHALL provide secure password reset functionality
5. THE PNR_System SHALL maintain user session security with appropriate timeouts

### Requirement 2

**User Story:** As a registered user, I want to add and manage multiple PNRs, so that I can track all my railway bookings in one place.

#### Acceptance Criteria

1. THE PNR_System SHALL validate PNR format as exactly 10 digits before adding
2. THE PNR_System SHALL allow users to add multiple PNRs to their tracking list
3. THE PNR_System SHALL prevent duplicate PNR entries for the same user
4. THE PNR_System SHALL allow users to remove PNRs from their tracking list
5. THE PNR_System SHALL display all tracked PNRs with their current status on the Dashboard

### Requirement 3

**User Story:** As a user tracking PNRs, I want to see real-time status updates, so that I have the most current information about my bookings.

#### Acceptance Criteria

1. THE PNR_System SHALL fetch PNR status from IRCTC_Scraper or Railway_API at configurable intervals
2. THE PNR_System SHALL display journey details including source, destination, date, and current status
3. THE PNR_System SHALL show waitlist positions and confirmation probabilities when applicable
4. THE PNR_System SHALL indicate the last update timestamp for each PNR
5. WHEN IRCTC_Scraper and Railway_API are unavailable, THE PNR_System SHALL display cached status with appropriate indicators

### Requirement 4

**User Story:** As a user with changing PNR status, I want to receive notifications, so that I'm immediately aware of important updates.

#### Acceptance Criteria

1. WHEN Status_Change occurs, THE Notification_Service SHALL send email notifications to the user
2. THE PNR_System SHALL allow users to configure notification preferences for different status types
3. THE PNR_System SHALL provide in-app notifications visible on the Dashboard
4. THE PNR_System SHALL support browser push notifications for real-time alerts
5. THE Notification_Service SHALL include relevant journey details in all notifications

### Requirement 5

**User Story:** As a user planning my travel, I want to view historical status changes, so that I can understand booking patterns and make informed decisions.

#### Acceptance Criteria

1. THE PNR_System SHALL maintain a history of all Status_Change events for each PNR
2. THE PNR_System SHALL display status change timeline with timestamps
3. THE PNR_System SHALL show confirmation trends and waitlist movement patterns
4. THE PNR_System SHALL allow users to export their PNR history data
5. THE PNR_System SHALL automatically archive PNRs after travel date completion

### Requirement 6

**User Story:** As a system administrator, I want the application to handle errors gracefully, so that users have a reliable experience.

#### Acceptance Criteria

1. WHEN IRCTC_Scraper or Railway_API returns errors, THE PNR_System SHALL retry requests with exponential backoff
2. IF PNR becomes invalid or expired, THEN THE PNR_System SHALL notify the user and suggest removal
3. THE PNR_System SHALL handle network connectivity issues without data loss
4. THE PNR_System SHALL provide meaningful error messages to users for all failure scenarios
5. THE PNR_System SHALL log system errors for administrative monitoring and debugging

### Requirement 7

**User Story:** As a mobile user, I want a responsive interface, so that I can track my PNRs from any device.

#### Acceptance Criteria

1. THE PNR_System SHALL provide a responsive web interface compatible with mobile devices
2. THE PNR_System SHALL maintain full functionality across desktop, tablet, and mobile viewports
3. THE PNR_System SHALL optimize loading times for mobile network conditions
4. THE PNR_System SHALL support touch interactions for mobile users
5. THE Dashboard SHALL display information clearly on screens with minimum 320px width