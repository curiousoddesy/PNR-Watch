import { 
  VoiceCommand, 
  VoiceSettings, 
  SpeechRecognitionResult, 
  VoiceNavigationCommand,
  AudioFeedback 
} from '../types'

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare var SpeechRecognition: SpeechRecognitionConstructor
declare var webkitSpeechRecognition: SpeechRecognitionConstructor

class VoiceService {
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis | null = null
  private isListening = false
  private isSupported = false
  private settings: VoiceSettings = {
    enabled: false,
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
  
  private commandPatterns = {
    check_pnr: [
      /check\s+pnr\s+(\d{10})/i,
      /status\s+of\s+(\d{10})/i,
      /track\s+(\d{10})/i,
      /pnr\s+(\d{10})/i
    ],
    add_pnr: [
      /add\s+pnr\s+(\d{10})/i,
      /track\s+new\s+pnr\s+(\d{10})/i,
      /monitor\s+(\d{10})/i
    ],
    navigate: [
      /go\s+to\s+(.+)/i,
      /open\s+(.+)/i,
      /navigate\s+to\s+(.+)/i,
      /show\s+(.+)/i
    ],
    help: [
      /help/i,
      /what\s+can\s+you\s+do/i,
      /commands/i,
      /how\s+to/i
    ]
  }

  private listeners: {
    onResult?: (result: SpeechRecognitionResult) => void
    onCommand?: (command: VoiceCommand) => void
    onError?: (error: string) => void
    onStart?: () => void
    onEnd?: () => void
  } = {}

  constructor() {
    this.initializeServices()
    this.loadSettings()
  }

  private initializeServices(): void {
    // Initialize Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognitionAPI()
      this.isSupported = true
      this.setupRecognition()
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return

    this.recognition.continuous = this.settings.continuous
    this.recognition.interimResults = this.settings.interimResults
    this.recognition.lang = this.settings.language
    this.recognition.maxAlternatives = this.settings.maxAlternatives

    this.recognition.onstart = () => {
      this.isListening = true
      this.listeners.onStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.listeners.onEnd?.()
    }

    this.recognition.onerror = (event: any) => {
      this.isListening = false
      this.listeners.onError?.(event.error)
    }

    this.recognition.onresult = (event: any) => {
      const results = Array.from(event.results)
      const lastResult = results[results.length - 1]
      
      if (lastResult) {
        const transcript = lastResult[0].transcript
        const confidence = lastResult[0].confidence
        const isFinal = lastResult.isFinal
        
        const alternatives = Array.from(lastResult).map((result: any) => ({
          transcript: result.transcript,
          confidence: result.confidence
        }))

        const speechResult: SpeechRecognitionResult = {
          transcript,
          confidence,
          isFinal,
          alternatives
        }

        this.listeners.onResult?.(speechResult)

        if (isFinal) {
          this.processCommand(transcript, confidence)
        }
      }
    }
  }

  private processCommand(transcript: string, confidence: number): void {
    const command = this.parseCommand(transcript, confidence)
    this.listeners.onCommand?.(command)
  }

  private parseCommand(transcript: string, confidence: number): VoiceCommand {
    const cleanTranscript = transcript.toLowerCase().trim()
    
    // Check for wake word if voice activation is enabled
    if (this.settings.voiceActivation && !cleanTranscript.includes(this.settings.wakeWord)) {
      return {
        id: this.generateId(),
        command: transcript,
        intent: 'unknown',
        parameters: {},
        confidence: 0,
        timestamp: Date.now()
      }
    }

    // Remove wake word from transcript
    const commandText = this.settings.voiceActivation 
      ? cleanTranscript.replace(this.settings.wakeWord, '').trim()
      : cleanTranscript

    // Match against command patterns
    for (const [intent, patterns] of Object.entries(this.commandPatterns)) {
      for (const pattern of patterns) {
        const match = commandText.match(pattern)
        if (match) {
          const parameters: Record<string, any> = {}
          
          // Extract parameters based on intent
          switch (intent) {
            case 'check_pnr':
            case 'add_pnr':
              if (match[1]) {
                parameters.pnr = match[1]
              }
              break
            case 'navigate':
              if (match[1]) {
                parameters.destination = match[1]
              }
              break
          }

          return {
            id: this.generateId(),
            command: transcript,
            intent: intent as any,
            parameters,
            confidence: confidence * 0.9, // Slightly reduce confidence for pattern matching
            timestamp: Date.now()
          }
        }
      }
    }

    // No pattern matched
    return {
      id: this.generateId(),
      command: transcript,
      intent: 'unknown',
      parameters: {},
      confidence: confidence * 0.5,
      timestamp: Date.now()
    }
  }

  // Public API
  isVoiceSupported(): boolean {
    return this.isSupported && !!this.recognition && !!this.synthesis
  }

  isCurrentlyListening(): boolean {
    return this.isListening
  }

  startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition || !this.settings.enabled) {
        reject(new Error('Voice recognition not available or disabled'))
        return
      }

