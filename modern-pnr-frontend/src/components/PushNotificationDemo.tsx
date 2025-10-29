import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, 
  Send, 
  Settings, 
  BarChart3, 
  TestTube, 
  Clock,
  Image,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'
import { usePushNotifications } from '../services/pushNotificationService'
import { pushNotificationService } from '../services/pushNotificationService'

const PushNotificationDemo: React.FC = () => {
  const {
    supported,
    permission,
    subscribed,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    testNotification,
    showNotification
  } = usePushNotifications()

  const [abTestId, setAbTestId] = useState<string>('')
  const [batchId, setBatchId] = useState<string>('')

  // Create sample A/B test on mount
  useEffect(() => {
    const createSampleABTest = async () => {
      const testId = await pushNotificationService.createABTest({
        id: 'pnr_update_test',
        name: 'PNR Update Notification Test',
        isActive: true,
        startDate: Date.now(),
        endDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        variants: [
          {
            id: 'variant_a',
            name: 'Standard Message',
            title: 'PNR Status Updated',
            message: 'Your PNR status has been updated. Check the latest information.',
            weight: 50
          },
          {
            id: 'variant_b',
            name: 'Urgent Message',
            title: '🚨 Important PNR Update',
            message: 'URGENT: Your PNR status changed! Immediate action may be required.',
            weight: 50,
            actions: [
              { action: 'urgent_view', title: 'View Now', icon: '/icons/urgent.png' },
              { action: 'dismiss', title: 'Later' }
            ]
          }
        ]
      })
      setAbTestId(testId)
    }

    createSampleABTest()
  }, [])

  const sendRichNotification = async () => {
    await pushNotificationService.showRichNotification({
      title: 'Rich Notification Demo',
      body: 'This is a rich notification with image, custom vibration, and actions',
      image: '/demo-notification-image.jpg',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'rich-demo',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png'
        },
        {
          action: 'share',
          title: 'Share',
          icon: '/icons/share.png'
        },
        {
          action: 'snooze',
          title: 'Snooze 15m',
          icon: '/icons/snooze.png'
        }
      ],
      data: {
        url: '/notifications/demo',
        trackingParams: {
          source: 'demo',
          campaign: 'rich_notification'
        }
      }
    })
  }

  const sendBatchNotifications = async () => {
    const notifications = [
      {
        title: 'Batch Notification 1',
        body: 'First notification in the batch',
        tag: 'batch-1'
      },
      {
        title: 'Batch Notification 2', 
        body: 'Second notification in the batch',
        tag: 'batch-2'
      },
      {
        title: 'Batch Notification 3',
        body: 'Third notification in the batch', 
        tag: 'batch-3'
      }
    ]

    const batchId = await pushNotificationService.scheduleNotificationBatch(
      notifications,
      5000, // 5 seconds delay
      {
        batchSize: 2,
        priority: 'normal',
        intelligentTiming: true
      }
    )
    setBatchId(batchId)
  }

  const sendABTestNotification = async () => {
    if (!abTestId) return

    await pushNotificationService.sendNotificationWithABTest(
      abTestId,
      {
        icon: '/pwa-192x192.png',
        tag: 'ab-test-demo',
        data: {
          url: '/pnr/status',
          pnrNumber: '1234567890'
        }
      },
      'demo-user-123'
    )
  }

  const getABTestResults = () => {
    if (!abTestId) return null
    return pushNotificationService.getABTestResults(abTestId)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Advanced Push Notification System
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Rich notifications, A/B testing, intelligent batching, and deep linking
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Push Notification Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusCard
              title="Browser Support"
              value={supported ? 'Supported' : 'Not Supported'}
              icon={<Monitor className="w-5 h-5" />}
              status={supported ? 'success' : 'error'}
            />
            
            <StatusCard
              title="Permission"
              value={permission}
              icon={<Bell className="w-5 h-5" />}
              status={permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning'}
            />
            
            <StatusCard
              title="Subscription"
              value={subscribed ? 'Active' : 'Inactive'}
              icon={<Smartphone className="w-5 h-5" />}
              status={subscribed ? 'success' : 'warning'}
            />
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            {!subscribed ? (
              <button
                onClick={subscribe}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>Subscribe to Push Notifications</span>
              </button>
            ) : (
              <button
                onClick={unsubscribe}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>Unsubscribe</span>
              </button>
            )}
            
            <button
              onClick={testNotification}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <TestTube className="w-4 h-4" />
              <span>Test Basic Notification</span>
            </button>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Rich Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Image className="w-5 h-5 mr-2" />
              Rich Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Send notifications with images, custom vibration patterns, and multiple actions
            </p>
            <button
              onClick={sendRichNotification}
              disabled={!subscribed}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Rich Notification
            </button>
          </div>

          {/* Batch Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Send className="w-5 h-5 mr-2" />
              Batch Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Schedule multiple notifications with intelligent timing and batching
            </p>
            <button
              onClick={sendBatchNotifications}
              disabled={!subscribed}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Batch Notifications
            </button>
            {batchId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Batch ID: {batchId}
              </p>
            )}
          </div>

          {/* A/B Testing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              A/B Testing
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Test different notification variants and track performance metrics
            </p>
            <div className="space-y-2">
              <button
                onClick={sendABTestNotification}
                disabled={!subscribed || !abTestId}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send A/B Test Notification
              </button>
              {abTestId && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Test ID: {abTestId}
                </p>
              )}
            </div>
          </div>

          {/* Smart Timing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Smart Timing
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              AI-powered notification timing optimization based on user behavior
            </p>
            <button
              onClick={async () => {
                const delay = await pushNotificationService.optimizeNotificationTiming({
                  title: 'Optimized Notification',
                  body: 'This notification was sent at the optimal time for you'
                })
                
                setTimeout(() => {
                  showNotification({
                    title: 'Optimized Notification',
                    body: 'This notification was sent at the optimal time for you',
                    tag: 'optimized-timing'
                  })
                }, delay)
              }}
              disabled={!subscribed}
              className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Optimally Timed Notification
            </button>
          </div>
        </div>

        {/* A/B Test Results */}
        {abTestId && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              A/B Test Results
            </h3>
            <ABTestResults testId={abTestId} />
          </div>
        )}
      </div>
    </div>
  )
}

interface StatusCardProps {
  title: string
  value: string
  icon: React.ReactNode
  status: 'success' | 'warning' | 'error'
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, icon, status }) => {
  const statusColors = {
    success: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
  }

  return (
    <div className={`rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

interface ABTestResultsProps {
  testId: string
}

const ABTestResults: React.FC<ABTestResultsProps> = ({ testId }) => {
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    const updateResults = () => {
      const testResults = pushNotificationService.getABTestResults(testId)
      setResults(testResults)
    }

    updateResults()
    const interval = setInterval(updateResults, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [testId])

  if (!results) return <div>Loading results...</div>

  return (
    <div className="space-y-4">
      {results.variants.map((variant: any) => {
        const metrics = results.metrics[variant.id]
        return (
          <div key={variant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {variant.name} (Weight: {variant.weight}%)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Sent:</span>
                <span className="ml-2 font-medium">{metrics.sent}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Clicked:</span>
                <span className="ml-2 font-medium">{metrics.clicked}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Dismissed:</span>
                <span className="ml-2 font-medium">{metrics.dismissed}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Conversion:</span>
                <span className="ml-2 font-medium">{metrics.conversionRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PushNotificationDemo