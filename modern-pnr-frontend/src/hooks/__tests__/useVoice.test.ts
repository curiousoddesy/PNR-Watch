// Tests for voice interface hooks

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVoice, useVoiceCommands, useSpeechSynthesis } from '../useVoice'
import { voiceService } from '../../services/voiceService'
import { VoiceCommand } from '../../types'

// Mock the voice service
vi.mock('../../services/voiceService', () => ({
  voiceService: {
    isVoiceSupported: vi.fn(),
    isCurrentlyListening: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    speak: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    onResult: vi.fn(),
    onCommand: vi.fn(),
    onError: vi.fn(),
    onStart: vi.fn(),
    onEnd: vi.fn(),
    destroy: vi.fn(),
  }
}))

const mockVoiceService = voiceService as any

describe('useVoice Hook', () => {
  const mockSettings = {
    enabled: true,
    language: 'en-US',
    continuous: false,
    interimResults: true,
    maxAlternatives: 3,
    voiceActivation: false,
    wakeWord: 'hey pnr',
    speechRate: 1,
    speechPitch: 1,
    speechVolume: 1
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockVoiceService.isVoiceSupported.mockReturnValue(true)
    mockVoiceService.isCurrentlyListening.mockReturnValue(false)
    mockVoiceService.startListening.mockResolvedValue(undefined)
    mockVoiceService.stopListening.mockReturnValue(undefined)
    mockVoiceService.speak.mockResolvedValue(undefined)
    mockVoiceService.getSettings.mockReturnValue(mockSettings)
    mockVoiceService.updateSettings.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useVoice())
      
      expect(result.current.isSupported).toBe(true)
      expect(result.current.isListening).toBe(false)
      expect(result.current.isEnabled).toBe(true)
      expect(result.current.currentTranscript).toBe('')
      expect(result.current.lastCommand).toBe(null)
      expect(result.current.error).toBe(null)
      expect(result.current.settings).toEqual(mockSettings)
    })

    it('should setup voice service event listeners on mount', () => {
      renderHook(() => useVoice())
      
      expect(mockVoiceService.onResult).toHaveBeenCalled()
      expect(mockVoiceService.onCommand).toHaveBeenCalled()
      expect(mockVoiceService.onError).toHaveBeenCalled()
      expect(mockVoiceService.onStart).toHaveBeenCalled()
      expect(mockVoiceService.onEnd).toHaveBeenCalled()
    })

    it('should update settings on initialization', () => {
      renderHook(() => useVoice({
        continuous: true,
        language: 'hi-IN'
      }))
      
      expect(mockVoiceService.updateSettings).toHaveBeenCalledWith({
        continuous: true,
        language: 'hi-IN',
        enabled: true
      })
    })

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useVoice())
      
      unmount()
      
      expect(mockVoiceService.destroy).toHaveBeenCalled()
    })
  })

  describe('Voice Recognition', () => {
    it('should start listening successfully', async () => {
      const { result } = renderHook(() => useVoice())
      
      await act(async () => {
        await result.current.startListening()
      })
      
      expect(mockVoiceService.startListening).toHaveBeenCalled()
    })

    it('should handle start listening errors', async () => {
      const errorMessage = 'Microphone not available'
      mockVoiceService.startListening.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useVoice())
      
      await act(async () => {
        await result.current.startListening()
      })
      
      expect(result.current.error).toBe(errorMessage)
    })

    it('should stop listening', () => {
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        result.current.stopListening()
      })
      
      expect(mockVoiceService.stopListening).toHaveBeenCalled()
    })

    it('should toggle listening state', async () => {
      mockVoiceService.isCurrentlyListening
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
      
      const { result } = renderHook(() => useVoice())
      
      // First toggle - should start listening
      await act(async () => {
        await result.current.toggleListening()
      })
      
      expect(mockVoiceService.startListening).toHaveBeenCalled()
      
      // Second toggle - should stop listening
      act(() => {
        result.current.toggleListening()
      })
      
      expect(mockVoiceService.stopListening).toHaveBeenCalled()
    })

    it('should handle voice recognition results', () => {
      let resultCallback: (result: any) => void
      
      mockVoiceService.onResult.mockImplementation((callback) => {
        resultCallback = callback
      })
      
      const { result } = renderHook(() => useVoice())
      
      const mockResult = {
        transcript: 'check pnr 1234567890',
        confidence: 0.9,
        isFinal: true,
        alternatives: []
      }
      
      act(() => {
        resultCallback(mockResult)
      })
      
      expect(result.current.currentTranscript).toBe('check pnr 1234567890')
      expect(result.current.error).toBe(null)
    })

    it('should handle voice commands', () => {
      let commandCallback: (command: VoiceCommand) => void
      const onCommand = vi.fn()
      
      mockVoiceService.onCommand.mockImplementation((callback) => {
        commandCallback = callback
      })
      
      const { result } = renderHook(() => useVoice({ onCommand }))
      
      const mockCommand: VoiceCommand = {
        id: 'test1',
        command: 'check pnr 1234567890',
        intent: 'check_pnr',
        parameters: { pnr: '1234567890' },
        confidence: 0.9,
        timestamp: Date.now()
      }
      
      act(() => {
        commandCallback(mockCommand)
      })
      
      expect(result.current.lastCommand).toEqual(mockCommand)
      expect(onCommand).toHaveBeenCalledWith(mockCommand)
    })

    it('should handle voice recognition errors', () => {
      let errorCallback: (error: string) => void
      const onError = vi.fn()
      
      mockVoiceService.onError.mockImplementation((callback) => {
        errorCallback = callback
      })
      
      const { result } = renderHook(() => useVoice({ onError }))
      
      const errorMessage = 'No speech detected'
      
      act(() => {
        errorCallback(errorMessage)
      })
      
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isListening).toBe(false)
      expect(onError).toHaveBeenCalledWith(errorMessage)
    })

    it('should handle listening state changes', () => {
      let startCallback: () => void
      let endCallback: () => void
      
      mockVoiceService.onStart.mockImplementation((callback) => {
        startCallback = callback
      })
      
      mockVoiceService.onEnd.mockImplementation((callback) => {
        endCallback = callback
      })
      
      const { result } = renderHook(() => useVoice())
      
      act(() => {
        startCallback()
      })
      
      expect(result.current.isListening).toBe(true)
      expect(result.current.error).toBe(null)
      
      act(() => {
        endCallback()
      })
      
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('Speech Synthesis', () => {
    it('should speak text successfully', async () => {
      const { result } = renderHook(() => useVoice())
      
      await act(async () => {
        await result.current.speak('Hello world')
      })
      
      expect(mockVoiceService.speak).toHaveBeenCalledWith('Hello world', {})
    })

    it('should speak with options', async () => {
      const { result } = renderHook(() => useVoice())
      
      const options = { type: 'success' as const, priority: 'high' as const }
      
      await act(async () => {
        await result.current.speak('Success message', options)
      })
      
      expect(mockVoiceService.speak).toHaveBeenCalledWith('Success message', options)
    })

    it('should handle speech synthesis errors', async () => {
      const errorMessage = 'Speech synthesis failed'
      mockVoiceService.speak.mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useVoice())
      
      await expect(act(async () => {
        await result.current.speak('Test')
      })).rejects.toThrow(errorMessage)
      
      expect(result.current.error).toBe(errorMessage)
    })

    it('should not speak when not supported', async () => {
      mockVoiceService.isVoiceSupported.mockReturnValue(false)
      
      const { result } = renderHook(() => useVoice())
      
      await expect(act(async () => {
        await result.current.speak('Test')
      })).rejects.toThrow('Speech synthesis not supported')
    })
  })

  describe('Settings Management', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => useVoice())
      
      const newSettings = { language: 'hi-IN', speechRate: 1.2 }
      
      act(() => {
        result.current.updateSettings(newSettings)
      })
      
      expect(mockVoiceService.updateSettings).toHaveBeenCalledWith(newSettings)
      expect(result.current.settings).toEqual({ ...mockSettings, ...newSettings })
    })
  })

  describe('Command Execution', () => {
    it('should execute check PNR command', async () => {
      // Mock window.location.hash
      Object.defineProperty(window, 'location', {
        value: { hash: '' },
        writable: true
      })
      
      const { result } = renderHook(() => useVoice())
      
      const command: VoiceCommand = {
        id: 'test1',
        command: 'check pnr 1234567890',
        intent: 'check_pnr',
        parameters: { pnr: '1234567890' },
        confidence: 0.9,
        timestamp: Date.now()
      }
      
      await act(async () => {
        result.current.executeCommand(command)
      })
      
      expect(window.location.hash).toBe('/pnr/1234567890')
      expect(mockVoiceService.speak).toHaveBeenCalledWith('Checking PNR 1234567890')
    })

    it('should execute navigation command', async () => {
      Object.defineProperty(window, 'location', {
        value: { hash: '' },
        writable: true
      })
      
      const { result } = renderHook(() => useVoice())
      
      const command: VoiceCommand = {
        id: 'test2',
        command: 'go to dashboard',
        intent: 'navigate',
        parameters: { destination: 'dashboard' },
        confidence: 0.9,
        timestamp: Date.now()
      }
      
      await act(async () => {
        result.current.executeCommand(command)
      })
      
      expect(window.location.hash).toBe('/dashboard')
      expect(mockVoiceService.speak).toHaveBeenCalledWith('Navigating to dashboard')
    })

    it('should execute help command', async () => {
      const { result } = renderHook(() => useVoice())
      
      const command: VoiceCommand = {
        id: 'test3',
        command: 'help',
        intent: 'help',
        parameters: {},
        confidence: 0.9,
        timestamp: Date.now()
      }
      
      await act(async () => {
        result.current.executeCommand(command)
      })
      
      expect(mockVoiceService.speak).toHaveBeenCalledWith(
        expect.stringContaining('I can help you check PNR status')
      )
    })

    it('should handle unknown commands', async () => {
      const { result } = renderHook(() => useVoice())
      
      const command: VoiceCommand = {
        id: 'test4',
        command: 'unknown command',
        intent: 'unknown',
        parameters: {},
        confidence: 0.5,
        timestamp: Date.now()
      }
      
      await act(async () => {
        result.current.executeCommand(command)
      })
      
      expect(mockVoiceService.speak).toHaveBeenCalledWith(
        expect.stringContaining("I didn't understand that command")
      )
    })
  })

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useVoice())
      
      // Set an error first
      act(() => {
        const errorCallback = mockVoiceService.onError.mock.calls[0][0]
        errorCallback('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBe(null)
    })

    it('should clear transcript', () => {
      const { result } = renderHook(() => useVoice())
      
      // Set a transcript first
      act(() => {
        const resultCallback = mockVoiceService.onResult.mock.calls[0][0]
        resultCallback({ transcript: 'test transcript', confidence: 0.9, isFinal: true, alternatives: [] })
      })
      
      expect(result.current.currentTranscript).toBe('test transcript')
      
      act(() => {
        result.current.clearTranscript()
      })
      
      expect(result.current.currentTranscript).toBe('')
    })
  })

  describe('Auto-start Functionality', () => {
    it('should auto-start when enabled', async () => {
      renderHook(() => useVoice({ autoStart: true }))
      
      await waitFor(() => {
        expect(mockVoiceService.startListening).toHaveBeenCalled()
      })
    })

    it('should not auto-start when disabled', () => {
      renderHook(() => useVoice({ autoStart: false }))
      
      expect(mockVoiceService.startListening).not.toHaveBeenCalled()
    })

    it('should not auto-start when voice is not enabled', () => {
      mockVoiceService.getSettings.mockReturnValue({ ...mockSettings, enabled: false })
      
      renderHook(() => useVoice({ autoStart: true }))
      
      expect(mockVoiceService.startListening).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle service not supported', () => {
      mockVoiceService.isVoiceSupported.mockReturnValue(false)
      
      const { result } = renderHook(() => useVoice())
      
      expect(result.current.isSupported).toBe(false)
    })

    it('should handle disabled voice service', async () => {
      mockVoiceService.getSettings.mockReturnValue({ ...mockSettings, enabled: false })
      
      const { result } = renderHook(() => useVoice())
      
      await act(async () => {
        await result.current.startListening()
      })
      
      expect(result.current.error).toBe('Voice recognition not supported or disabled')
      expect(mockVoiceService.startListening).not.toHaveBeenCalled()
    })
  })
})

