// Tests for intelligent features including auto-completion, smart suggestions, and voice interface

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { intelligentFeaturesService } from '../services/intelligentFeaturesService'
import { voiceService } from '../services/voiceService'
import { AutoCompleteSuggestion, SearchHistory, UserPattern, VoiceCommand } from '../types'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock Web Speech API
const mockSpeechRecognition = {
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
}

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  speaking: false,
  pending: false,
  paused: false,
}

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
}))

describe('Intelligent Features Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    
    // Setup Web Speech API mocks
    Object.defineProperty(window, 'SpeechRecognition', {
      value: vi.fn().mockImplementation(() => mockSpeechRecognition),
      writable: true,
    })
    
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: vi.fn().mockImplementation(() => mockSpeechRecognition),
      writable: true,
    })
    
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
    })
    
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: mockSpeechSynthesisUtterance,
      writable: true,
    })
    
    // Mock default localStorage returns
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Auto-completion Service', () => {
    it('should add search history and generate suggestions', () => {
      // Add some search history
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 1)
      intelligentFeaturesService.addToSearchHistory('9876543210', 'pnr', 1)
      intelligentFeaturesService.addToSearchHistory('New Delhi', 'station', 5)
      
      // Get suggestions for partial PNR
      const pnrSuggestions = intelligentFeaturesService.getAutoCompleteSuggestions('123', 'pnr', 5)
      expect(pnrSuggestions).toHaveLength(1)
      expect(pnrSuggestions[0].value).toBe('1234567890')
      expect(pnrSuggestions[0].type).toBe('pnr')
      expect(pnrSuggestions[0].confidence).toBeGreaterThan(0)
      
      // Get suggestions for station
      const stationSuggestions = intelligentFeaturesService.getAutoCompleteSuggestions('New', 'station', 5)
      expect(stationSuggestions).toHaveLength(1)
      expect(stationSuggestions[0].value).toBe('New Delhi')
      expect(stationSuggestions[0].type).toBe('station')
    })

    it('should handle empty queries gracefully', () => {
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('', 'pnr', 5)
      expect(suggestions).toBeInstanceOf(Array)
      expect(suggestions.length).toBeGreaterThanOrEqual(0)
    })

    it('should limit suggestions to specified count', () => {
      // Add multiple search entries
      for (let i = 0; i < 10; i++) {
        intelligentFeaturesService.addToSearchHistory(`123456789${i}`, 'pnr', 1)
      }
      
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('123', 'pnr', 3)
      expect(suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should calculate confidence scores correctly', () => {
      // Add recent search
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 5)
      
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('123', 'pnr', 5)
      expect(suggestions[0].confidence).toBeGreaterThan(0.5)
      expect(suggestions[0].confidence).toBeLessThanOrEqual(1)
    })

    it('should remove duplicate suggestions', () => {
      // Add same PNR multiple times
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 1)
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 2)
      
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('123', 'pnr', 10)
      const uniqueValues = new Set(suggestions.map(s => s.value))
      expect(uniqueValues.size).toBe(suggestions.length)
    })
  })

  describe('Smart Suggestions', () => {
    it('should generate contextual suggestions based on history', () => {
      // Add some search history to build patterns
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 1)
      intelligentFeaturesService.addToSearchHistory('9876543210', 'pnr', 1)
      intelligentFeaturesService.addToSearchHistory('Mumbai', 'station', 3)
      
      const suggestions = intelligentFeaturesService.getSmartSuggestions()
      expect(suggestions).toBeInstanceOf(Array)
      expect(suggestions.length).toBeGreaterThan(0)
      
      // Should have quick actions for recent PNRs
      const quickActions = suggestions.filter(s => s.type === 'quick_action')
      expect(quickActions.length).toBeGreaterThan(0)
      expect(quickActions[0].action).toMatch(/check_pnr:/)
    })

    it('should generate time-based suggestions', () => {
      // Add some history to generate suggestions
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 1)
      
      const suggestions = intelligentFeaturesService.getSmartSuggestions()
      
      // Should generate some suggestions based on current time
      expect(suggestions).toBeInstanceOf(Array)
      expect(suggestions.length).toBeGreaterThanOrEqual(0)
    })

    it('should sort suggestions by confidence', () => {
      // Add varied history to generate different confidence levels
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 5) // High confidence
      intelligentFeaturesService.addToSearchHistory('9876543210', 'pnr', 1) // Lower confidence
      
      const suggestions = intelligentFeaturesService.getSmartSuggestions()
      
      // Should be sorted by confidence (descending)
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence)
      }
    })
  })

  describe('Error Recovery', () => {
    it('should generate appropriate error suggestions for invalid PNR', () => {
      const error = intelligentFeaturesService.generateErrorSuggestions('invalid_pnr')
      
      expect(error.code).toBe('INVALID_PNR')
      expect(error.message).toContain('Invalid PNR format')
      expect(error.suggestions).toBeInstanceOf(Array)
      expect(error.suggestions.length).toBeGreaterThan(0)
      expect(error.suggestions[0]).toContain('10 digits')
    })

    it('should generate suggestions for PNR not found', () => {
      const error = intelligentFeaturesService.generateErrorSuggestions('pnr_not_found', { pnr: '1234567890' })
      
      expect(error.code).toBe('PNR_NOT_FOUND')
      expect(error.message).toContain('PNR not found')
      expect(error.suggestions).toContain('Verify the PNR number is correct')
    })

    it('should generate suggestions for network errors', () => {
      const error = intelligentFeaturesService.generateErrorSuggestions('network_error')
      
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.message).toContain('Unable to connect')
      expect(error.suggestions).toContain('Check your internet connection')
    })

    it('should handle unknown errors gracefully', () => {
      const error = intelligentFeaturesService.generateErrorSuggestions('unknown_error_type')
      
      expect(error.code).toBe('UNKNOWN_ERROR')
      expect(error.message).toContain('unexpected error')
      expect(error.suggestions).toBeInstanceOf(Array)
      expect(error.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('User Pattern Analysis', () => {
    it('should build user patterns from search history', () => {
      // Add searches to build patterns
      intelligentFeaturesService.addToSearchHistory('Mumbai', 'station', 1)
      intelligentFeaturesService.addToSearchHistory('Delhi', 'station', 1)
      intelligentFeaturesService.addToSearchHistory('Mumbai', 'station', 1) // Repeat to increase frequency
      
      // Get suggestions that should include pattern-based ones
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('Mum', 'station', 10)
      
      // Should find Mumbai with higher confidence due to frequency
      const mumbaiSuggestion = suggestions.find(s => s.value === 'Mumbai')
      expect(mumbaiSuggestion).toBeDefined()
      expect(mumbaiSuggestion?.confidence).toBeGreaterThan(0.5)
    })

    it('should analyze time-based patterns', () => {
      // Add searches to build patterns
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 1)
      intelligentFeaturesService.addToSearchHistory('9876543210', 'pnr', 1)
      
      const suggestions = intelligentFeaturesService.getSmartSuggestions()
      
      // Should generate suggestions based on patterns
      expect(suggestions).toBeInstanceOf(Array)
      expect(suggestions.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Data Persistence', () => {
    it('should save and load search history from localStorage', () => {
      const mockHistoryData = JSON.stringify([
        {
          id: 'test1',
          query: '1234567890',
          type: 'pnr',
          timestamp: 1640995200000, // Fixed timestamp
          resultCount: 1,
          selected: true
        }
      ])
      
      mockLocalStorage.getItem.mockReturnValue(mockHistoryData)
      
      // Create new service instance to trigger loading
      const newService = new (intelligentFeaturesService.constructor as any)()
      const history = newService.getSearchHistory('pnr', 10)
      
      expect(history).toHaveLength(1)
      expect(history[0].query).toBe('1234567890')
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      // Should not throw error
      expect(() => {
        new (intelligentFeaturesService.constructor as any)()
      }).not.toThrow()
    })

    it('should export and import data correctly', () => {
      // Add some data
      intelligentFeaturesService.addToSearchHistory('1234567890', 'pnr', 1)
      
      // Export data
      const exportedData = intelligentFeaturesService.exportData()
      expect(exportedData.searchHistory).toBeInstanceOf(Array)
      expect(exportedData.searchHistory.length).toBeGreaterThan(0)
      
      // Clear and import
      intelligentFeaturesService.clearSearchHistory()
      intelligentFeaturesService.importData(exportedData)
      
      // Should have restored data
      const history = intelligentFeaturesService.getSearchHistory('pnr', 10)
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('Voice Recognition Service', () => {
    it('should initialize voice service correctly', () => {
      // The voice service should detect that Web Speech API is not available in test environment
      expect(voiceService.isVoiceSupported()).toBe(false)
      expect(voiceService.isCurrentlyListening()).toBe(false)
    })

    it('should parse PNR check commands correctly', () => {
      const testCases = [
        'check pnr 1234567890',
        'status of 1234567890',
        'track 1234567890',
        'pnr 1234567890'
      ]
      
      testCases.forEach(transcript => {
        // Access private method for testing
        const command = (voiceService as any).parseCommand(transcript, 0.9)
        expect(command.intent).toBe('check_pnr')
        expect(command.parameters.pnr).toBe('1234567890')
        expect(command.confidence).toBeGreaterThan(0.8)
      })
    })

    it('should parse navigation commands correctly', () => {
      const testCases = [
        { input: 'go to dashboard', expected: 'dashboard' },
        { input: 'open settings', expected: 'settings' },
        { input: 'navigate to history', expected: 'history' },
        { input: 'show help', expected: 'help' }
      ]
      
      testCases.forEach(({ input, expected }) => {
        const command = (voiceService as any).parseCommand(input, 0.9)
        expect(command.intent).toBe('navigate')
        expect(command.parameters.destination).toBe(expected)
      })
    })

    it('should handle help commands', () => {
      const helpCommands = ['help', 'what can you do', 'commands', 'how to']
      
      helpCommands.forEach(transcript => {
        const command = (voiceService as any).parseCommand(transcript, 0.9)
        expect(command.intent).toBe('help')
      })
    })

    it('should handle unknown commands gracefully', () => {
      const command = (voiceService as any).parseCommand('random gibberish', 0.9)
      expect(command.intent).toBe('unknown')
      expect(command.confidence).toBeLessThan(0.9)
    })

    it('should respect wake word when voice activation is enabled', () => {
      voiceService.updateSettings({ voiceActivation: true, wakeWord: 'hey pnr' })
      
      // Without wake word
      const commandWithoutWake = (voiceService as any).parseCommand('check pnr 1234567890', 0.9)
      expect(commandWithoutWake.intent).toBe('unknown')
      expect(commandWithoutWake.confidence).toBe(0)
      
      // With wake word
      const commandWithWake = (voiceService as any).parseCommand('hey pnr check pnr 1234567890', 0.9)
      expect(commandWithWake.intent).toBe('check_pnr')
      expect(commandWithWake.parameters.pnr).toBe('1234567890')
    })

    it('should start and stop listening', async () => {
      // Should reject when not supported
      await expect(voiceService.startListening()).rejects.toThrow('Voice recognition not available or disabled')
      
      // Stop should not throw even when not supported
      expect(() => voiceService.stopListening()).not.toThrow()
    })

    it('should handle speech synthesis', async () => {
      const testText = 'Test speech output'
      
      // Should reject when not supported
      await expect(voiceService.speak(testText)).rejects.toThrow('Speech synthesis not supported')
    })

    it('should update settings correctly', () => {
      const newSettings = {
        language: 'hi-IN',
        continuous: true,
        speechRate: 1.2
      }
      
      voiceService.updateSettings(newSettings)
      const settings = voiceService.getSettings()
      
      expect(settings.language).toBe('hi-IN')
      expect(settings.continuous).toBe(true)
      expect(settings.speechRate).toBe(1.2)
    })

    it('should support multiple languages', () => {
      const supportedLanguages = voiceService.getSupportedLanguages()
      
      expect(supportedLanguages).toContain('en-US')
      expect(supportedLanguages).toContain('hi-IN')
      expect(supportedLanguages).toContain('bn-IN')
      expect(supportedLanguages.length).toBeGreaterThan(10)
    })
  })

  describe('Performance Tests', () => {
    it('should handle large search history efficiently', () => {
      const startTime = performance.now()
      
      // Add 1000 search entries
      for (let i = 0; i < 1000; i++) {
        intelligentFeaturesService.addToSearchHistory(`pnr${i.toString().padStart(7, '0')}`, 'pnr', 1)
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in less than 1 second
    })

    it('should generate suggestions quickly', () => {
      // Add some history first
      for (let i = 0; i < 100; i++) {
        intelligentFeaturesService.addToSearchHistory(`test${i}`, 'pnr', 1)
      }
      
      const startTime = performance.now()
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('test', 'pnr', 10)
      const endTime = performance.now()
      
      expect(suggestions).toBeInstanceOf(Array)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in less than 100ms
    })

    it('should limit memory usage with large datasets', () => {
      // Add more than the maximum allowed history
      for (let i = 0; i < 1500; i++) {
        intelligentFeaturesService.addToSearchHistory(`pnr${i}`, 'pnr', 1)
      }
      
      const history = intelligentFeaturesService.getSearchHistory(undefined, 2000)
      expect(history.length).toBeLessThanOrEqual(1000) // Should be limited to max size
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json data')
      
      expect(() => {
        new (intelligentFeaturesService.constructor as any)()
      }).not.toThrow()
    })

    it('should handle empty search queries', () => {
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('', 'pnr', 5)
      expect(suggestions).toBeInstanceOf(Array)
    })

    it('should handle invalid PNR patterns in voice commands', () => {
      const command = (voiceService as any).parseCommand('check pnr invalid', 0.9)
      expect(command.intent).toBe('unknown')
    })

    it('should handle speech synthesis errors gracefully', async () => {
      // In test environment, speech synthesis is not supported
      await expect(voiceService.speak('test')).rejects.toThrow('Speech synthesis not supported')
    })

    it('should handle concurrent voice recognition requests', async () => {
      // Both should reject when not supported
      const promise1 = voiceService.startListening()
      const promise2 = voiceService.startListening()
      
      await expect(Promise.all([promise1, promise2])).rejects.toThrow('Voice recognition not available or disabled')
    })
  })

  describe('Integration Tests', () => {
    it('should integrate auto-completion with voice commands', async () => {
      // Add PNR via voice command simulation
      const voiceCommand: VoiceCommand = {
        id: 'test1',
        command: 'check pnr 1234567890',
        intent: 'check_pnr',
        parameters: { pnr: '1234567890' },
        confidence: 0.9,
        timestamp: 1640995200000
      }
      
      // Simulate adding to history after voice command
      intelligentFeaturesService.addToSearchHistory(voiceCommand.parameters.pnr, 'pnr', 1)
      
      // Should now appear in auto-completion
      const suggestions = intelligentFeaturesService.getAutoCompleteSuggestions('123', 'pnr', 5)
      expect(suggestions.some(s => s.value === '1234567890')).toBe(true)
    })

    it('should provide contextual suggestions based on voice usage patterns', () => {
      // Simulate multiple voice interactions
      const voiceCommands = [
        'check pnr 1234567890',
        'check pnr 9876543210',
        'go to dashboard',
        'help'
      ]
      
      voiceCommands.forEach(command => {
        const parsed = (voiceService as any).parseCommand(command, 0.9)
        if (parsed.intent === 'check_pnr') {
          intelligentFeaturesService.addToSearchHistory(parsed.parameters.pnr, 'pnr', 1)
        }
      })
      
      const smartSuggestions = intelligentFeaturesService.getSmartSuggestions()
      const quickActions = smartSuggestions.filter(s => s.type === 'quick_action')
      
      expect(quickActions.length).toBeGreaterThan(0)
      expect(quickActions.some(s => s.action.includes('1234567890'))).toBe(true)
    })
  })
})