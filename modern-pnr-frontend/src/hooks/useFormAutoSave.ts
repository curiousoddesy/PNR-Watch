import { useEffect, useRef, useCallback, useState } from 'react'
import type { UseFormGetValues, UseFormReset, FieldValues } from 'react-hook-form'

interface UseFormAutoSaveOptions<T extends FieldValues> {
  key: string
  getValues: UseFormGetValues<T>
  reset: UseFormReset<T>
  enabled?: boolean
  debounceMs?: number
  excludeFields?: (keyof T)[]
  onSave?: (data: T) => void
  onRestore?: (data: T) => void
  onClear?: () => void
}

interface SavedFormData<T> {
  data: T
  timestamp: number
  version: string
}

interface UseFormAutoSaveReturn {
  lastSaved: Date | null
  hasSavedData: boolean
  clearSavedData: () => void
  restoreSavedData: () => void
  saveNow: () => void
  isAutoSaveEnabled: boolean
  setAutoSaveEnabled: (enabled: boolean) => void
}

export function useFormAutoSave<T extends FieldValues>({
  key,
  getValues,
  reset,
  enabled = true,
  debounceMs = 2000,
  excludeFields = [],
  onSave,
  onRestore,
  onClear
}: UseFormAutoSaveOptions<T>): UseFormAutoSaveReturn {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasSavedData, setHasSavedData] = useState(false)
  const [isAutoSaveEnabled, setAutoSaveEnabled] = useState(enabled)
  const timeoutRef = useRef<number | null>(null)
  const previousValuesRef = useRef<string>('')
  const storageKey = `form_autosave_${key}`
  const version = '1.0.0' // For handling schema changes

  // Check for saved data on mount
  useEffect(() => {
    checkForSavedData()
  }, [])

  // Auto-save when form values change
  useEffect(() => {
    if (!isAutoSaveEnabled) return

    const currentValues = getValues()
    const filteredValues = filterExcludedFields(currentValues, excludeFields)
    const currentValuesString = JSON.stringify(filteredValues)

    // Only save if values have actually changed
    if (currentValuesString !== previousValuesRef.current && hasValidData(filteredValues)) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout for auto-save
      timeoutRef.current = window.setTimeout(() => {
        saveFormData(filteredValues)
        previousValuesRef.current = currentValuesString
      }, debounceMs)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [getValues, isAutoSaveEnabled, debounceMs, excludeFields])

  // Check if there's saved data in localStorage
  const checkForSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        const parsed: SavedFormData<T> = JSON.parse(savedData)
        // Check version compatibility
        if (parsed.version === version) {
          setHasSavedData(true)
          setLastSaved(new Date(parsed.timestamp))
        } else {
          // Clear incompatible data
          localStorage.removeItem(storageKey)
          setHasSavedData(false)
        }
      } else {
        setHasSavedData(false)
      }
    } catch (error) {
      console.warn('Failed to check for saved form data:', error)
      setHasSavedData(false)
    }
  }, [storageKey])

  // Save form data to localStorage
  const saveFormData = useCallback((data: Partial<T>) => {
    try {
      const saveData: SavedFormData<T> = {
        data: data as T,
        timestamp: Date.now(),
        version
      }
      
      localStorage.setItem(storageKey, JSON.stringify(saveData))
      setLastSaved(new Date())
      setHasSavedData(true)
      onSave?.(data as T)
    } catch (error) {
      console.warn('Failed to save form data:', error)
    }
  }, [storageKey, onSave])

  // Restore saved data
  const restoreSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        const parsed: SavedFormData<T> = JSON.parse(savedData)
        if (parsed.version === version) {
          reset(parsed.data)
          setLastSaved(new Date(parsed.timestamp))
          onRestore?.(parsed.data)
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error)
    }
  }, [storageKey, reset, onRestore])

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setHasSavedData(false)
      setLastSaved(null)
      onClear?.()
    } catch (error) {
      console.warn('Failed to clear saved form data:', error)
    }
  }, [storageKey, onClear])

  // Save immediately
  const saveNow = useCallback(() => {
    if (!isAutoSaveEnabled) return
    
    const currentValues = getValues()
    const filteredValues = filterExcludedFields(currentValues, excludeFields)
    
    if (hasValidData(filteredValues)) {
      saveFormData(filteredValues)
    }
  }, [getValues, excludeFields, isAutoSaveEnabled, saveFormData])

  // Set auto-save enabled state
  const setAutoSaveEnabledState = useCallback((enabled: boolean) => {
    setAutoSaveEnabled(enabled)
    
    // Clear timeout if disabling
    if (!enabled && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    lastSaved,
    hasSavedData,
    clearSavedData,
    restoreSavedData,
    saveNow,
    isAutoSaveEnabled,
    setAutoSaveEnabled: setAutoSaveEnabledState
  }
}

// Utility functions
function filterExcludedFields<T extends FieldValues>(
  values: T, 
  excludeFields: (keyof T)[]
): Partial<T> {
  const filtered = { ...values }
  excludeFields.forEach(field => {
    delete filtered[field]
  })
  return filtered
}

function hasValidData<T extends FieldValues>(values: Partial<T>): boolean {
  // Check if there's any meaningful data to save
  const entries = Object.entries(values)
  return entries.some(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return false
    }
    if (Array.isArray(value) && value.length === 0) {
      return false
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return false
    }
    return true
  })
}

