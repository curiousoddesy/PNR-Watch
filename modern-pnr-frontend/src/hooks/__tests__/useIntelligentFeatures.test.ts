// Tests for intelligent features hooks

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useIntelligentFeatures, usePNRAutoComplete, useSmartSuggestions } from '../useIntelligentFeatures'
import { intelligentFeaturesService } from '../../services/intelligentFeaturesService'

// Mock the intelligent features service
vi.mock('../../services/intelligentFeaturesService', () => ({
  intelligentFeaturesService: {
    getAutoCompleteSuggestions: vi.fn(),
    addToSearchHistory: vi.fn(),
    getSearchHistory: vi.fn(),
    getSmartSuggestions: vi.fn(),
    generateErrorSuggestions: vi.fn(),
    clearSearchHistory: vi.fn(),
  }
}))

const mockIntelligentFeaturesService = intelligentFeaturesService as any

describe('useIntelligentFeatures Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockIntelligentFeaturesService.getAutoCompleteSuggestions.mockReturnValue([])
    mockIntelligentFeaturesService.getSearchHistory.mockReturnValue([])
    mockIntelligentFeaturesService.getSmartSuggestions.mockReturnValue([])
    mockIntelligentFeaturesService.generateErrorSuggestions.mockReturnValue({
      code: 'TEST_ERROR',
      message: 'Test error',
      suggestions: ['Try again']
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useIntelligentFeatures())
      
      expect(result.current.suggestions).toEqual([])
      expect(result.current.searchHistory).toEqual([])
      expect(result.current.smartSuggestions).toEqual([])
      expect(result.current.isLoadingSuggestions).toBe(false)
      expect(result.current.isLoadingSmartSuggestions).toBe(false)
    })

    it('should load search history on mount', async () => {
      const mockHistory = [
        {
          id: '1',
          query: '1234567890',
          type: 'pnr' as const,
          timestamp: Date.now(),
          resultCount: 1
        }
      ]
      
      mockIntelligentFeaturesService.getSearchHistory.mockReturnValue(mockHistory)
      
      const { result } = renderHook(() => useIntelligentFeatures())
      
      await waitFor(() => {
        expect(result.current.searchHistory).toEqual(mockHistory)
      })
    })

    it('should load smart suggestions on mount when enabled', async () => {
      const mockSuggestions = [
        {
          id: '1',
          type: 'quick_action' as const,
          title: 'Check Recent PNR',
          description: 'Check your recently searched PNR',
          action: 'check_pnr:1234567890',
          confidence: 0.9
        }
      ]
      
      mockIntelligentFeaturesService.getSmartSuggestions.mockReturnValue(mockSuggestions)
      
      const { result } = renderHook(() => useIntelligentFeatures({ enableSmartSuggestions: true }))
      
      await waitFor(() => {
        expect(result.current.smartSuggestions).toEqual(mockSuggestions)
      })
    })
  })

  describe('Auto-completion', () => {
    it('should get suggestions with debouncing', async () => {
      const mockSuggestions = [
        {
          id: '1',
          value: '1234567890',
          type: 'pnr' as const,
          confidence: 0.9,
          metadata: { fromHistory: true }
        }
      ]
      
      mockIntelligentFeaturesService.getAutoCompleteSuggestions.mockReturnValue(mockSuggestions)
      
      const { result } = renderHook(() => useIntelligentFeatures({ debounceMs: 100 }))
      
      act(() => {
        result.current.getSuggestions('123', 'pnr')
      })
      
      // Should be loading initially
      expect(result.current.isLoadingSuggestions).toBe(true)
      
      // Wait for debounce
      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockSuggestions)
        expect(result.current.isLoadingSuggestions).toBe(false)
      }, { timeout: 200 })
      
      expect(mockIntelligentFeaturesService.getAutoCompleteSuggestions).toHaveBeenCalledWith('123', 'pnr', 10)
    })

    it('should clear suggestions', () => {
      const { result } = renderHook(() => useIntelligentFeatures())
      
      act(() => {
        result.current.clearSuggestions()
      })
      
      expect(result.current.suggestions).toEqual([])
      expect(result.current.isLoadingSuggestions).toBe(false)
    })

    it('should handle suggestion errors gracefully', async () => {
      mockIntelligentFeaturesService.getAutoCompleteSuggestions.mockImplementation(() => {
        throw new Error('Service error')
      })
      
      const { result } = renderHook(() => useIntelligentFeatures({ debounceMs: 50 }))
      
      act(() => {
        result.current.getSuggestions('test', 'pnr')
      })
      
      await waitFor(() => {
        expect(result.current.suggestions).toEqual([])
        expect(result.current.isLoadingSuggestions).toBe(false)
      })
    })

    it('should cancel previous debounced requests', async () => {
      const { result } = renderHook(() => useIntelligentFeatures({ debounceMs: 100 }))
      
      act(() => {
        result.current.getSuggestions('1', 'pnr')
      })
      
      act(() => {
        result.current.getSuggestions('12', 'pnr')
      })
      
      act(() => {
        result.current.getSuggestions('123', 'pnr')
      })
      
      await waitFor(() => {
        expect(result.current.isLoadingSuggestions).toBe(false)
      })
      
      // Should only call the service once for the final query
      expect(mockIntelligentFeaturesService.getAutoCompleteSuggestions).toHaveBeenCalledTimes(1)
      expect(mockIntelligentFeaturesService.getAutoCompleteSuggestions).toHaveBeenCalledWith('123', 'pnr', 10)
    })
  })

  describe('Search History', () => {
    it('should add to search history', async () => {
      const { result } = renderHook(() => useIntelligentFeatures())
      
      act(() => {
        result.current.addToHistory('1234567890', 'pnr', 1)
      })
      
      expect(mockIntelligentFeaturesService.addToSearchHistory).toHaveBeenCalledWith('1234567890', 'pnr', 1)
    })

    it('should clear search history', async () => {
      const { result } = renderHook(() => useIntelligentFeatures())
      
      act(() => {
        result.current.clearHistory()
      })
      
      expect(mockIntelligentFeaturesService.clearSearchHistory).toHaveBeenCalled()
    })

    it('should handle history errors gracefully', async () => {
      mockIntelligentFeaturesService.addToSearchHistory.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      const { result } = renderHook(() => useIntelligentFeatures())
      
      expect(() => {
        act(() => {
          result.current.addToHistory('1234567890', 'pnr', 1)
        })
      }).not.toThrow()
    })
  })

  describe('Smart Suggestions', () => {
    it('should refresh smart suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          type: 'contextual' as const,
          title: 'Check Mumbai Route',
          description: 'Frequently searched route',
          action: 'search_route:Mumbai',
          confidence: 0.8
        }
      ]
      
      mockIntelligentFeaturesService.getSmartSuggestions.mockReturnValue(mockSuggestions)
      
      const { result } = renderHook(() => useIntelligentFeatures({ enableSmartSuggestions: true }))
      
      act(() => {
        result.current.refreshSmartSuggestions({ currentPage: 'dashboard' })
      })
      
      await waitFor(() => {
        expect(result.current.smartSuggestions).toEqual(mockSuggestions)
        expect(result.current.isLoadingSmartSuggestions).toBe(false)
      })
      
      expect(mockIntelligentFeaturesService.getSmartSuggestions).toHaveBeenCalledWith({ currentPage: 'dashboard' })
    })

    it('should handle smart suggestions errors', async () => {
      mockIntelligentFeaturesService.getSmartSuggestions.mockImplementation(() => {
        throw new Error('Service error')
      })
      
      const { result } = renderHook(() => useIntelligentFeatures({ enableSmartSuggestions: true }))
      
      act(() => {
        result.current.refreshSmartSuggestions()
      })
      
      await waitFor(() => {
        expect(result.current.smartSuggestions).toEqual([])
        expect(result.current.isLoadingSmartSuggestions).toBe(false)
      })
    })
  })

  describe('Error Recovery', () => {
    it('should generate error suggestions', () => {
      const { result } = renderHook(() => useIntelligentFeatures({ enableErrorRecovery: true }))
      
      const errorSuggestions = result.current.getErrorSuggestions('invalid_pnr', { pnr: '123' })
      
      expect(errorSuggestions).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        suggestions: ['Try again']
      })
      
      expect(mockIntelligentFeaturesService.generateErrorSuggestions).toHaveBeenCalledWith('invalid_pnr', { pnr: '123' })
    })

    it('should return default error when error recovery is disabled', () => {
      const { result } = renderHook(() => useIntelligentFeatures({ enableErrorRecovery: false }))
      
      const errorSuggestions = result.current.getErrorSuggestions('invalid_pnr')
      
      expect(errorSuggestions).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred',
        suggestions: ['Please try again']
      })
    })

    it('should handle error suggestion generation errors', () => {
      mockIntelligentFeaturesService.generateErrorSuggestions.mockImplementation(() => {
        throw new Error('Service error')
      })
      
      const { result } = renderHook(() => useIntelligentFeatures({ enableErrorRecovery: true }))
      
      const errorSuggestions = result.current.getErrorSuggestions('invalid_pnr')
      
      expect(errorSuggestions).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred',
        suggestions: ['Please try again']
      })
    })
  })

  describe('Analytics', () => {
    it('should calculate analytics from search history', async () => {
      const mockHistory = [
        {
          id: '1',
          query: '1234567890',
          type: 'pnr' as const,
          timestamp: Date.now(),
          resultCount: 1
        },
        {
          id: '2',
          query: 'Mumbai',
          type: 'station' as const,
          timestamp: Date.now() - 1000,
          resultCount: 5
        },
        {
          id: '3',
          query: '9876543210',
          type: 'pnr' as const,
          timestamp: Date.now() - 2000,
          resultCount: 1
        }
      ]
      
      mockIntelligentFeaturesService.getSearchHistory.mockReturnValue(mockHistory)
      
      const { result } = renderHook(() => useIntelligentFeatures())
      
      await waitFor(() => {
        expect(result.current.analytics.totalSearches).toBe(3)
        expect(result.current.analytics.topSearches).toHaveLength(3)
        expect(result.current.analytics.searchPatterns).toEqual({
          pnr: 2,
          station: 1
        })
      })
    })
  })

  describe('Options and Configuration', () => {
    it('should respect enableAutoComplete option', () => {
      const { result } = renderHook(() => useIntelligentFeatures({ enableAutoComplete: false }))
      
      act(() => {
        result.current.getSuggestions('test', 'pnr')
      })
      
      expect(mockIntelligentFeaturesService.getAutoCompleteSuggestions).not.toHaveBeenCalled()
    })

    it('should respect enableSmartSuggestions option', async () => {
      const { result } = renderHook(() => useIntelligentFeatures({ enableSmartSuggestions: false }))
      
      // Should not load smart suggestions on mount
      await waitFor(() => {
        expect(mockIntelligentFeaturesService.getSmartSuggestions).not.toHaveBeenCalled()
      })
    })

    it('should use custom debounce time', async () => {
      const { result } = renderHook(() => useIntelligentFeatures({ debounceMs: 500 }))
      
      act(() => {
        result.current.getSuggestions('test', 'pnr')
      })
      
      // Should still be loading after 200ms
      await new Promise(resolve => setTimeout(resolve, 200))
      expect(result.current.isLoadingSuggestions).toBe(true)
      
      // Should complete after 600ms
      await waitFor(() => {
        expect(result.current.isLoadingSuggestions).toBe(false)
      }, { timeout: 700 })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const { result, unmount } = renderHook(() => useIntelligentFeatures({ debounceMs: 1000 }))
      
      act(() => {
        result.current.getSuggestions('test', 'pnr')
      })
      
      expect(result.current.isLoadingSuggestions).toBe(true)
      
      unmount()
      
      // Should not cause any errors or memory leaks
    })
  })
})

