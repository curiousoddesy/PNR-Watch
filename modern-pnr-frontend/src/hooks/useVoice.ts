import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  VoiceCommand, 
  VoiceSettings, 
  SpeechRecognitionResult, 
  AudioFeedback 
} from '../types'
import { voiceService } from '../services/voiceService'

interface UseVoiceOptions {
  autoStart?: boolean
  continuous?: boolean
  language?: string
  onCommand?: (command: VoiceCommand) => void
  onError?: (error: string) => void
}

interface UseVoiceReturn {
  // State
  isSupported: boolean
  isListening: boolean
  isEnabled: boolean
  currentTranscript: string
  lastCommand: VoiceCommand | null
  error: string | null
  
  // Actions
  startListening: () => Promise<void>
  stopListening: () => void
  toggleListening: () => Promise<void>
  speak: (text: string, options?: Partial<AudioFeedback>) => Promise<void>
  
  // Settings
  settings: VoiceSettings
  updateSettings: (settings: Partial<VoiceSettings>) => void
  
  // Commands
  executeCommand: (command: VoiceCommand) => void
  
  // Utils
  clearError: () => void
  clearTranscript: () => void
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    autoStart = false,
    continuous = false,
    language = 'en-US',
    onCommand,
    onError
  } = options

  // State
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<VoiceSettings>(voiceService.getSettings())
  
  const isSupported = voiceService.isVoiceSupported()
  const isEnabled = settings.enabled
  
  // Refs for stable callbacks
  const onCommandRef = useRef(onCommand)
  const onErrorRef = useRef(onError)
  
  useEffect(() => {
    onCommandRef.current = onCommand
    onErrorRef.current = onError
  }, [onCommand, onError])

  // Initialize voice service
  useEffect(() => {
    if (!isSupported) return

    // Set up event listeners
    voiceService.onResult((result: SpeechRecognitionResult) => {
      setCurrentTranscript(result.transcript)
      setError(null)
    })

    voiceService.onCommand((command: VoiceCommand) => {
      setLastCommand(command)
      onCommandRef.current?.(command)
    })

    voiceService.onError((errorMessage: string) => {
      setError(errorMessage)
      setIsListening(false)
      onErrorRef.current?.(errorMessage)
    })

    voiceService.onStart(() => {
      setIsListening(true)
      setError(null)
    })

    voiceService.onEnd(() => {
      setIsListening(false)
    })

    // Update initial settings
    voiceService.updateSettings({
      continuous,
      language,
      enabled: true
    })

    // Auto-start if requested
    if (autoStart && isEnabled) {
      startListening()
    }

    return () => {
      voiceService.destroy()
    }
  }, [isSupported, autoStart, continuous, language, isEnabled])

  // Actions
  const startListening = useCallback(async () => {
    if (!isSupported || !isEnabled) {
      setError('Voice recognition not supported or disabled')
      return
    }

    try {
      await voiceService.startListening()
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening'
      setError(errorMessage)
      onErrorRef.current?.(errorMessage)
    }
  }, [isSupported, isEnabled])

  const stopListening = useCallback(() => {
    voiceService.stopListening()
  }, [])

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening()
    } else {
      await startListening()
    }
  }, [isListening, startListening, stopListening])

  const speak = useCallback(async (text: string, options: Partial<AudioFeedback> = {}) => {
    if (!isSupported) {
      throw new Error('Speech synthesis not supported')
    }

    try {
      await voiceService.speak(text, options)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to speak'
      setError(errorMessage)
      throw err
    }
  }, [isSupported])

  // Settings
  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    voiceService.updateSettings(newSettings)
  }, [settings])

  // Command execution
  const executeCommand = useCallback((command: VoiceCommand) => {
    switch (command.intent) {
      case 'check_pnr':
        if (command.parameters.pnr) {
          // Navigate to PNR check page
          window.location.hash = `/pnr/${command.parameters.pnr}`
          speak(`Checking PNR ${command.parameters.pnr}`)
        }
        break
      
      case 'add_pnr':
        if (command.parameters.pnr) {
          // Add PNR to tracking
          console.log('Adding PNR:', command.parameters.pnr)
          speak(`Added PNR ${command.parameters.pnr} to tracking`)
        }
        break
      
      case 'navigate':
        if (command.parameters.destination) {
          const destination = command.parameters.destination.toLowerCase()
          const routes: Record<string, string> = {
            'home': '/',
            'dashboard': '/dashboard',
            'pnr': '/pnr',
            'history': '/history',
            'settings': '/settings'
          }
          
          if (routes[destination]) {
            window.location.hash = routes[destination]
            speak(`Navigating to ${destination}`)
          } else {
            speak(`Sorry, I don't know how to navigate to ${destination}`)
          }
        }
        break
      
      case 'help':
        speak(`I can help you check PNR status, add new PNRs to track, and navigate the app. Try saying "check PNR" followed by a 10-digit number, or "go to dashboard".`)
        break
      
      default:
        speak(`I didn't understand that command. Try saying "help" to learn what I can do.`)
    }
  }, [speak])

  // Utils
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearTranscript = useCallback(() => {
    setCurrentTranscript('')
  }, [])

  return {
    // State
    isSupported,
    isListening,
    isEnabled,
    currentTranscript,
    lastCommand,
    error,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    speak,
    
    // Settings
    settings,
    updateSettings,
    
    // Commands
    executeCommand,
    
    // Utils
    clearError,
    clearTranscript
  }
}

// Specialized hooks
export function useVoiceCommands(onCommand?: (command: VoiceCommand) => void) {
  return useVoice({
    continuous: true,
    onCommand
  })
}

export function useVoiceNavigation() {
  const voice = useVoice({
    continuous: true,
    onCommand: (command) => {
      if (command.intent === 'navigate') {
        voice.executeCommand(command)
      }
    }
  })

  return {
    ...voice,
    navigateByVoice: (destination: string) => {
      const command: VoiceCommand = {
        id: `nav_${Date.now()}`,
        command: `go to ${destination}`,
        intent: 'navigate',
        parameters: { destination },
        confidence: 1,
        timestamp: Date.now()
      }
      voice.executeCommand(command)
    }
  }
}

export function useSpeechSynthesis() {
  const { speak, isSupported, settings, updateSettings } = useVoice()

  const speakPNRStatus = useCallback(async (pnr: string, status: string) => {
    await speak(`PNR ${pnr} status is ${status}`, { 
      type: 'info', 
      priority: 'medium' 
    })
  }, [speak])

  const speakError = useCallback(async (message: string) => {
    await speak(`Error: ${message}`, { 
      type: 'error', 
      priority: 'high',
      interrupt: true 
    })
  }, [speak])

  const speakSuccess = useCallback(async (message: string) => {
    await speak(message, { 
      type: 'success', 
      priority: 'medium' 
    })
  }, [speak])

  return {
    speak,
    speakPNRStatus,
    speakError,
    speakSuccess,
    isSupported,
    settings,
    updateSettings
  }
}