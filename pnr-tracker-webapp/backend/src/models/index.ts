// Export all models for easy importing
export { User, UserData, UserRegistration, UserUpdate, NotificationSettings } from './User';
export { TrackedPNR, TrackedPNRData, TrackedPNRCreate, TrackedPNRUpdate } from './TrackedPNR';
export { PNRStatusHistory, PNRStatusHistoryData, PNRStatusHistoryCreate } from './PNRStatusHistory';
export { 
  Notification, 
  NotificationData, 
  NotificationCreate, 
  NotificationUpdate, 
  NotificationFilters,
  NotificationType 
} from './Notification';

// Export database connection and migration manager
export { default as DatabaseConnection } from '../config/database';
export { default as MigrationManager } from '../config/migrations';