      if (this.isListening) {
        resolve()
        return
      }

      try {
        this.recognition.start()
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  speak(text: string, options: Partial<AudioFeedback> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'))
        return
      }

      // Stop any ongoing speech if interrupt is true
      if (options.interrupt !== false) {
        this.synthesis.cancel()
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = this.settings.speechRate
      utterance.pitch = this.settings.speechPitch
      utterance.volume = this.settings.speechVolume
      utterance.lang = this.settings.language

      utterance.onend = () => resolve()
      utterance.onerror = (error) => reject(error)

      this.synthesis.speak(utterance)
    })
  }

  // Voice-guided navigation
  executeVoiceNavigation(command: VoiceNavigationCommand): void {
    switch (command.action) {
      case 'go_to':
        this.navigateToPage(command.target || '')
        break
      case 'click':
        this.clickElement(command.target || '')
        break
      case 'scroll':
        this.scrollPage(command.parameters?.direction || 'down')
        break
      case 'focus':
        this.focusElement(command.target || '')
        break
      case 'back':
        window.history.back()
        break
      case 'forward':
        window.history.forward()
        break
    }
  }

  private navigateToPage(destination: string): void {
    const routes: Record<string, string> = {
      'home': '/',
      'dashboard': '/dashboard',
      'pnr': '/pnr',
      'history': '/history',
      'settings': '/settings',
      'help': '/help'
    }

    const route = routes[destination.toLowerCase()]
    if (route) {
      window.location.hash = route
    }
  }

  private clickElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.click()
    }
  }

  private scrollPage(direction: string): void {
    const scrollAmount = window.innerHeight * 0.8
    const currentScroll = window.pageYOffset

    if (direction === 'up') {
      window.scrollTo({ top: currentScroll - scrollAmount, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: currentScroll + scrollAmount, behavior: 'smooth' })
    }
  }

  private focusElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement
    if (element && element.focus) {
      element.focus()
    }
  }

  // Settings management
  updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
    
    if (this.recognition) {
      this.recognition.continuous = this.settings.continuous
      this.recognition.interimResults = this.settings.interimResults
      this.recognition.lang = this.settings.language
      this.recognition.maxAlternatives = this.settings.maxAlternatives
    }
  }

  getSettings(): VoiceSettings {
    return { ...this.settings }
  }

  // Event listeners
  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.listeners.onResult = callback
  }

  onCommand(callback: (command: VoiceCommand) => void): void {
    this.listeners.onCommand = callback
  }

  onError(callback: (error: string) => void): void {
    this.listeners.onError = callback
  }

  onStart(callback: () => void): void {
    this.listeners.onStart = callback
  }

  onEnd(callback: () => void): void {
    this.listeners.onEnd = callback
  }

  // Multi-language support
  getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
      'hi-IN', 'bn-IN', 'te-IN', 'ta-IN', 'mr-IN',
      'gu-IN', 'kn-IN', 'ml-IN', 'or-IN', 'pa-IN',
      'ur-IN', 'as-IN', 'ne-IN'
    ]
  }

  setLanguage(language: string): void {
    if (this.getSupportedLanguages().includes(language)) {
      this.updateSettings({ language })
    }
  }

  // Utility methods
  private generateId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('voice_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        this.settings = { ...this.settings, ...settings }
      }
    } catch (error) {
      console.warn('Failed to load voice settings:', error)
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('voice_settings', JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Failed to save voice settings:', error)
    }
  }

  // Cleanup
  destroy(): void {
    this.stopListening()
    if (this.synthesis) {
      this.synthesis.cancel()
    }
    this.listeners = {}
  }
}

export const voiceService = new VoiceService()