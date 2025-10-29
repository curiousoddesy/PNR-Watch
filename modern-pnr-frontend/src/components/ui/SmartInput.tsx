import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AutoCompleteSuggestion } from '../../types'
import { useIntelligentFeatures } from '../../hooks/useIntelligentFeatures'
import { cn } from '../../utils/cn'

interface SmartInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  type?: 'pnr' | 'station' | 'train' | 'passenger'
  onValueChange?: (value: string) => void
  onSuggestionSelect?: (suggestion: AutoCompleteSuggestion) => void
  showSuggestions?: boolean
  maxSuggestions?: number
  placeholder?: string
  className?: string
  containerClassName?: string
  suggestionsClassName?: string
  enableHistory?: boolean
  enableSmartSuggestions?: boolean
}

export const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(({
  type = 'pnr',
  onValueChange,
  onSuggestionSelect,
  showSuggestions = true,
  maxSuggestions = 8,
  placeholder,
  className,
  containerClassName,
  suggestionsClassName,
  enableHistory = true,
  enableSmartSuggestions = false,
  value: controlledValue,
  ...props
}, ref) => {
  const [value, setValue] = useState(controlledValue || '')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const {
    suggestions,
    getSuggestions,
    clearSuggestions,
    addToHistory,
    isLoadingSuggestions
  } = useIntelligentFeatures({
    enableAutoComplete: showSuggestions,
    enableSmartSuggestions
  })

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue as string)
    }
  }, [controlledValue])

  // Get suggestions when value changes
  useEffect(() => {
    if (value && showSuggestions && isFocused) {
      getSuggestions(value, type)
      setIsOpen(true)
      setSelectedIndex(-1)
    } else {
      clearSuggestions()
      setIsOpen(false)
    }
  }, [value, type, showSuggestions, getSuggestions, clearSuggestions, isFocused])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onValueChange?.(newValue)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AutoCompleteSuggestion) => {
    setValue(suggestion.value)
    onValueChange?.(suggestion.value)
    onSuggestionSelect?.(suggestion)
    
    if (enableHistory) {
      addToHistory(suggestion.value, type, 1)
    }
    
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      props.onKeyDown?.(e)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex])
        } else if (value && enableHistory) {
          addToHistory(value, type, 0)
          setIsOpen(false)
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
      
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault()
          handleSuggestionSelect(suggestions[selectedIndex])
        } else {
          setIsOpen(false)
        }
        break
      
      default:
        props.onKeyDown?.(e)
    }
  }

  // Handle focus events
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    if (value && showSuggestions) {
      setIsOpen(true)
    }
    props.onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay blur to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false)
      setIsOpen(false)
      setSelectedIndex(-1)
    }, 150)
    props.onBlur?.(e)
  }

  // Format suggestion display
  const formatSuggestionValue = (suggestion: AutoCompleteSuggestion) => {
    if (suggestion.metadata?.fromHistory) {
      return `${suggestion.value} (recent)`
    }
    if (suggestion.metadata?.fromPattern) {
      return `${suggestion.value} (frequent)`
    }
    return suggestion.value
  }

  // Get suggestion icon
  const getSuggestionIcon = (suggestion: AutoCompleteSuggestion) => {
    if (suggestion.metadata?.fromHistory) {
      return '🕒'
    }
    if (suggestion.metadata?.fromPattern) {
      return '⭐'
    }
    switch (suggestion.type) {
      case 'pnr': return '🎫'
      case 'station': return '🚉'
      case 'train': return '🚂'
      case 'passenger': return '👤'
      default: return '💡'
    }
  }

  return (
    <div className={cn('relative w-full', containerClassName)}>
      <div className="relative">
        <input
          ref={ref || inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
            'dark:focus:ring-blue-400',
            isLoadingSuggestions && 'pr-10',
            className
          )}
          {...props}
        />
        
        {/* Loading indicator */}
        {isLoadingSuggestions && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg',
              'max-h-64 overflow-y-auto',
              'dark:bg-gray-800 dark:border-gray-600',
              suggestionsClassName
            )}
          >
            {suggestions.slice(0, maxSuggestions).map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  'flex items-center px-4 py-3 cursor-pointer transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  selectedIndex === index && 'bg-blue-50 dark:bg-blue-900/20',
                  'border-b border-gray-100 dark:border-gray-700 last:border-b-0'
                )}
                onClick={() => handleSuggestionSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="text-lg mr-3" role="img" aria-label={suggestion.type}>
                  {getSuggestionIcon(suggestion)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {formatSuggestionValue(suggestion)}
                  </div>
                  {suggestion.metadata?.fromHistory && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Used recently
                    </div>
                  )}
                  {suggestion.metadata?.fromPattern && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Frequently used
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {suggestion.confidence > 0.8 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="High confidence" />
                  )}
                  {suggestion.confidence > 0.5 && suggestion.confidence <= 0.8 && (
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Medium confidence" />
                  )}
                  {suggestion.confidence <= 0.5 && (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" title="Low confidence" />
                  )}
                </div>
              </motion.div>
            ))}
            
            {/* Show more indicator */}
            {suggestions.length > maxSuggestions && (
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
                {suggestions.length - maxSuggestions} more suggestions available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

SmartInput.displayName = 'SmartInput'