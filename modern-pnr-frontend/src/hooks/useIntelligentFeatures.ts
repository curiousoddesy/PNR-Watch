import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  AutoCompleteSuggestion, 
  SearchHistory, 
  SmartSuggestion,
  IntelligentError 
} from '../types'
import { intelligentFeaturesService } from '../services/intelligentFeaturesService'

interface UseIntelligentFeaturesOptions {
  enableAutoComplete?: boolean
  enableSmartSuggestions?: boolean
  enableErrorRecovery?: boolean
  debounceMs?: number
}

interface UseIntelligentFeaturesReturn {
  // Auto-completion
  suggestions: AutoCompleteSuggestion[]
  getSuggestions: (query: string, type?: 'pnr' | 'station' | 'train' | 'passenger') => void
  clearSuggestions: () => void
  
  // Search history
  searchHistory: SearchHistory[]
  addToHistory: (query: string, type: 'pnr' | 'station' | 'train', resultCount?: number) => void
  clearHistory: () => void
  
  // Smart suggestions
  smartSuggestions: SmartSuggestion[]
  refreshSmartSuggestions: (context?: Record<string, any>) => void
  
  // Error recovery
  getErrorSuggestions: (error: string, context?: Record<string, any>) => IntelligentError
  
  // Loading states
  isLoadingSuggestions: boolean
  isLoadingSmartSuggestions: boolean
  
  // Analytics
  analytics: {
    totalSearches: number
    topSearches: SearchHistory[]
    searchPatterns: Record<string, number>
  }
}

export function useIntelligentFeatures(
  options: UseIntelligentFeaturesOptions = {}
): UseIntelligentFeaturesReturn {
  const {
    enableAutoComplete = true,
    enableSmartSuggestions = true,
    enableErrorRecovery = true,
    debounceMs = 300
  } = options

  // State
  const [suggestions, setSuggestions] = useState<AutoCompleteSuggestion[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingSmartSuggestions, setIsLoadingSmartSuggestions] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Initialize data
  useEffect(() => {
    if (enableSmartSuggestions) {
      refreshSmartSuggestions()
    }
    loadSearchHistory()
  }, [enableSmartSuggestions])

  // Auto-completion
  const getSuggestions = useCallback((
    query: string, 
    type: 'pnr' | 'station' | 'train' | 'passenger' = 'pnr'
  ) => {
    if (!enableAutoComplete) return

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set loading state
    setIsLoadingSuggestions(true)

    // Debounce the suggestion request
    const timer = setTimeout(() => {
      try {
        const newSuggestions = intelligentFeaturesService.getAutoCompleteSuggestions(
          query, 
          type, 
          10
        )
        setSuggestions(newSuggestions)
      } catch (error) {
        console.error('Error getting suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, debounceMs)

    setDebounceTimer(timer)
  }, [enableAutoComplete, debounceMs, debounceTimer])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setIsLoadingSuggestions(false)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }
  }, [debounceTimer])

  // Search history
  const addToHistory = useCallback((
    query: string, 
    type: 'pnr' | 'station' | 'train', 
    resultCount: number = 0
  ) => {
    try {
      intelligentFeaturesService.addToSearchHistory(query, type, resultCount)
      loadSearchHistory()
    } catch (error) {
      console.error('Error adding to search history:', error)
    }
  }, [])

  const loadSearchHistory = useCallback(() => {
    try {
      const history = intelligentFeaturesService.getSearchHistory(undefined, 20)
      setSearchHistory(history)
    } catch (error) {
      console.error('Error loading search history:', error)
      setSearchHistory([])
    }
  }, [])

  const clearHistory = useCallback(() => {
    try {
      intelligentFeaturesService.clearSearchHistory()
      setSearchHistory([])
    } catch (error) {
      console.error('Error clearing search history:', error)
    }
  }, [])

  // Smart suggestions
  const refreshSmartSuggestions = useCallback((context: Record<string, any> = {}) => {
    if (!enableSmartSuggestions) return

    setIsLoadingSmartSuggestions(true)
    
    try {
      const suggestions = intelligentFeaturesService.getSmartSuggestions(context)
      setSmartSuggestions(suggestions)
    } catch (error) {
      console.error('Error getting smart suggestions:', error)
      setSmartSuggestions([])
    } finally {
      setIsLoadingSmartSuggestions(false)
    }
  }, [enableSmartSuggestions])

  // Error recovery
  const getErrorSuggestions = useCallback((
    error: string, 
    context: Record<string, any> = {}
  ): IntelligentError => {
    if (!enableErrorRecovery) {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred',
        suggestions: ['Please try again']
      }
    }

    try {
      return intelligentFeaturesService.generateErrorSuggestions(error, context)
    } catch (err) {
      console.error('Error generating error suggestions:', err)
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred',
        suggestions: ['Please try again']
      }
    }
  }, [enableErrorRecovery])

  // Analytics
  const analytics = useMemo(() => {
    const totalSearches = searchHistory.length
    const topSearches = searchHistory
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
    
    const searchPatterns = searchHistory.reduce((acc, search) => {
      acc[search.type] = (acc[search.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalSearches,
      topSearches,
      searchPatterns
    }
  }, [searchHistory])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return {
    // Auto-completion
    suggestions,
    getSuggestions,
    clearSuggestions,
    
    // Search history
    searchHistory,
    addToHistory,
    clearHistory,
    
    // Smart suggestions
    smartSuggestions,
    refreshSmartSuggestions,
    
    // Error recovery
    getErrorSuggestions,
    
    // Loading states
    isLoadingSuggestions,
    isLoadingSmartSuggestions,
    
    // Analytics
    analytics
  }
}

// Specialized hooks for specific use cases
export function usePNRAutoComplete() {
  const { suggestions, getSuggestions, clearSuggestions, isLoadingSuggestions } = 
    useIntelligentFeatures({ enableSmartSuggestions: false })

  const getPNRSuggestions = useCallback((query: string) => {
    getSuggestions(query, 'pnr')
  }, [getSuggestions])

  return {
    suggestions,
    getSuggestions: getPNRSuggestions,
    clearSuggestions,
    isLoading: isLoadingSuggestions
  }
}

export function useStationAutoComplete() {
  const { suggestions, getSuggestions, clearSuggestions, isLoadingSuggestions } = 
    useIntelligentFeatures({ enableSmartSuggestions: false })

  const getStationSuggestions = useCallback((query: string) => {
    getSuggestions(query, 'station')
  }, [getSuggestions])

  return {
    suggestions,
    getSuggestions: getStationSuggestions,
    clearSuggestions,
    isLoading: isLoadingSuggestions
  }
}

export function useSmartSuggestions() {
  const { smartSuggestions, refreshSmartSuggestions, isLoadingSmartSuggestions } = 
    useIntelligentFeatures({ 
      enableAutoComplete: false,
      enableErrorRecovery: false 
    })

  return {
    suggestions: smartSuggestions,
    refresh: refreshSmartSuggestions,
    isLoading: isLoadingSmartSuggestions
  }
}