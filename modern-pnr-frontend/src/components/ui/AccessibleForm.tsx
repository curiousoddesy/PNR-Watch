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

export const AccessibleFormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
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

    const describedBy = [
      error && errorId,
      helperText && helperTextId
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-text"
          >
            {label}
            {required && <span className="text-error ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" aria-hidden="true">
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
            aria-describedby={describedBy}
            aria-required={required}
            className={cn(
              'w-full px-3 py-2 border rounded-md bg-background text-text placeholder-text-secondary',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
              'high-contrast:border-2',
              error 
                ? 'border-error' 
                : 'border-border',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-sm text-error"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div
            id={helperTextId}
            className="text-sm text-text-secondary"
          >
            {helperText}
          </div>
        )}
      </div>
    )
  }
)

AccessibleFormField.displayName = 'AccessibleFormField'

export const AccessibleTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
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
    const fieldId = id || useId('textarea')
    const errorId = useId('error')
    const helperTextId = useId('helper')
    const prefersReducedMotion = useReducedMotion()
    
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    const describedBy = [
      error && errorId,
      helperText && helperTextId
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-text"
          >
            {label}
            {required && <span className="text-error ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <motion.textarea
          ref={ref}
          id={fieldId}
          variants={prefersReducedMotion ? {} : inputVariants}
          initial="initial"
          whileFocus={prefersReducedMotion ? {} : "focus"}
          animate={error && !prefersReducedMotion ? "error" : "initial"}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-required={required}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-background text-text placeholder-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
            'high-contrast:border-2',
            error 
              ? 'border-error' 
              : 'border-border',
            resizeClasses[resize],
            className
          )}
          {...props}
        />
        
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-sm text-error"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div
            id={helperTextId}
            className="text-sm text-text-secondary"
          >
            {helperText}
          </div>
        )}
      </div>
    )
  }
)

AccessibleTextarea.displayName = 'AccessibleTextarea'

export const AccessibleSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
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
    const fieldId = id || useId('select')
    const errorId = useId('error')
    const helperTextId = useId('helper')
    const prefersReducedMotion = useReducedMotion()

    const describedBy = [
      error && errorId,
      helperText && helperTextId
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-text"
          >
            {label}
            {required && <span className="text-error ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <motion.select
            ref={ref}
            id={fieldId}
            variants={prefersReducedMotion ? {} : inputVariants}
            initial="initial"
            whileFocus={prefersReducedMotion ? {} : "focus"}
            animate={error && !prefersReducedMotion ? "error" : "initial"}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            className={cn(
              'w-full px-3 py-2 border rounded-md bg-background text-text',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors appearance-none',
              'high-contrast:border-2',
              error 
                ? 'border-error' 
                : 'border-border',
              className
            )}
            {...props}
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
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" aria-hidden="true">
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-sm text-error"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div
            id={helperTextId}
            className="text-sm text-text-secondary"
          >
            {helperText}
          </div>
        )}
      </div>
    )
  }
)

AccessibleSelect.displayName = 'AccessibleSelect'

export const AccessibleAutoComplete = React.forwardRef<HTMLInputElement, AutoCompleteProps>(
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
    const [query, setQuery] = useState('')
    const fieldId = id || useId('autocomplete')
    const errorId = useId('error')
    const helperTextId = useId('helper')
    const prefersReducedMotion = useReducedMotion()

    const defaultFilter = useCallback((options: Array<{ value: string; label: string }>, query: string) => {
      return options.filter(option => 
        option.label.toLowerCase().includes(query.toLowerCase()) ||
        option.value.toLowerCase().includes(query.toLowerCase())
      )
    }, [])

    const filteredOptions = (filterFunction || defaultFilter)(options, query)

    const {
      isOpen,
      selectedIndex,
      setIsOpen,
      triggerProps,
      listboxProps,
      getItemProps
    } = useListbox(
      filteredOptions,
      (item, index) => `${fieldId}-option-${index}`,
      (item) => {
        setQuery(item.label)
        setIsOpen(false)
        onSelect?.(item)
      }
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)
      setIsOpen(true)
      onChange?.(value)
    }

    const describedBy = [
      error && errorId,
      helperText && helperTextId
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2 relative">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-text"
          >
            {label}
            {required && <span className="text-error ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <motion.input
            ref={ref}
            id={fieldId}
            type="text"
            value={query}
            onChange={handleInputChange}
            variants={prefersReducedMotion ? {} : inputVariants}
            initial="initial"
            whileFocus={prefersReducedMotion ? {} : "focus"}
            animate={error && !prefersReducedMotion ? "error" : "initial"}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            {...triggerProps}
            className={cn(
              'w-full px-3 py-2 border rounded-md bg-background text-text placeholder-text-secondary',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
              'high-contrast:border-2',
              error 
                ? 'border-error' 
                : 'border-border',
              className
            )}
            {...props}
          />
          
          <AnimatePresence>
            {isOpen && filteredOptions.length > 0 && (
              <motion.ul
                {...listboxProps}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    {...getItemProps(option, index)}
                    className={cn(
                      'px-3 py-2 cursor-pointer transition-colors',
                      'focus:outline-none',
                      index === selectedIndex
                        ? 'bg-primary text-white'
                        : 'text-text hover:bg-surface'
                    )}
                  >
                    {option.label}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-sm text-error"
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div
            id={helperTextId}
            className="text-sm text-text-secondary"
          >
            {helperText}
          </div>
        )}
      </div>
    )
  }
)

AccessibleAutoComplete.displayName = 'AccessibleAutoComplete'

// Fieldset component for grouping related form controls
export interface FieldsetProps {
  legend: string
  children: React.ReactNode
  className?: string
  required?: boolean
}

export function Fieldset({ legend, children, className, required }: FieldsetProps) {
  return (
    <fieldset className={cn('border border-border rounded-md p-4', className)}>
      <legend className="px-2 text-sm font-medium text-text">
        {legend}
        {required && <span className="text-error ml-1" aria-label="required">*</span>}
      </legend>
      {children}
    </fieldset>
  )
}

// Radio group component
export interface RadioOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
}

export interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  required?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  required,
  orientation = 'vertical',
  className
}: RadioGroupProps) {
  const groupId = useId('radio-group')
  const errorId = useId('error')

  return (
    <fieldset className={cn('space-y-2', className)}>
      {label && (
        <legend className="text-sm font-medium text-text">
          {label}
          {required && <span className="text-error ml-1" aria-label="required">*</span>}
        </legend>
      )}
      
      <div
        role="radiogroup"
        aria-labelledby={label ? `${groupId}-legend` : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? 'true' : 'false'}
        className={cn(
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {options.map((option) => {
          const optionId = useId('radio-option')
          const descriptionId = option.description ? useId('radio-description') : undefined
          
          return (
            <div key={option.value} className="flex items-start">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                aria-describedby={descriptionId}
                className="mt-1 h-4 w-4 text-primary border-border focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <div className="ml-3">
                <label
                  htmlFor={optionId}
                  className={cn(
                    'text-sm font-medium text-text cursor-pointer',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p id={descriptionId} className="text-sm text-text-secondary">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-error"
        >
          {error}
        </div>
      )}
    </fieldset>
  )
}