describe('usePNRAutoComplete Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIntelligentFeaturesService.getAutoCompleteSuggestions.mockReturnValue([])
  })

  it('should specialize for PNR auto-completion', async () => {
    const mockSuggestions = [
      {
        id: '1',
        value: '1234567890',
        type: 'pnr' as const,
        confidence: 0.9
      }
    ]
    
    mockIntelligentFeaturesService.getAutoCompleteSuggestions.mockReturnValue(mockSuggestions)
    
    const { result } = renderHook(() => usePNRAutoComplete())
    
    act(() => {
      result.current.getSuggestions('123')
    })
    
    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockSuggestions)
    })
    
    expect(mockIntelligentFeaturesService.getAutoCompleteSuggestions).toHaveBeenCalledWith('123', 'pnr', 10)
  })
})

describe('useSmartSuggestions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIntelligentFeaturesService.getSmartSuggestions.mockReturnValue([])
  })

  it('should focus only on smart suggestions', async () => {
    const mockSuggestions = [
      {
        id: '1',
        type: 'quick_action' as const,
        title: 'Quick Action',
        description: 'Test action',
        action: 'test',
        confidence: 0.9
      }
    ]
    
    mockIntelligentFeaturesService.getSmartSuggestions.mockReturnValue(mockSuggestions)
    
    const { result } = renderHook(() => useSmartSuggestions())
    
    await waitFor(() => {
      expect(result.current.suggestions).toEqual(mockSuggestions)
    })
    
    act(() => {
      result.current.refresh({ context: 'test' })
    })
    
    await waitFor(() => {
      expect(mockIntelligentFeaturesService.getSmartSuggestions).toHaveBeenCalledWith({ context: 'test' })
    })
  })
})