describe('useVoiceCommands Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVoiceService.isVoiceSupported.mockReturnValue(true)
    mockVoiceService.getSettings.mockReturnValue({
      enabled: true,
      continuous: false,
      language: 'en-US'
    })
  })

  it('should configure for continuous listening', () => {
    const onCommand = vi.fn()
    renderHook(() => useVoiceCommands(onCommand))
    
    expect(mockVoiceService.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ continuous: true })
    )
  })

  it('should handle commands through callback', () => {
    const onCommand = vi.fn()
    let commandCallback: (command: VoiceCommand) => void
    
    mockVoiceService.onCommand.mockImplementation((callback) => {
      commandCallback = callback
    })
    
    renderHook(() => useVoiceCommands(onCommand))
    
    const mockCommand: VoiceCommand = {
      id: 'test1',
      command: 'check pnr 1234567890',
      intent: 'check_pnr',
      parameters: { pnr: '1234567890' },
      confidence: 0.9,
      timestamp: Date.now()
    }
    
    act(() => {
      commandCallback(mockCommand)
    })
    
    expect(onCommand).toHaveBeenCalledWith(mockCommand)
  })
})

describe('useSpeechSynthesis Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVoiceService.isVoiceSupported.mockReturnValue(true)
    mockVoiceService.speak.mockResolvedValue(undefined)
    mockVoiceService.getSettings.mockReturnValue({
      enabled: true,
      language: 'en-US'
    })
  })

  it('should provide specialized speech functions', async () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    
    await act(async () => {
      await result.current.speakPNRStatus('1234567890', 'confirmed')
    })
    
    expect(mockVoiceService.speak).toHaveBeenCalledWith(
      'PNR 1234567890 status is confirmed',
      { type: 'info', priority: 'medium' }
    )
  })

  it('should speak error messages with high priority', async () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    
    await act(async () => {
      await result.current.speakError('Network connection failed')
    })
    
    expect(mockVoiceService.speak).toHaveBeenCalledWith(
      'Error: Network connection failed',
      { type: 'error', priority: 'high', interrupt: true }
    )
  })

  it('should speak success messages', async () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    
    await act(async () => {
      await result.current.speakSuccess('PNR added successfully')
    })
    
    expect(mockVoiceService.speak).toHaveBeenCalledWith(
      'PNR added successfully',
      { type: 'success', priority: 'medium' }
    )
  })
})