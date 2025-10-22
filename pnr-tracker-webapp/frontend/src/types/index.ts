// Core types for the PNR Tracker application

export interface User {
  id: string;
  email: string;
  name: string;
  notificationPreferences: NotificationSettings;
  createdAt: string;
  lastLogin: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  statusTypes: string[];
}

export interface TrackedPNR {
  id: string;
  userId: string;
  pnr: string;
  currentStatus: PNRStatusResult;
  statusHistory: PNRStatusHistory[];
  isActive: boolean;
  createdAt: string;
}

export interface PNRStatusResult {
  pnr: string;
  from: string;
  to: string;
  date: string;
  status: string;
  isFlushed: boolean;
  lastUpdated: string;
  error?: string;
}

export interface PNRStatusHistory {
  id: string;
  trackedPnrId: string;
  statusData: PNRStatusResult;
  checkedAt: string;
  statusChanged: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}