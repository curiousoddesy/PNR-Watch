import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  X, 
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Target
} from 'lucide-react'
import { useNotificationCenter } from '../../hooks/useNotificationCenter'
import { cn } from '../../utils/cn'

interface NotificationAnalyticsProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const NotificationAnalytics: React.FC<NotificationAnalyticsProps> = ({
  isOpen,
  onClose,
  className
}) => {
  const { analytics, statistics } = useNotificationCenter()

  // Calculate engagement metrics
  const engagementMetrics = useMemo(() => {
    const totalSent = analytics.totalSent || 0
    const totalViewed = analytics.totalViewed || 0
    const totalClicked = analytics.totalClicked || 0
    const totalDismissed = analytics.totalDismissed || 0

    return {
      viewRate: totalSent > 0 ? (totalViewed / totalSent * 100) : 0,
      clickRate: totalViewed > 0 ? (totalClicked / totalViewed * 100) : 0,
      dismissalRate: totalSent > 0 ? (totalDismissed / totalSent * 100) : 0,
      engagementRate: totalSent > 0 ? ((totalViewed + totalClicked) / totalSent * 100) : 0
    }
  }, [analytics])

  // Get top performing categories
  const topCategories = useMemo(() => {
    return Object.entries(analytics.categoryBreakdown || {})
      .map(([category, data]) => ({
        category,
        ...data,
        engagementRate: data.sent > 0 ? ((data.viewed + data.clicked) / data.sent * 100) : 0
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5)
  }, [analytics.categoryBreakdown])

  // Format time
  const formatTime = (milliseconds: number) => {
    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`
    if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`
    return `${Math.round(milliseconds / 60000)}m`
  }

  // Format percentage
  const formatPercentage = (value: number) => `${Math.round(value * 10) / 10}%`

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
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Notification Analytics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Sent"
              value={analytics.totalSent || 0}
              icon={<Target className="w-5 h-5" />}
              color="blue"
            />
            <MetricCard
              title="View Rate"
              value={formatPercentage(engagementMetrics.viewRate)}
              icon={<Eye className="w-5 h-5" />}
              color="green"
              trend={engagementMetrics.viewRate > 50 ? 'up' : 'down'}
            />
            <MetricCard
              title="Click Rate"
              value={formatPercentage(engagementMetrics.clickRate)}
              icon={<MousePointer className="w-5 h-5" />}
              color="purple"
              trend={engagementMetrics.clickRate > 20 ? 'up' : 'down'}
            />
            <MetricCard
              title="Engagement"
              value={formatPercentage(engagementMetrics.engagementRate)}
              icon={<TrendingUp className="w-5 h-5" />}
              color="orange"
              trend={engagementMetrics.engagementRate > 60 ? 'up' : 'down'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Performance */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Category Performance
              </h3>
              <div className="space-y-4">
                {topCategories.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        index === 0 && 'bg-green-500',
                        index === 1 && 'bg-blue-500',
                        index === 2 && 'bg-purple-500',
                        index === 3 && 'bg-orange-500',
                        index === 4 && 'bg-red-500'
                      )} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {category.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatPercentage(category.engagementRate)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category.sent} sent
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Device Breakdown
              </h3>
              <div className="space-y-4">
                {[
                  { 
                    device: 'Desktop', 
                    count: analytics.deviceMetrics?.desktop || 0, 
                    icon: <Monitor className="w-5 h-5" />,
                    color: 'bg-blue-500'
                  },
                  { 
                    device: 'Mobile', 
                    count: analytics.deviceMetrics?.mobile || 0, 
                    icon: <Smartphone className="w-5 h-5" />,
                    color: 'bg-green-500'
                  },
                  { 
                    device: 'Tablet', 
                    count: analytics.deviceMetrics?.tablet || 0, 
                    icon: <Tablet className="w-5 h-5" />,
                    color: 'bg-purple-500'
                  }
                ].map(device => {
                  const total = (analytics.deviceMetrics?.desktop || 0) + 
                               (analytics.deviceMetrics?.mobile || 0) + 
                               (analytics.deviceMetrics?.tablet || 0)
                  const percentage = total > 0 ? (device.count / total * 100) : 0

                  return (
                    <div key={device.device} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn('p-2 rounded-lg text-white', device.color)}>
                          {device.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {device.device}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatPercentage(percentage)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {device.count} notifications
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timing Metrics */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Response Times
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Average Time to View
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatTime(analytics.averageTimeToView || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MousePointer className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Average Time to Action
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatTime(analytics.averageTimeToAction || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Statistics */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Current Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {statistics.total}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Unread</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {statistics.unread}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Starred</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {statistics.starred}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Archived</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {statistics.archived}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Detailed Category Breakdown
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Viewed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Clicked
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dismissed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Engagement Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(analytics.categoryBreakdown || {}).map(([category, data]) => {
                      const engagementRate = data.sent > 0 ? ((data.viewed + data.clicked) / data.sent * 100) : 0
                      
                      return (
                        <tr key={category} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {category.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {data.sent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {data.viewed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {data.clicked}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {data.dismissed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(engagementRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatPercentage(engagementRate)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  trend?: 'up' | 'down'
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    green: 'bg-green-500 text-green-500 bg-green-50 dark:bg-green-900/20',
    purple: 'bg-purple-500 text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    orange: 'bg-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    red: 'bg-red-500 text-red-500 bg-red-50 dark:bg-red-900/20'
  }

  const [bgColor, textColor, cardBg] = colorClasses[color].split(' ')

  return (
    <div className={cn('rounded-lg p-6 border border-gray-200 dark:border-gray-700', cardBg)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className={cn('p-3 rounded-lg', bgColor)}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp className={cn(
            'w-4 h-4 mr-1',
            trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
          )} />
          <span className={cn(
            'text-sm font-medium',
            trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {trend === 'up' ? 'Good performance' : 'Needs improvement'}
          </span>
        </div>
      )}
    </div>
  )
}

export default NotificationAnalytics