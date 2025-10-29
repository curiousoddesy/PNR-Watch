import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SmartSuggestion } from '../../types'
import { useSmartSuggestions } from '../../hooks/useIntelligentFeatures'
import { cn } from '../../utils/cn'

interface SmartSuggestionsProps {
  context?: Record<string, any>
  onSuggestionClick?: (suggestion: SmartSuggestion) => void
  className?: string
  maxSuggestions?: number
  showTitle?: boolean
  layout?: 'grid' | 'list'
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  context = {},
  onSuggestionClick,
  className,
  maxSuggestions = 6,
  showTitle = true,
  layout = 'grid'
}) => {
  const { suggestions, refresh, isLoading } = useSmartSuggestions()

  useEffect(() => {
    refresh(context)
  }, [context, refresh])

  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    onSuggestionClick?.(suggestion)
    
    // Execute the suggestion action
    switch (suggestion.action.split(':')[0]) {
      case 'check_pnr':
        const pnr = suggestion.action.split(':')[1]
        // Navigate to PNR check with the PNR number
        console.log('Checking PNR:', pnr)
        break
      case 'search_route':
        const route = suggestion.action.split(':')[1]
        // Navigate to route search
        console.log('Searching route:', route)
        break
      case 'check_today_travel':
        // Navigate to today's travel
        console.log('Checking today\'s travel')
        break
      case 'check_upcoming_travel':
        // Navigate to upcoming travel
        console.log('Checking upcoming travel')
        break
      default:
        console.log('Unknown action:', suggestion.action)
    }
  }

  const getSuggestionIcon = (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'quick_action':
        return '⚡'
      case 'contextual':
        return '🎯'
      case 'predictive':
        return '🔮'
      default:
        return '💡'
    }
  }

  const getSuggestionColor = (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'quick_action':
        return 'from-blue-500 to-blue-600'
      case 'contextual':
        return 'from-green-500 to-green-600'
      case 'predictive':
        return 'from-purple-500 to-purple-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Smart Suggestions
          </h3>
        )}
        <div className={cn(
          layout === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        )}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-20"
            />
          ))}
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  const displayedSuggestions = suggestions.slice(0, maxSuggestions)

  return (
    <div className={cn('space-y-4', className)}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Smart Suggestions
          </h3>
          <button
            onClick={() => refresh(context)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      <div className={cn(
        layout === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
      )}>
        <AnimatePresence>
          {displayedSuggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative overflow-hidden rounded-lg cursor-pointer',
                'bg-gradient-to-r text-white',
                'shadow-md hover:shadow-lg transition-all duration-200',
                getSuggestionColor(suggestion)
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl" role="img" aria-label={suggestion.type}>
                    {getSuggestionIcon(suggestion)}
                  </span>
                  <div className="flex items-center space-x-1">
                    {suggestion.confidence > 0.8 && (
                      <div className="w-2 h-2 bg-white rounded-full opacity-80" />
                    )}
                    {suggestion.confidence > 0.6 && (
                      <div className="w-2 h-2 bg-white rounded-full opacity-60" />
                    )}
                    {suggestion.confidence > 0.4 && (
                      <div className="w-2 h-2 bg-white rounded-full opacity-40" />
                    )}
                  </div>
                </div>
                
                <h4 className="font-semibold text-white mb-1 line-clamp-1">
                  {suggestion.title}
                </h4>
                
                <p className="text-sm text-white/80 line-clamp-2">
                  {suggestion.description}
                </p>
                
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-white/60 capitalize">
                    {suggestion.type.replace('_', ' ')}
                  </span>
                  <motion.div
                    whileHover={{ x: 2 }}
                    className="text-white/80"
                  >
                    →
                  </motion.div>
                </div>
              </div>
              
              {/* Confidence indicator */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-white/30"
                style={{ width: `${suggestion.confidence * 100}%` }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {suggestions.length > maxSuggestions && (
        <div className="text-center">
          <button
            onClick={() => refresh(context)}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Show more suggestions ({suggestions.length - maxSuggestions} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

// Quick Actions Component - specialized for quick actions only
export const QuickActions: React.FC<Omit<SmartSuggestionsProps, 'layout'>> = (props) => {
  return (
    <SmartSuggestions
      {...props}
      layout="list"
      maxSuggestions={3}
      showTitle={false}
      className={cn('space-y-2', props.className)}
    />
  )
}

// Contextual Suggestions Component - for context-aware suggestions
export const ContextualSuggestions: React.FC<SmartSuggestionsProps> = (props) => {
  return (
    <SmartSuggestions
      {...props}
      layout="grid"
      maxSuggestions={4}
      showTitle={true}
    />
  )
}