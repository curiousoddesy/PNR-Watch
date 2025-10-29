import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DatePicker from 'react-datepicker'
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  isToday, 
  isTomorrow, 
  isYesterday,
  isWeekend,
  getDay,
  addWeeks,
  addMonths
} from 'date-fns'
import { useIntelligentFeatures } from '../../hooks/useIntelligentFeatures'
import { cn } from '../../utils/cn'

interface DateSuggestion {
  id: string
  label: string
  date: Date
  type: 'quick' | 'smart' | 'pattern'
  confidence?: number
  description?: string
  icon?: string
}

interface SmartDatePickerProps {
  value?: Date
  onChange: (date: Date | null) => void
  placeholder?: string
  className?: string
  containerClassName?: string
  enableSmartSuggestions?: boolean
  enablePatternLearning?: boolean
  minDate?: Date
  maxDate?: Date
  showTimeSelect?: boolean
  timeFormat?: string
  dateFormat?: string
  disabled?: boolean
  error?: string
}

export const SmartDatePicker = forwardRef<HTMLInputElement, SmartDatePickerProps>(({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  containerClassName,
  enableSmartSuggestions = true,
  enablePatternLearning = true,
  minDate,
  maxDate,
  showTimeSelect = false,
  timeFormat = 'HH:mm',
  dateFormat = 'MMM dd, yyyy',
  disabled = false,
  error,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<DateSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [inputValue, setInputValue] = useState('')
  
  const datePickerRef = useRef<DatePicker>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const { addToHistory, analytics } = useIntelligentFeatures({
    enableSmartSuggestions,
    enableAutoComplete: false
  })

  // Generate quick date suggestions
  const generateQuickSuggestions = (): DateSuggestion[] => {
    const today = new Date()
    const suggestions: DateSuggestion[] = []

    // Common quick picks
    suggestions.push(
      {
        id: 'today',
        label: 'Today',
        date: today,
        type: 'quick',
        icon: '📅',
        description: format(today, 'EEEE, MMM dd')
      },
      {
        id: 'tomorrow',
        label: 'Tomorrow',
        date: addDays(today, 1),
        type: 'quick',
        icon: '➡️',
        description: format(addDays(today, 1), 'EEEE, MMM dd')
      },
      {
        id: 'next-week',
        label: 'Next Week',
        date: addDays(today, 7),
        type: 'quick',
        icon: '📆',
        description: format(addDays(today, 7), 'EEEE, MMM dd')
      }
    )

    // Weekend suggestions
    const nextWeekend = getNextWeekend(today)
    if (nextWeekend) {
      suggestions.push({
        id: 'next-weekend',
        label: 'Next Weekend',
        date: nextWeekend,
        type: 'quick',
        icon: '🎉',
        description: format(nextWeekend, 'EEEE, MMM dd')
      })
    }

    // Month suggestions
    suggestions.push(
      {
        id: 'next-month',
        label: 'Next Month',
        date: addMonths(today, 1),
        type: 'quick',
        icon: '📅',
        description: format(addMonths(today, 1), 'MMM dd, yyyy')
      }
    )

    return suggestions
  }

  // Generate smart suggestions based on patterns
  const generateSmartSuggestions = (): DateSuggestion[] => {
    if (!enableSmartSuggestions) return []

    const suggestions: DateSuggestion[] = []
    const today = new Date()

    // Analyze user patterns from analytics
    const { searchPatterns } = analytics
    
    // Common travel patterns
    if (searchPatterns.pnr > 5) {
      // Suggest common travel days (Friday/Monday for weekend trips)
      const nextFriday = getNextDayOfWeek(today, 5) // Friday
      const nextMonday = getNextDayOfWeek(today, 1) // Monday
      
      suggestions.push(
        {
          id: 'next-friday',
          label: 'Next Friday',
          date: nextFriday,
          type: 'smart',
          confidence: 0.7,
          icon: '🚂',
          description: 'Popular travel day'
        },
        {
          id: 'next-monday',
          label: 'Next Monday',
          date: nextMonday,
          type: 'smart',
          confidence: 0.6,
          icon: '🚂',
          description: 'Return journey day'
        }
      )
    }

    // Holiday season suggestions
    const holidaySuggestions = getHolidaySuggestions(today)
    suggestions.push(...holidaySuggestions)

    return suggestions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
  }

  // Generate pattern-based suggestions
  const generatePatternSuggestions = (): DateSuggestion[] => {
    if (!enablePatternLearning) return []

    // This would typically come from stored user patterns
    // For now, we'll simulate some common patterns
    const suggestions: DateSuggestion[] = []
    const today = new Date()

    // Simulate learned patterns (in real app, this would come from user history)
    const commonPatterns = [
      { dayOfWeek: 5, label: 'Your usual Friday travel', confidence: 0.8 },
      { dayOfWeek: 1, label: 'Your usual Monday return', confidence: 0.7 },
      { daysAhead: 14, label: 'Your typical 2-week advance booking', confidence: 0.6 }
    ]

    commonPatterns.forEach((pattern, index) => {
      let date: Date
      if (pattern.dayOfWeek !== undefined) {
        date = getNextDayOfWeek(today, pattern.dayOfWeek)
      } else {
        date = addDays(today, pattern.daysAhead || 7)
      }

      suggestions.push({
        id: `pattern-${index}`,
        label: pattern.label,
        date,
        type: 'pattern',
        confidence: pattern.confidence,
        icon: '🎯',
        description: format(date, 'EEEE, MMM dd')
      })
    })

    return suggestions
  }

  // Update suggestions when component mounts or smart suggestions are enabled
  useEffect(() => {
    const quickSuggestions = generateQuickSuggestions()
    const smartSuggestions = generateSmartSuggestions()
    const patternSuggestions = generatePatternSuggestions()
    
    const allSuggestions = [
      ...quickSuggestions,
      ...smartSuggestions,
      ...patternSuggestions
    ].filter(suggestion => {
      // Filter out dates outside min/max range
      if (minDate && suggestion.date < minDate) return false
      if (maxDate && suggestion.date > maxDate) return false
      return true
    })

    setSuggestions(allSuggestions)
  }, [enableSmartSuggestions, enablePatternLearning, minDate, maxDate, analytics])

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: DateSuggestion) => {
    onChange(suggestion.date)
    setIsOpen(false)
    setSelectedSuggestion(-1)
    
    // Learn from selection
    if (enablePatternLearning) {
      addToHistory(format(suggestion.date, 'yyyy-MM-dd'), 'pnr', 1)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedSuggestion])
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedSuggestion(-1)
        break
    }
  }

  // Utility functions
  const getNextWeekend = (date: Date): Date | null => {
    const saturday = getNextDayOfWeek(date, 6)
    return saturday
  }

  const getNextDayOfWeek = (date: Date, dayOfWeek: number): Date => {
    const currentDay = getDay(date)
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7
    return addDays(date, daysUntilTarget === 0 ? 7 : daysUntilTarget)
  }

  const getHolidaySuggestions = (date: Date): DateSuggestion[] => {
    // This would typically integrate with a holiday API
    // For now, we'll return some common holiday periods
    const suggestions: DateSuggestion[] = []
    const year = date.getFullYear()
    
    // Add some common holiday suggestions (simplified)
    const holidays = [
      { name: 'Diwali Weekend', month: 10, day: 15, icon: '🪔' },
      { name: 'Christmas', month: 11, day: 25, icon: '🎄' },
      { name: 'New Year', month: 0, day: 1, icon: '🎊' }
    ]

    holidays.forEach(holiday => {
      const holidayDate = new Date(year, holiday.month, holiday.day)
      if (holidayDate > date) {
        suggestions.push({
          id: `holiday-${holiday.name}`,
          label: holiday.name,
          date: holidayDate,
          type: 'smart',
          confidence: 0.5,
          icon: holiday.icon,
          description: 'Holiday travel'
        })
      }
    })

    return suggestions
  }

  return (
    <div className={cn('relative w-full', containerClassName)}>
      <div className="relative">
        <DatePicker
          ref={datePickerRef}
          selected={value}
          onChange={onChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholderText={placeholder}
          dateFormat={showTimeSelect ? `${dateFormat} ${timeFormat}` : dateFormat}
          showTimeSelect={showTimeSelect}
          timeFormat={timeFormat}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
            'dark:focus:ring-blue-400',
            error && 'border-red-300 dark:border-red-600',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {isOpen && suggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto dark:bg-gray-800 dark:border-gray-600"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                  Quick Suggestions
                </div>
                
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700',
                      selectedSuggestion === index && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    onMouseEnter={() => setSelectedSuggestion(index)}
                  >
                    <span className="text-lg mr-3" role="img">
                      {suggestion.icon}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {suggestion.label}
                        </span>
                        {suggestion.type === 'smart' && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            Smart
                          </span>
                        )}
                        {suggestion.type === 'pattern' && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                            Pattern
                          </span>
                        )}
                      </div>
                      {suggestion.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                    
                    {suggestion.confidence && (
                      <div className="ml-2">
                        <div 
                          className={cn(
                            'w-2 h-2 rounded-full',
                            suggestion.confidence > 0.7 ? 'bg-green-500' :
                            suggestion.confidence > 0.5 ? 'bg-yellow-500' : 'bg-gray-400'
                          )}
                          title={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
})

SmartDatePicker.displayName = 'SmartDatePicker'