// Hook for managing multiple form auto-saves
export function useMultiFormAutoSave() {
  const [activeForms, setActiveForms] = useState<Set<string>>(new Set())

  const registerForm = useCallback((key: string) => {
    setActiveForms(prev => new Set(prev).add(key))
  }, [])

  const unregisterForm = useCallback((key: string) => {
    setActiveForms(prev => {
      const newSet = new Set(prev)
      newSet.delete(key)
      return newSet
    })
  }, [])

  const clearAllSavedData = useCallback(() => {
    activeForms.forEach(key => {
      try {
        localStorage.removeItem(`form_autosave_${key}`)
      } catch (error) {
        console.warn(`Failed to clear saved data for form ${key}:`, error)
      }
    })
  }, [activeForms])

  const getSavedFormsCount = useCallback(() => {
    let count = 0
    activeForms.forEach(key => {
      try {
        const savedData = localStorage.getItem(`form_autosave_${key}`)
        if (savedData) count++
      } catch (error) {
        // Ignore errors
      }
    })
    return count
  }, [activeForms])

  return {
    activeForms: Array.from(activeForms),
    registerForm,
    unregisterForm,
    clearAllSavedData,
    getSavedFormsCount
  }
}

// Hook for form recovery notifications
export function useFormRecovery() {
  const [recoveryNotifications, setRecoveryNotifications] = useState<Array<{
    id: string
    formKey: string
    timestamp: number
    preview: string
  }>>([])

  const checkForRecoverableForms = useCallback(() => {
    const notifications: typeof recoveryNotifications = []
    
    // Scan localStorage for recoverable forms
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('form_autosave_')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed = JSON.parse(data)
            const formKey = key.replace('form_autosave_', '')
            
            // Create preview of saved data
            const preview = createDataPreview(parsed.data)
            
            notifications.push({
              id: key,
              formKey,
              timestamp: parsed.timestamp,
              preview
            })
          }
        } catch (error) {
          // Ignore invalid data
        }
      }
    }
    
    setRecoveryNotifications(notifications)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setRecoveryNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const recoverForm = useCallback((id: string, onRecover: (data: any) => void) => {
    try {
      const data = localStorage.getItem(id)
      if (data) {
        const parsed = JSON.parse(data)
        onRecover(parsed.data)
        dismissNotification(id)
      }
    } catch (error) {
      console.warn('Failed to recover form data:', error)
    }
  }, [dismissNotification])

  return {
    recoveryNotifications,
    checkForRecoverableForms,
    dismissNotification,
    recoverForm
  }
}

// Utility function to create data preview
function createDataPreview(data: any): string {
  const entries = Object.entries(data)
  const nonEmptyEntries = entries.filter(([key, value]) => 
    value !== null && value !== undefined && value !== ''
  )
  
  if (nonEmptyEntries.length === 0) return 'Empty form'
  
  const preview = nonEmptyEntries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value).substring(0, 20)}`)
    .join(', ')
  
  return nonEmptyEntries.length > 3 ? `${preview}...` : preview
}