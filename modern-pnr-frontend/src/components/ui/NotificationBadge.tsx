import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useNotificationCenter } from '../../hooks/useNotificationCenter'
import { cn } from '../../utils/cn'

interface NotificationBadgeProps {
  onClick?: () => void
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onClick,
  className,
  showIcon = true,
  size = 'md'
}) => {
  const { unreadCount } = useNotificationCenter()

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const badgeSizes = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Bell className={cn(
          'text-gray-600 dark:text-gray-400',
          iconSizes[size]
        )} />
      )}
      
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center font-medium',
              badgeSizes[size]
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

export default NotificationBadge