import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AutoCompleteSuggestion } from '../../types'
import { useIntelligentFeatures } from '../../hooks/useIntelligentFeatures'
import { cn } from '../../utils/cn'

interface PredictiveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  type?: 'pnr' | 'station' | 'train' | 'passenger'
  onValueChange?: (value: string) => void
  onPredictionAccept?: (prediction: string) => void
  showInlinePrediction?: boolean
  showDropdownSuggestions?: boolean
  enableLearning?: boolean
  minCharsForPrediction?: number
  maxPredictions?: number
  placeholder?: string
  className?: string
  containerClassName?: string
}

export const PredictiveInput = forwardRef<HTMLInputElement, PredictiveInputProps>(({
  type = 'pnr',
  onValueChange,
  onPredictionAccept,
  showInlinePrediction = true,
  showDropdownSuggestions = true,
  enableLearning = true,
  minCharsForPrediction = 2,
  maxPredictions = 5,
  placeholder,
  className,
  containerClassName,
  value: controlledValue,
  ...props
}, ref) => {
  const [value, setValue] = useState(controlledValue || '')
  const [inlinePrediction, setInlinePrediction] = useState('')
  const [showPrediction, setShowPrediction] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const predictionRef = useRef<HTMLSpanElement>(null)
  
  const {
    suggestions,
    getSuggestions,
    clearSuggestions,
    addToHistory,
    isLoadingSuggestions
  } = useIntelligentFeatures({
    enableAutoComplete: showDropdownSuggestions,
    enableSmartSuggestions: false
  })

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue as string)
    }
  }, [controlledValue])

  // Generate inline prediction
  useEffect(() => {
    if (
      value.length >= minCharsForPrediction && 
      showInlinePrediction && 
      isFocused &&
      cursorPosition === value.length // Only show prediction at end of input
    ) {
      generateInlinePrediction(value)
    } else {
      setInlinePrediction('')
      setShowPrediction(false)
    }
  }, [value, minCharsForPrediction, showInlinePrediction, isFocused, cursorPosition])

  // Get dropdown suggestions
  useEffect(() => {
    if (value.length >= minCharsForPrediction && showDropdownSuggestions && isFocused) {
      getSuggestions(value, type)
    } else {
      clearSuggestions()
    }
  }, [value, type, showDropdownSuggestions, getSuggestions, clearSuggestions, isFocused, minCharsForPrediction])

  const generateInlinePrediction = (inputValue: string) => {
    // Get the best suggestion for inline prediction
    const tempSuggestions = suggestions.length > 0 ? suggestions : []
    
    // Find the best matching suggestion
    const bestMatch = tempSuggestions.find(suggestion => 
      suggestion.value.toLowerCase().startsWith(inputValue.toLowerCase()) &&
      suggestion.value.length > inputValue.length &&
      suggestion.confidence > 0.6
    )

    if (bestMatch) {
      const prediction = bestMatch.value.slice(inputValue.length)
      setInlinePrediction(prediction)
      setShowPrediction(true)
    } else {
      // Generate pattern-based prediction
      const patternPrediction = generatePatternPrediction(inputValue)
      if (patternPrediction) {
        setInlinePrediction(patternPrediction)
        setShowPrediction(true)
      } else {
        setInlinePrediction('')
        setShowPrediction(false)
      }
    }
  }

  const generatePatternPrediction = (inputValue: string): string => {
    // Simple pattern-based prediction for PNR numbers
    if (type === 'pnr' && /^\d+$/.test(inputValue)) {
      const remainingDigits = 10 - inputValue.length
      if (remainingDigits > 0 && remainingDigits <= 7) {
        // Generate likely continuation based on common patterns
        return '0'.repeat(remainingDigits)
      }
    }
    
    // Pattern-based prediction for stations
    if (type === 'station' && inputValue.length >= 2) {
      const commonStations = [
        'New Delhi', 'Mumbai Central', 'Chennai Central', 'Kolkata',
        'Bangalore', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
      ]
      
      const match = commonStations.find(station => 
        station.toLowerCase().startsWith(inputValue.toLowerCase()) &&
        station.length > inputValue.length
      )
      
      if (match) {
        return match.slice(inputValue.length)
      }
    }
    
    return ''
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const newCursorPosition = e.target.selectionStart || 0
    
    setValue(newValue)
    setCursorPosition(newCursorPosition)
    onValueChange?.(newValue)
    
    // Clear prediction if user is editing in the middle
    if (newCursorPosition < newValue.length) {
      setInlinePrediction('')
      setShowPrediction(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Accept inline prediction with Tab or Right Arrow
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && showPrediction && inlinePrediction) {
      e.preventDefault()
      const newValue = value + inlinePrediction
      setValue(newValue)
      onValueChange?.(newValue)
      onPredictionAccept?.(newValue)
      
      if (enableLearning) {
        addToHistory(newValue, type, 1)
      }
      
      setInlinePrediction('')
      setShowPrediction(false)
      return
    }
    
    // Clear prediction on Escape
    if (e.key === 'Escape' && showPrediction) {
      e.preventDefault()
      setInlinePrediction('')
      setShowPrediction(false)
      return
    }
    
    props.onKeyDown?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    setCursorPosition(e.target.selectionStart || 0)
    props.onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    setInlinePrediction('')
    setShowPrediction(false)
    props.onBlur?.(e)
  }

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement
    setCursorPosition(target.selectionStart || 0)
    props.onClick?.(e)
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement
    setCursorPosition(target.selectionStart || 0)
    props.onKeyUp?.(e)
  }

  return (
    <div className={cn('relative w-full', containerClassName)}>
      <div className="relative">
        {/* Input field */}
        <input
          ref={ref || inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200 relative z-10 bg-transparent',
            'dark:border-gray-600 dark:text-white',
            'dark:focus:ring-blue-400',
            className
          )}
          {...props}
        />
        
        {/* Inline prediction overlay */}
        {showInlinePrediction && showPrediction && inlinePrediction && (
          <div className="absolute inset-0 pointer-events-none flex items-center">
            <div className="px-4 py-2 flex">
              <span className="invisible">{value}</span>
              <motion.span
                ref={predictionRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="text-gray-400 dark:text-gray-500"
              >
                {inlinePrediction}
              </motion.span>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoadingSuggestions && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* Prediction hint */}
      <AnimatePresence>
        {showPrediction && inlinePrediction && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 top-full mt-1 z-20"
          >
            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg">
              Press Tab or → to accept
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown suggestions */}
      {showDropdownSuggestions && (
        <AnimatePresence>
          {suggestions.length > 0 && isFocused && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto dark:bg-gray-800 dark:border-gray-600"
            >
              {suggestions.slice(0, maxPredictions).map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  onClick={() => {
                    setValue(suggestion.value)
                    onValueChange?.(suggestion.value)
                    onPredictionAccept?.(suggestion.value)
                    
                    if (enableLearning) {
                      addToHistory(suggestion.value, type, 1)
                    }
                    
                    clearSuggestions()
                    inputRef.current?.focus()
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.value}
                    </div>
                    {suggestion.metadata?.fromHistory && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Recently used
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-2 flex items-center">
                    <div 
                      className={cn(
                        'w-2 h-2 rounded-full',
                        suggestion.confidence > 0.8 ? 'bg-green-500' :
                        suggestion.confidence > 0.5 ? 'bg-yellow-500' : 'bg-gray-400'
                      )}
                      title={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
})

PredictiveInput.displayName = 'PredictiveInput'