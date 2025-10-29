import { 
  AutoCompleteSuggestion, 
  SearchHistory, 
  UserPattern, 
  SmartSuggestion,
  IntelligentError 
} from '../types'

class IntelligentFeaturesService {
  private searchHistory: SearchHistory[] = []
  private userPatterns: UserPattern[] = []
  private suggestions: AutoCompleteSuggestion[] = []
  private readonly STORAGE_KEYS = {
    SEARCH_HISTORY: 'pnr_search_history',
    USER_PATTERNS: 'pnr_user_patterns',
    SUGGESTIONS: 'pnr_suggestions'
  }
  private readonly MAX_HISTORY_SIZE = 1000
  private readonly MAX_SUGGESTIONS = 50

  constructor() {
    this.loadFromStorage()
  }

  // Search History Management
  addToSearchHistory(query: string, type: 'pnr' | 'station' | 'train', resultCount: number = 0): void {
    const existingIndex = this.searchHistory.findIndex(
      item => item.query.toLowerCase() === query.toLowerCase() && item.type === type
    )

    if (existingIndex !== -1) {
      // Update existing entry
      this.searchHistory[existingIndex] = {
        ...this.searchHistory[existingIndex],
        timestamp: Date.now(),
        resultCount,
        selected: true
      }
    } else {
      // Add new entry
      const newEntry: SearchHistory = {
        id: this.generateId(),
        query,
        type,
        timestamp: Date.now(),
        resultCount,
        selected: false
      }
      this.searchHistory.unshift(newEntry)
    }

    // Limit history size
    if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_SIZE)
    }

    this.saveToStorage()
    this.updateUserPatterns(query, type)
  }

  getSearchHistory(type?: 'pnr' | 'station' | 'train', limit: number = 10): SearchHistory[] {
    let filtered = this.searchHistory
    
    if (type) {
      filtered = filtered.filter(item => item.type === type)
    }

    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  // Auto-completion Suggestions
  getAutoCompleteSuggestions(
    query: string, 
    type: 'pnr' | 'station' | 'train' | 'passenger' = 'pnr',
    limit: number = 10
  ): AutoCompleteSuggestion[] {
    if (!query || query.length < 1) {
      return this.getRecentSuggestions(type, limit)
    }

    const queryLower = query.toLowerCase()
    
    // Get suggestions from history
    const historySuggestions = this.searchHistory
      .filter(item => 
        item.type === type && 
        item.query.toLowerCase().includes(queryLower)
      )
      .map(item => ({
        id: item.id,
        value: item.query,
        type: item.type as any,
        confidence: this.calculateHistoryConfidence(item),
        metadata: { fromHistory: true, resultCount: item.resultCount },
        lastUsed: item.timestamp,
        frequency: 1
      }))

    // Get pattern-based suggestions
    const patternSuggestions = this.generatePatternSuggestions(query, type)

    // Combine and sort by confidence
    const allSuggestions = [...historySuggestions, ...patternSuggestions]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)

    return this.removeDuplicates(allSuggestions)
  }

  private getRecentSuggestions(type: string, limit: number): AutoCompleteSuggestion[] {
    return this.searchHistory
      .filter(item => item.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(item => ({
        id: item.id,
        value: item.query,
        type: item.type as any,
        confidence: 0.8,
        metadata: { fromHistory: true, recent: true },
        lastUsed: item.timestamp,
        frequency: 1
      }))
  }

  // Smart Suggestions
  getSmartSuggestions(context: Record<string, any> = {}): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = []

    // Quick actions based on recent activity
    const recentPNRs = this.getRecentSearches('pnr', 3)
    recentPNRs.forEach(search => {
      suggestions.push({
        id: `quick_${search.id}`,
        type: 'quick_action',
        title: `Check ${search.query}`,
        description: 'Recently searched PNR',
        action: `check_pnr:${search.query}`,
        confidence: 0.9
      })
    })

    // Contextual suggestions based on patterns
    const patterns = this.getUserPatterns()
    patterns.forEach(pattern => {
      if (pattern.type === 'route' && pattern.confidence > 0.7) {
        suggestions.push({
          id: `contextual_${pattern.id}`,
          type: 'contextual',
          title: `Check ${pattern.pattern} route`,
          description: 'Frequently searched route',
          action: `search_route:${pattern.pattern}`,
          confidence: pattern.confidence
        })
      }
    })

    // Predictive suggestions based on time patterns
    const timeBasedSuggestions = this.generateTimeBasedSuggestions()
    suggestions.push(...timeBasedSuggestions)

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
  }

  // Error Recovery
  generateErrorSuggestions(error: string, context: Record<string, any> = {}): IntelligentError {
    const errorPatterns = {
      'invalid_pnr': {
        code: 'INVALID_PNR',
        message: 'Invalid PNR format',
        suggestions: [
          'PNR should be 10 digits long',
          'Check for typos in the PNR number',
          'Try removing spaces or special characters'
        ]
      },
      'pnr_not_found': {
        code: 'PNR_NOT_FOUND',
        message: 'PNR not found in the system',
        suggestions: [
          'Verify the PNR number is correct',
          'Check if the booking was made recently',
          'Try again after a few minutes'
        ]
      },
      'network_error': {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'The data will sync when connection is restored'
        ]
      }
    }

    const errorInfo = errorPatterns[error as keyof typeof errorPatterns] || {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      suggestions: ['Please try again', 'Contact support if the issue persists']
    }

    return {
      ...errorInfo,
      learnFromError: true
    }
  }

  // User Pattern Analysis
  private updateUserPatterns(query: string, type: string): void {
    // Analyze query for patterns
    if (type === 'station') {
      this.updateRoutePatterns(query)
    } else if (type === 'pnr') {
      this.updatePNRPatterns(query)
    }
  }

  private updateRoutePatterns(station: string): void {
    const existingPattern = this.userPatterns.find(
      p => p.type === 'route' && p.pattern.includes(station)
    )

    if (existingPattern) {
      existingPattern.frequency += 1
      existingPattern.lastUsed = Date.now()
      existingPattern.confidence = Math.min(1, existingPattern.frequency / 10)
    } else {
      this.userPatterns.push({
        id: this.generateId(),
        type: 'route',
        pattern: station,
        frequency: 1,
        lastUsed: Date.now(),
        confidence: 0.1
      })
    }
  }

  private updatePNRPatterns(pnr: string): void {
    // Analyze PNR for time-based patterns
    const hour = new Date().getHours()
    const timePattern = this.getTimePattern(hour)
    
    const existingPattern = this.userPatterns.find(
      p => p.type === 'time' && p.pattern === timePattern
    )

    if (existingPattern) {
      existingPattern.frequency += 1
      existingPattern.lastUsed = Date.now()
      existingPattern.confidence = Math.min(1, existingPattern.frequency / 20)
    } else {
      this.userPatterns.push({
        id: this.generateId(),
        type: 'time',
        pattern: timePattern,
        frequency: 1,
        lastUsed: Date.now(),
        confidence: 0.05
      })
    }
  }

  private generatePatternSuggestions(query: string, type: string): AutoCompleteSuggestion[] {
    const suggestions: AutoCompleteSuggestion[] = []
    
    // Generate suggestions based on user patterns
    this.userPatterns
      .filter(pattern => pattern.confidence > 0.3)
      .forEach(pattern => {
        if (pattern.pattern.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            id: `pattern_${pattern.id}`,
            value: pattern.pattern,
            type: type as any,
            confidence: pattern.confidence,
            metadata: { fromPattern: true, frequency: pattern.frequency },
            lastUsed: pattern.lastUsed,
            frequency: pattern.frequency
          })
        }
      })

    return suggestions
  }

  private generateTimeBasedSuggestions(): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = []
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour <= 10) {
      suggestions.push({
        id: 'morning_check',
        type: 'predictive',
        title: 'Morning PNR Check',
        description: 'Check your travel status for today',
        action: 'check_today_travel',
        confidence: 0.7
      })
    } else if (hour >= 17 && hour <= 20) {
      suggestions.push({
        id: 'evening_plan',
        type: 'predictive',
        title: 'Plan Tomorrow\'s Journey',
        description: 'Check PNR status for upcoming travel',
        action: 'check_upcoming_travel',
        confidence: 0.6
      })
    }

    return suggestions
  }

  // Utility Methods
  private calculateHistoryConfidence(item: SearchHistory): number {
    const recency = Date.now() - item.timestamp
    const recencyScore = Math.max(0, 1 - (recency / (7 * 24 * 60 * 60 * 1000))) // 7 days
    const resultScore = item.resultCount > 0 ? 0.3 : 0
    const selectionScore = item.selected ? 0.2 : 0
    
    return Math.min(1, 0.5 + recencyScore * 0.3 + resultScore + selectionScore)
  }

  private removeDuplicates(suggestions: AutoCompleteSuggestion[]): AutoCompleteSuggestion[] {
    const seen = new Set<string>()
    return suggestions.filter(suggestion => {
      const key = `${suggestion.value}_${suggestion.type}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private getRecentSearches(type: string, limit: number): SearchHistory[] {
    return this.searchHistory
      .filter(item => item.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  private getUserPatterns(): UserPattern[] {
    return this.userPatterns
      .sort((a, b) => b.confidence - a.confidence)
  }

  private getTimePattern(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Storage Management
  private loadFromStorage(): void {
    try {
      const historyData = localStorage.getItem(this.STORAGE_KEYS.SEARCH_HISTORY)
      if (historyData) {
        this.searchHistory = JSON.parse(historyData)
      }

      const patternsData = localStorage.getItem(this.STORAGE_KEYS.USER_PATTERNS)
      if (patternsData) {
        this.userPatterns = JSON.parse(patternsData)
      }

      const suggestionsData = localStorage.getItem(this.STORAGE_KEYS.SUGGESTIONS)
      if (suggestionsData) {
        this.suggestions = JSON.parse(suggestionsData)
      }
    } catch (error) {
      console.warn('Failed to load intelligent features data from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.SEARCH_HISTORY, 
        JSON.stringify(this.searchHistory)
      )
      localStorage.setItem(
        this.STORAGE_KEYS.USER_PATTERNS, 
        JSON.stringify(this.userPatterns)
      )
      localStorage.setItem(
        this.STORAGE_KEYS.SUGGESTIONS, 
        JSON.stringify(this.suggestions)
      )
    } catch (error) {
      console.warn('Failed to save intelligent features data to storage:', error)
    }
  }

  // Public API for clearing data
  clearSearchHistory(): void {
    this.searchHistory = []
    this.saveToStorage()
  }

  clearUserPatterns(): void {
    this.userPatterns = []
    this.saveToStorage()
  }

  exportData(): { searchHistory: SearchHistory[], userPatterns: UserPattern[] } {
    return {
      searchHistory: this.searchHistory,
      userPatterns: this.userPatterns
    }
  }

  importData(data: { searchHistory?: SearchHistory[], userPatterns?: UserPattern[] }): void {
    if (data.searchHistory) {
      this.searchHistory = data.searchHistory
    }
    if (data.userPatterns) {
      this.userPatterns = data.userPatterns
    }
    this.saveToStorage()
  }
}

export const intelligentFeaturesService = new IntelligentFeaturesService()