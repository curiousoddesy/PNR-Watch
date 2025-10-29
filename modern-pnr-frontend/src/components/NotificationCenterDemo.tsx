import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, BarChart3, FileText, Plus } from 'lucide-react'
import NotificationCenter from './features/NotificationCenter'
import NotificationPreferences from './features/NotificationPreferences'
import NotificationAnalytics from './features/NotificationAnalytics'
import NotificationTemplates from './features/NotificationTemplates'
import NotificationBadge from './ui/NotificationBadge'
import { useNotificationCenter } from '../hooks/useNotificationCenter'

const NotificationCenterDemo: React.FC = () => {
  const [showCenter, setShowCenter] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  
  const { addNotification } = useNotificationCenter()

  // Add sample notifications on mount
  useEffect(() => {
    const addSampleNotifications = async () => {
      // Add some sample notifications
      await addNotification({
        type: 'pnr_update',
        category: 'important',
        title: 'PNR Status Updated',
        message: 'Your PNR 1234567890 status has been updated to Confirmed',
        actionable: true,
        actions: [
          {
            id: 'view',
            label: 'View Details',
            type: 'primary',
            action: 'view_pnr'
          }
        ],
        source: 'system',
        relatedPNR: '1234567890',
        priority: 8,
        tags: ['pnr', 'confirmed']
      })

      await addNotification({
        type: 'system_alert',
        category: 'urgent',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will begin at 2:00 AM IST',
        actionable: false,
        source: 'system',
        priority: 9,
        tags: ['maintenance', 'system']
      })

      await addNotification({
        type: 'reminder',
        category: 'normal',
        title: 'Journey Reminder',
        message: 'Your train departs in 2 hours from New Delhi',
        actionable: true,
        actions: [
          {
            id: 'snooze',
            label: 'Snooze',
            type: 'secondary',
            action: 'snooze'
          }
        ],
        source: 'system',
        priority: 6,
        tags: ['journey', 'reminder']
      })
    }

    addSampleNotifications()
  }, [addNotification])

  const addTestNotification = async () => {
    await addNotification({
      type: 'pnr_update',
      category: 'important',
      title: 'New PNR Update',
      message: `Test notification created at ${new Date().toLocaleTimeString()}`,
      actionable: true,
      actions: [
        {
          id: 'view',
          label: 'View',
          type: 'primary',
          action: 'view'
        },
        {
          id: 'dismiss',
          label: 'Dismiss',
          type: 'secondary',
          action: 'dismiss'
        }
      ],
      source: 'user',
      priority: 7,
      tags: ['test', 'demo']
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Advanced Notification Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            A comprehensive notification system with categorization, filtering, analytics, and customization
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Notification Center Controls
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <NotificationBadge
                onClick={() => setShowCenter(true)}
                size="lg"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Click to open notification center
              </span>
            </div>
            
            <button
              onClick={() => setShowPreferences(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Preferences</span>
            </button>
            
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Templates</span>
            </button>
            
            <button
              onClick={addTestNotification}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Test Notification</span>
            </button>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="Smart Categorization"
            description="Automatically categorize notifications by type, priority, and source with intelligent filtering"
            icon="🏷️"
          />
          
          <FeatureCard
            title="Advanced Filtering"
            description="Filter by read status, category, date range, tags, and custom search queries"
            icon="🔍"
          />
          
          <FeatureCard
            title="Bulk Operations"
            description="Select multiple notifications for batch operations like mark as read, archive, or delete"
            icon="⚡"
          />
          
          <FeatureCard
            title="Engagement Analytics"
            description="Track notification performance with detailed analytics and engagement metrics"
            icon="📊"
          />
          
          <FeatureCard
            title="Custom Preferences"
            description="Granular control over notification types, timing, quiet hours, and delivery methods"
            icon="⚙️"
          />
          
          <FeatureCard
            title="Smart Scheduling"
            description="AI-powered timing optimization and notification batching for better user experience"
            icon="🧠"
          />
        </div>
      </div>

      {/* Notification Components */}
      <NotificationCenter
        isOpen={showCenter}
        onClose={() => setShowCenter(false)}
      />
      
      <NotificationPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
      
      <NotificationAnalytics
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
      
      <NotificationTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700"
  >
    <div className="text-3xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm">
      {description}
    </p>
  </motion.div>
)

export default NotificationCenterDemo