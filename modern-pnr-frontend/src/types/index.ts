// Global type definitions for the Modern PNR Frontend

export interface PNR {
  id: string
  number: string
  status: PNRStatus
  passengerName: string
  trainNumber: string
  trainName: string
  dateOfJourney: string
  from: string
  to: string
  class: string
  quota: string
  createdAt: string
  updatedAt: string
}

export interface PNRStatus {
  currentStatus: string
  chartPrepared: boolean
  passengers: Passenger[]
  trainInfo: TrainInfo
  lastUpdated: string
}

export interface Passenger {
  serialNumber: number
  name: string
  age: number
  gender: string
  currentStatus: string
  bookingStatus: string
  coachPosition?: string
  seatNumber?: string
}

export interface TrainInfo {
  number: string
  name: string
  departureTime: string
  arrivalTime: string
  duration: string
  distance: string
  runningDays: string[]
}

export interface NotificationPreferences {
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  statusUpdates: boolean
  chartPreparation: boolean
  trainDelays: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: NotificationPreferences
  accessibility: AccessibilitySettings
}

export interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  screenReader: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface OfflineAction {
  id: string
  type: string
  payload: any
  timestamp: number
  retryCount: number
}

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}

export interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  connectionId: string | null
  lastConnectedAt: number | null
  reconnectAttempts: number
  error: string | null
}

export interface RealtimeEvent {
  type: 'pnr_status_update' | 'user_presence' | 'notification' | 'system_message'
  data: any
  timestamp: number
  userId?: string
}

export interface UserPresence {
  userId: string
  status: 'online' | 'away' | 'offline'
  lastSeen: number
  currentPage?: string
}

export interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
}

// Smart Input and Auto-completion Types
export interface AutoCompleteSuggestion {
  id: string
  value: string
  type: 'pnr' | 'station' | 'train' | 'passenger'
  confidence: number
  metadata?: Record<string, any>
  lastUsed?: number
  frequency?: number
}

export interface SearchHistory {
  id: string
  query: string
  type: 'pnr' | 'station' | 'train'
  timestamp: number
  resultCount: number
  selected?: boolean
}

export interface UserPattern {
  id: string
  type: 'route' | 'time' | 'class' | 'quota'
  pattern: string
  frequency: number
  lastUsed: number
  confidence: number
}

export interface SmartSuggestion {
  id: string
  type: 'quick_action' | 'contextual' | 'predictive'
  title: string
  description: string
  action: string
  confidence: number
  metadata?: Record<string, any>
}

export interface IntelligentError {
  code: string
  message: string
  suggestions: string[]
  autoFix?: () => Promise<void>
  learnFromError?: boolean
}

// Voice Interface Types
export interface VoiceCommand {
  id: string
  command: string
  intent: 'check_pnr' | 'add_pnr' | 'navigate' | 'help' | 'unknown'
  parameters: Record<string, any>
  confidence: number
  timestamp: number
}

export interface VoiceSettings {
  enabled: boolean
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  voiceActivation: boolean
  wakeWord: string
  speechRate: number
  speechPitch: number
  speechVolume: number
}

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
  alternatives: Array<{
    transcript: string
    confidence: number
  }>
}

export interface VoiceNavigationCommand {
  action: 'go_to' | 'click' | 'scroll' | 'focus' | 'back' | 'forward'
  target?: string
  parameters?: Record<string, any>
}

export interface AudioFeedback {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  priority: 'low' | 'medium' | 'high'
  interrupt: boolean
}

// In-App Notification System Types
export interface InAppNotification {
  id: string
  type: 'pnr_update' | 'system_alert' | 'promotion' | 'reminder' | 'achievement' | 'social'
  category: 'urgent' | 'important' | 'normal' | 'low'
  title: string
  message: string
  icon?: string
  image?: string
  timestamp: number
  read: boolean
  archived: boolean
  starred: boolean
  actionable: boolean
  actions?: NotificationAction[]
  metadata?: Record<string, any>
  expiresAt?: number
  scheduledFor?: number
  snoozeUntil?: number
  tags?: string[]
  source: 'system' | 'user' | 'external'
  userId?: string
  relatedPNR?: string
  priority: number
  engagement?: NotificationEngagement
}

export interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'destructive'
  action: string
  url?: string
  callback?: () => void | Promise<void>
  requiresConfirmation?: boolean
  icon?: string
}

export interface NotificationEngagement {
  viewed: boolean
  viewedAt?: number
  clicked: boolean
  clickedAt?: number
  actionTaken?: string
  actionTakenAt?: number
  timeToAction?: number
  dismissed: boolean
  dismissedAt?: number
}

export interface NotificationFilter {
  type?: InAppNotification['type'][]
  category?: InAppNotification['category'][]
  read?: boolean
  archived?: boolean
  starred?: boolean
  dateRange?: {
    start: number
    end: number
  }
  tags?: string[]
  source?: InAppNotification['source'][]
  search?: string
}

export interface NotificationSort {
  field: 'timestamp' | 'priority' | 'category' | 'read'
  direction: 'asc' | 'desc'
}

export interface NotificationPreferencesDetailed {
  enabled: boolean
  categories: {
    pnr_update: {
      enabled: boolean
      sound: boolean
      vibration: boolean
      desktop: boolean
      email: boolean
      sms: boolean
    }
    system_alert: {
      enabled: boolean
      sound: boolean
      vibration: boolean
      desktop: boolean
      email: boolean
    }
    promotion: {
      enabled: boolean
      sound: boolean
      desktop: boolean
      email: boolean
    }
    reminder: {
      enabled: boolean
      sound: boolean
      vibration: boolean
      desktop: boolean
    }
    achievement: {
      enabled: boolean
      sound: boolean
      desktop: boolean
    }
    social: {
      enabled: boolean
      sound: boolean
      desktop: boolean
    }
  }
  quietHours: {
    enabled: boolean
    start: string
    end: string
    allowUrgent: boolean
  }
  batchNotifications: {
    enabled: boolean
    interval: number // minutes
    maxBatchSize: number
  }
  smartTiming: {
    enabled: boolean
    learnFromBehavior: boolean
    respectDeviceUsage: boolean
  }
  doNotDisturb: {
    enabled: boolean
    schedule?: {
      days: number[] // 0-6, Sunday-Saturday
      start: string
      end: string
    }
  }
}

export interface NotificationTemplate {
  id: string
  type: InAppNotification['type']
  name: string
  title: string
  message: string
  icon?: string
  actions?: Omit<NotificationAction, 'id'>[]
  defaultCategory: InAppNotification['category']
  customizable: boolean
  variables: string[]
}

export interface NotificationSchedule {
  id: string
  notificationId: string
  scheduledFor: number
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom'
    interval?: number
    endDate?: number
    maxOccurrences?: number
  }
  conditions?: {
    deviceOnline?: boolean
    userActive?: boolean
    timeRange?: {
      start: string
      end: string
    }
  }
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
}

export interface NotificationAnalytics {
  totalSent: number
  totalViewed: number
  totalClicked: number
  totalDismissed: number
  averageTimeToView: number
  averageTimeToAction: number
  engagementRate: number
  clickThroughRate: number
  dismissalRate: number
  categoryBreakdown: Record<string, {
    sent: number
    viewed: number
    clicked: number
    dismissed: number
  }>
  timeBasedMetrics: {
    hourly: Record<string, number>
    daily: Record<string, number>
    weekly: Record<string, number>
  }
  deviceMetrics: {
    desktop: number
    mobile: number
    tablet: number
  }
  abTestResults?: Record<string, {
    variant: string
    sent: number
    engaged: number
    conversionRate: number
  }>
}