import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useId, useReducedMotion, useListbox } from '../../hooks/useAccessibility'

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export interface AutoCompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect'> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  options: Array<{ value: string; label: string }>
  onSelect?: (option: { value: string; label: string }) => void
  onChange?: (value: string) => void
  filterFunction?: (options: Array<{ value: string; label: string }>, query: string) => Array<{ value: string; label: string }>
}

const inputVariants = {
  initial: { scale: 1 },
  focus: { scale: 1.02 },
  error: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    leftIcon, 
    rightIcon, 
    className, 
    id,
    ...props 
  }, ref) => {
    const fieldId = id || useId('field')
    const errorId = useId('error')
    const helperTextId = useId('helper')
    const prefersReducedMotion = useReducedMotion()

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400">
              {leftIcon}
            </div>
          )}
          
          <motion.input
            ref={ref}
            id={fieldId}
            variants={prefersReducedMotion ? {} : inputVariants}
            initial="initial"
            whileFocus={prefersReducedMotion ? {} : "focus"}
            animate={error && !prefersReducedMotion ? "error" : "initial"}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && errorId,
              helperText && helperTextId
            ).trim() || undefined}
            aria-required={required}
            className={cn(
              'w-full px-3 py-2 border rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
              error 
                ? 'border-error-300 dark:border-error-600' 
                : 'border-secondary-300 dark:border-secondary-600',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...(props as any)}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        <AnimatePresence>
          {(error || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'text-sm',
                error 
                  ? 'text-error-600 dark:text-error-400' 
                  : 'text-secondary-600 dark:text-secondary-400'
              )}
            >
              {error || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

FormField.displayName = 'FormField'

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    resize = 'vertical',
    className, 
    id,
    ...props 
  }, ref) => {
    const fieldId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <motion.textarea
          ref={ref}
          id={fieldId}
          variants={inputVariants}
          initial="initial"
          whileFocus="focus"
          animate={error ? "error" : "initial"}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
            error 
              ? 'border-error-300 dark:border-error-600' 
              : 'border-secondary-300 dark:border-secondary-600',
            resizeClasses[resize],
            className
          )}
          {...(props as any)}
        />
        
        <AnimatePresence>
          {(error || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'text-sm',
                error 
                  ? 'text-error-600 dark:text-error-400' 
                  : 'text-secondary-600 dark:text-secondary-400'
              )}
            >
              {error || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    options,
    placeholder,
    className, 
    id,
    ...props 
  }, ref) => {
    const fieldId = id || `select-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <motion.select
            ref={ref}
            id={fieldId}
            variants={inputVariants}
            initial="initial"
            whileFocus="focus"
            animate={error ? "error" : "initial"}
            className={cn(
              'w-full px-3 py-2 border rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors appearance-none',
              error 
                ? 'border-error-300 dark:border-error-600' 
                : 'border-secondary-300 dark:border-secondary-600',
              className
            )}
            {...(props as any)}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </motion.select>
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <AnimatePresence>
          {(error || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'text-sm',
                error 
                  ? 'text-error-600 dark:text-error-400' 
                  : 'text-secondary-600 dark:text-secondary-400'
              )}
            >
              {error || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Select.displayName = 'Select'

export const AutoComplete = React.forwardRef<HTMLInputElement, AutoCompleteProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    options,
    onSelect,
    onChange,
    filterFunction,
    className, 
    id,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const fieldId = id || `autocomplete-${Math.random().toString(36).substr(2, 9)}`

    const defaultFilter = useCallback((options: Array<{ value: string; label: string }>, query: string) => {
      return options.filter(option => 
        option.label.toLowerCase().includes(query.toLowerCase()) ||
        option.value.toLowerCase().includes(query.toLowerCase())
      )
    }, [])

    const filteredOptions = (filterFunction || defaultFilter)(options, query)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)
      setIsOpen(true)
      onChange?.(value)
    }

    const handleOptionSelect = (option: { value: string; label: string }) => {
      setQuery(option.label)
      setIsOpen(false)
      onSelect?.(option)
    }

    return (
      <div className="space-y-2 relative">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <motion.input
            ref={ref}
            id={fieldId}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            variants={inputVariants}
            initial="initial"
            whileFocus="focus"
            animate={error ? "error" : "initial"}
            className={cn(
              'w-full px-3 py-2 border rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
              error 
                ? 'border-error-300 dark:border-error-600' 
                : 'border-secondary-300 dark:border-secondary-600',
              className
            )}
            {...(props as any)}
          />
          
          <AnimatePresence>
            {isOpen && filteredOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionSelect(option)}
                    className="w-full px-3 py-2 text-left hover:bg-secondary-50 dark:hover:bg-secondary-700 focus:bg-secondary-50 dark:focus:bg-secondary-700 focus:outline-none text-secondary-900 dark:text-secondary-100"
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <AnimatePresence>
          {(error || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'text-sm',
                error 
                  ? 'text-error-600 dark:text-error-400' 
                  : 'text-secondary-600 dark:text-secondary-400'
              )}
            >
              {error || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

AutoComplete.displayName = 'AutoComplete'