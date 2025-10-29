import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Mail, 
  MessageSquare,
  Clock,
  Moon,
  Zap,
  Users,
  Save,
  RotateCcw
} from 'lucide-react'
import { useNotificationCenter } from '../../hooks/useNotificationCenter'
import { NotificationPreferencesDetailed } from '../../types'
import { cn } from '../../utils/cn'

interface NotificationPreferencesProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose,
  className
}) => {
  const { preferences, updatePreferences, loading } = useNotificationCenter()
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferencesDetailed>(preferences)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'categories' | 'timing' | 'advanced'>('general')

  // Update local preferences and track changes
  const updateLocalPreferences = (updates: Partial<NotificationPreferencesDetailed>) => {
    const newPreferences = { ...localPreferences, ...updates }
    setLocalPreferences(newPreferences)
    setHasChanges(JSON.stringify(newPreferences) !== JSON.stringify(preferences))
  }

  // Save preferences
  const handleSave = async () => {
    try {
      await updatePreferences(localPreferences)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  // Reset to original preferences
  const handleReset = () => {
    setLocalPreferences(preferences)
    setHasChanges(false)
  }

  // Toggle category preference
  const toggleCategoryPreference = (
    category: keyof NotificationPreferencesDetailed['categories'],
    setting: keyof NotificationPreferencesDetailed['categories'][keyof NotificationPreferencesDetailed['categories']]
  ) => {
    updateLocalPreferences({
      categories: {
        ...localPreferences.categories,
        [category]: {
          ...localPreferences.categories[category],
          [setting]: !localPreferences.categories[category][setting]
        }
      }
    })
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
        className
      )}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Notification Preferences
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {[
                { key: 'general', label: 'General', icon: Bell },
                { key: 'categories', label: 'Categories', icon: Users },
                { key: 'timing', label: 'Timing', icon: Clock },
                { key: 'advanced', label: 'Advanced', icon: Zap }
              ].map(section => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key as any)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                    activeSection === section.key
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <section.icon className="w-5 h-5" />
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'general' && (
              <GeneralSettings
                preferences={localPreferences}
                onUpdate={updateLocalPreferences}
              />
            )}

            {activeSection === 'categories' && (
              <CategorySettings
                preferences={localPreferences}
                onToggle={toggleCategoryPreference}
              />
            )}

            {activeSection === 'timing' && (
              <TimingSettings
                preferences={localPreferences}
                onUpdate={updateLocalPreferences}
              />
            )}

            {activeSection === 'advanced' && (
              <AdvancedSettings
                preferences={localPreferences}
                onUpdate={updateLocalPreferences}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// General Settings Component
const GeneralSettings: React.FC<{
  preferences: NotificationPreferencesDetailed
  onUpdate: (updates: Partial<NotificationPreferencesDetailed>) => void
}> = ({ preferences, onUpdate }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        General Settings
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {preferences.enabled ? (
              <Bell className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Enable Notifications
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Turn on/off all notifications
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
)

// Category Settings Component
const CategorySettings: React.FC<{
  preferences: NotificationPreferencesDetailed
  onToggle: (category: keyof NotificationPreferencesDetailed['categories'], setting: string) => void
}> = ({ preferences, onToggle }) => {
  const categories = [
    {
      key: 'pnr_update',
      label: 'PNR Updates',
      description: 'Status changes and journey updates',
      icon: '🚂',
      hasEmail: true,
      hasSMS: true
    },
    {
      key: 'system_alert',
      label: 'System Alerts',
      description: 'Important system messages and warnings',
      icon: '⚠️',
      hasEmail: true,
      hasSMS: false
    },
    {
      key: 'promotion',
      label: 'Promotions',
      description: 'Special offers and deals',
      icon: '🎁',
      hasEmail: true,
      hasSMS: false
    },
    {
      key: 'reminder',
      label: 'Reminders',
      description: 'Journey reminders and alerts',
      icon: '⏰',
      hasEmail: false,
      hasSMS: false
    },
    {
      key: 'achievement',
      label: 'Achievements',
      description: 'Milestones and rewards',
      icon: '🏆',
      hasEmail: false,
      hasSMS: false
    },
    {
      key: 'social',
      label: 'Social',
      description: 'Community updates and interactions',
      icon: '👥',
      hasEmail: false,
      hasSMS: false
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Categories
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Customize notifications for different types of events
        </p>
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryPrefs = preferences.categories[category.key as keyof typeof preferences.categories]
          
          return (
            <div key={category.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {category.label}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryPrefs.enabled}
                    onChange={() => onToggle(category.key as any, 'enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {categoryPrefs.enabled && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryPrefs.sound}
                      onChange={() => onToggle(category.key as any, 'sound')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Volume2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Sound</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryPrefs.vibration}
                      onChange={() => onToggle(category.key as any, 'vibration')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Vibration</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryPrefs.desktop}
                      onChange={() => onToggle(category.key as any, 'desktop')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Desktop</span>
                  </label>

                  {category.hasEmail && (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryPrefs.email}
                        onChange={() => onToggle(category.key as any, 'email')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
                    </label>
                  )}

                  {category.hasSMS && (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryPrefs.sms}
                        onChange={() => onToggle(category.key as any, 'sms')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">SMS</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Timing Settings Component
const TimingSettings: React.FC<{
  preferences: NotificationPreferencesDetailed
  onUpdate: (updates: Partial<NotificationPreferencesDetailed>) => void
}> = ({ preferences, onUpdate }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Timing & Schedule
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Control when you receive notifications
      </p>
    </div>

    {/* Quiet Hours */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Moon className="w-5 h-5 text-gray-500" />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Quiet Hours
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Silence notifications during specific hours
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.quietHours.enabled}
            onChange={(e) => onUpdate({
              quietHours: { ...preferences.quietHours, enabled: e.target.checked }
            })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {preferences.quietHours.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => onUpdate({
                  quietHours: { ...preferences.quietHours, start: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => onUpdate({
                  quietHours: { ...preferences.quietHours, end: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.quietHours.allowUrgent}
              onChange={(e) => onUpdate({
                quietHours: { ...preferences.quietHours, allowUrgent: e.target.checked }
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Allow urgent notifications during quiet hours
            </span>
          </label>
        </div>
      )}
    </div>

    {/* Do Not Disturb */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <BellOff className="w-5 h-5 text-gray-500" />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Do Not Disturb
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completely silence all notifications
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.doNotDisturb.enabled}
            onChange={(e) => onUpdate({
              doNotDisturb: { ...preferences.doNotDisturb, enabled: e.target.checked }
            })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  </div>
)

// Advanced Settings Component
const AdvancedSettings: React.FC<{
  preferences: NotificationPreferencesDetailed
  onUpdate: (updates: Partial<NotificationPreferencesDetailed>) => void
}> = ({ preferences, onUpdate }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Advanced Settings
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Fine-tune notification behavior and intelligence
      </p>
    </div>

    {/* Smart Timing */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Zap className="w-5 h-5 text-gray-500" />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Smart Timing
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered notification timing optimization
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.smartTiming.enabled}
            onChange={(e) => onUpdate({
              smartTiming: { ...preferences.smartTiming, enabled: e.target.checked }
            })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {preferences.smartTiming.enabled && (
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.smartTiming.learnFromBehavior}
              onChange={(e) => onUpdate({
                smartTiming: { ...preferences.smartTiming, learnFromBehavior: e.target.checked }
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Learn from my behavior patterns
            </span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.smartTiming.respectDeviceUsage}
              onChange={(e) => onUpdate({
                smartTiming: { ...preferences.smartTiming, respectDeviceUsage: e.target.checked }
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Respect device usage patterns
            </span>
          </label>
        </div>
      )}
    </div>

    {/* Batch Notifications */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Users className="w-5 h-5 text-gray-500" />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Batch Notifications
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Group similar notifications together
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.batchNotifications.enabled}
            onChange={(e) => onUpdate({
              batchNotifications: { ...preferences.batchNotifications, enabled: e.target.checked }
            })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {preferences.batchNotifications.enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Batch Interval (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={preferences.batchNotifications.interval}
              onChange={(e) => onUpdate({
                batchNotifications: { 
                  ...preferences.batchNotifications, 
                  interval: parseInt(e.target.value) || 15 
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Batch Size
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={preferences.batchNotifications.maxBatchSize}
              onChange={(e) => onUpdate({
                batchNotifications: { 
                  ...preferences.batchNotifications, 
                  maxBatchSize: parseInt(e.target.value) || 5 
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  </div>
)

export default NotificationPreferences