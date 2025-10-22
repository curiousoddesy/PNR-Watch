/**
 * Shared type definitions for the PNR Tracker application
 */

export interface User {
  id: string;
  email: string;
  name: string;
  notificationPreferences: NotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  statusTypes: NotificationType[];
}

export type NotificationType = 'confirmation' | 'waitlist_movement' | 'cancellation' | 'chart_prepared' | 'system' | 'error';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserUpdate {
  name?: string;
  notificationPreferences?: NotificationSettings;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// PNR-related types
export interface PNRStatusResult {
  pnr: string;
  from: string;
  to: string;
  date: string;
  status: string;
  isFlushed: boolean;
  lastUpdated: Date;
  error?: string;
}

export interface TrackedPNR {
  id: string;
  userId: string;
  pnr: string;
  currentStatus: PNRStatusResult;
  statusHistory: PNRStatusHistory[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PNRStatusHistory {
  id: string;
  trackedPnrId: string;
  statusData: PNRStatusResult;
  checkedAt: Date;
  statusChanged: boolean;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface JourneyDetails {
  from: string;
  to: string;
  date: string;
  status: string;
}

export interface ParsedPNRData {
  journeyDetails: JourneyDetails[];
  flushedPNRs: string[];
  errors: string[];
}