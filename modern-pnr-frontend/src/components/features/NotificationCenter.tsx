import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Settings, 
  Search, 
  Filter, 
  Archive, 
  Star, 
  Trash2, 
  CheckCircle, 
  Circle,
  MoreVertical,
  X,
  Clock,
  AlertTriangle,
  Info,
  Gift,
  Users,
  Train
} from 'lucide-react'
import { useNotificationCenter } from '../../hooks/useNotificationCenter'
import { InAppNotification, NotificationFilter } from '../../types'
import { cn } from '../../utils/cn'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  className
}) => {
  const {
    notifications,
    statistics,
    unreadCount,
    loading,
    error,
    filter,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    toggleStar,
    deleteNotification,
    executeAction,
    setFilter,
    filterHelpers,
    sortHelpers,
    bulkOperations
  } = useNotificationCenter()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'starred' | 'archived'>('all')

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    let filtered = notifications

    switch (activeTab) {
      case 'unread':
        filtered = notifications.filter(n => !n.read)
        break
      case 'starred':
        filtered = notifications.filter(n => n.starred)
        break
      case 'archived':
        filtered = notifications.filter(n => n.archived)
        break
      default:
        filtered = notifications.filter(n => !n.archived)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [notifications, activeTab, searchQuery])

  // Handle notification selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedNotifications)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedNotifications(newSelection)
  }

  const selectAll = () => {
    setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)))
  }

  const clearSelection = () => {
    setSelectedNotifications(new Set())
  }

  // Get notification icon
  const getNotificationIcon = (notification: InAppNotification) => {
    switch (notification.type) {
      case 'pnr_update':
        return <Train className="w-5 h-5 text-blue-500" />
      case 'system_alert':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'promotion':
        return <Gift className="w-5 h-5 text-green-500" />
      case 'reminder':
        return <Clock className="w-5 h-5 text-purple-500" />
      case 'social':
        return <Users className="w-5 h-5 text-pink-500" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  // Get category color
  const getCategoryColor = (category: InAppNotification['category']) => {
    switch (category) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'important':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20'
      case 'normal':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
      default:
        return 'border-l-gray-300 bg-white dark:bg-gray-800'
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col',
        'border-l border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'all', label: 'All', count: statistics.total - statistics.archived },
          { key: 'unread', label: 'Unread', count: statistics.unread },
          { key: 'starred', label: 'Starred', count: statistics.starred },
          { key: 'archived', label: 'Archived', count: statistics.archived }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {selectedNotifications.size} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => bulkOperations.markAsRead(Array.from(selectedNotifications))}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              title="Mark as read"
            >
              <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={() => bulkOperations.star(Array.from(selectedNotifications))}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              title="Star"
            >
              <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={() => bulkOperations.archive(Array.from(selectedNotifications))}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              title="Archive"
            >
              <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={() => bulkOperations.delete(Array.from(selectedNotifications))}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {selectedNotifications.size === 0 && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Select all
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => sortHelpers.byTimestamp('desc')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Sort by newest"
            >
              <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && filteredNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === 'unread' ? 'All caught up!' : 'You have no notifications yet.'}
            </p>
          </div>
        )}

        <AnimatePresence>
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isSelected={selectedNotifications.has(notification.id)}
              onSelect={() => toggleSelection(notification.id)}
              onMarkAsRead={() => markAsRead(notification.id)}
              onStar={() => toggleStar(notification.id)}
              onArchive={() => archiveNotification(notification.id)}
              onDelete={() => deleteNotification(notification.id)}
              onExecuteAction={(actionId) => executeAction(notification.id, actionId)}
              getIcon={getNotificationIcon}
              getCategoryColor={getCategoryColor}
              formatTimestamp={formatTimestamp}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

interface NotificationItemProps {
  notification: InAppNotification
  isSelected: boolean
  onSelect: () => void
  onMarkAsRead: () => void
  onStar: () => void
  onArchive: () => void
  onDelete: () => void
  onExecuteAction: (actionId: string) => void
  getIcon: (notification: InAppNotification) => React.ReactNode
  getCategoryColor: (category: InAppNotification['category']) => string
  formatTimestamp: (timestamp: number) => string
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onStar,
  onArchive,
  onDelete,
  onExecuteAction,
  getIcon,
  getCategoryColor,
  formatTimestamp
}) => {
  const [showActions, setShowActions] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'border-l-4 p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
        getCategoryColor(notification.category),
        !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10',
        isSelected && 'bg-blue-100 dark:bg-blue-900/30'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        {/* Selection checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className="mt-1"
        >
          {isSelected ? (
            <CheckCircle className="w-5 h-5 text-blue-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getIcon(notification)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={cn(
                'text-sm font-medium text-gray-900 dark:text-white',
                !notification.read && 'font-semibold'
              )}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {notification.message}
              </p>
              
              {/* Tags */}
              {notification.tags && notification.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {notification.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {notification.actions.map(action => (
                    <button
                      key={action.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onExecuteAction(action.id)
                      }}
                      className={cn(
                        'px-3 py-1 text-xs rounded-md transition-colors',
                        action.type === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
                        action.type === 'secondary' && 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                        action.type === 'destructive' && 'bg-red-500 text-white hover:bg-red-600'
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-1 ml-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(notification.timestamp)}
              </span>
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowActions(!showActions)
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>

                {showActions && (
                  <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onMarkAsRead()
                          setShowActions(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark read</span>
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStar()
                        setShowActions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Star className={cn('w-4 h-4', notification.starred && 'fill-yellow-400 text-yellow-400')} />
                      <span>{notification.starred ? 'Unstar' : 'Star'}</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onArchive()
                        setShowActions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                        setShowActions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default NotificationCenter