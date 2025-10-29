import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceCommand } from '../../types'
import { useVoice } from '../../hooks/useVoice'
import { SmartInput } from './SmartInput'
import { cn } from '../../utils/cn'

interface VoicePNRInputProps {
  onPNRSubmit?: (pnr: string) => void
  onVoiceCommand?: (command: VoiceCommand) => void
  placeholder?: string
  className?: string
  showVoiceButton?: boolean
  autoSubmitOnVoice?: boolean
}

export const VoicePNRInput: React.FC<VoicePNRInputProps> = ({
  onPNRSubmit,
  onVoiceCommand,
  placeholder = "Enter PNR number or click to speak",
  className,
  showVoiceButton = true,
  autoSubmitOnVoice = true
}) => {
  const [pnrValue, setPNRValue] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceConfidence, setVoiceConfidence] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    isSupported,
    isListening,
    isEnabled,
    currentTranscript,
    lastCommand,
    error,
    startListening,
    stopListening,
    speak,
    clearError,
    clearTranscript
  } = useVoice({
    onCommand: (command) => {
      handleVoiceCommand(command)
      onVoiceCommand?.(command)
    }
  })

  const handleVoiceCommand = (command: VoiceCommand) => {
    if (command.intent === 'check_pnr' || command.intent === 'add_pnr') {
      const pnr = command.parameters.pnr
      if (pnr && /^\d{10}$/.test(pnr)) {
        setPNRValue(pnr)
        setVoiceConfidence(command.confidence)
        
        if (autoSubmitOnVoice && command.confidence > 0.7) {
          onPNRSubmit?.(pnr)
          speak(`Processing PNR ${pnr}`)
        } else {
          speak(`I heard PNR ${pnr}. Please confirm or edit if needed.`)
        }
      } else {
        speak("I couldn't understand the PNR number. Please try again or type it manually.")
      }
    }
  }

  // Handle voice transcript for PNR extraction
  useEffect(() => {
    if (currentTranscript && isVoiceMode) {
      // Extract PNR from transcript
      const pnrMatch = currentTranscript.match(/\d{10}/)
      if (pnrMatch) {
        setPNRValue(pnrMatch[0])
      }
    }
  }, [currentTranscript, isVoiceMode])

  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening()
      setIsVoiceMode(false)
    } else {
      try {
        setIsVoiceMode(true)
        await startListening()
        speak("Please say the PNR number")
      } catch (err) {
        setIsVoiceMode(false)
        speak("Sorry, I couldn't start listening. Please try again.")
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pnrValue && /^\d{10}$/.test(pnrValue)) {
      onPNRSubmit?.(pnrValue)
    }
  }

  const handleInputChange = (value: string) => {
    setPNRValue(value)
    setVoiceConfidence(0) // Reset confidence when manually typing
  }

  const validatePNR = (pnr: string): boolean => {
    return /^\d{10}$/.test(pnr)
  }

  const getInputStatus = () => {
    if (error) return 'error'
    if (isListening) return 'listening'
    if (voiceConfidence > 0.8) return 'high-confidence'
    if (voiceConfidence > 0.5) return 'medium-confidence'
    if (voiceConfidence > 0) return 'low-confidence'
    return 'normal'
  }

  const getStatusColor = () => {
    switch (getInputStatus()) {
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'listening': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'high-confidence': return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'medium-confidence': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low-confidence': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      default: return 'border-gray-300 dark:border-gray-600'
    }
  }

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Input Container */}
        <div className={cn('relative rounded-lg transition-all duration-200', getStatusColor())}>
          <div className="flex items-center">
            <SmartInput
              ref={inputRef}
              type="pnr"
              value={pnrValue}
              onValueChange={handleInputChange}
              placeholder={placeholder}
              className={cn(
                'flex-1 border-0 bg-transparent focus:ring-0',
                isListening && 'text-blue-600 dark:text-blue-400'
              )}
              maxLength={10}
            />
            
            {/* Voice Button */}
            {showVoiceButton && isSupported && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceToggle}
                disabled={!isEnabled}
                className={cn(
                  'ml-2 mr-3 p-2 rounded-full transition-colors',
                  isListening 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 text-white hover:bg-blue-600',
                  !isEnabled && 'opacity-50 cursor-not-allowed'
                )}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <motion.div
                  animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
                  className="w-5 h-5 flex items-center justify-center"
                >
                  🎤
                </motion.div>
              </motion.button>
            )}
          </div>
          
          {/* Voice Confidence Indicator */}
          {voiceConfidence > 0 && (
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-b-lg"
                 style={{ width: `${voiceConfidence * 100}%` }} />
          )}
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                ✕
              </button>
            </motion.div>
          )}
          
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-blue-500"
                >
                  🎵
                </motion.div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Listening for PNR number...
                </span>
              </div>
              {currentTranscript && (
                <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  "{currentTranscript}"
                </p>
              )}
            </motion.div>
          )}
          
          {voiceConfidence > 0 && !isListening && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'p-3 rounded-lg border',
                voiceConfidence > 0.8 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : voiceConfidence > 0.5
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    voiceConfidence > 0.8 
                      ? 'text-green-700 dark:text-green-300'
                      : voiceConfidence > 0.5
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-orange-700 dark:text-orange-300'
                  )}>
                    Voice Recognition: {Math.round(voiceConfidence * 100)}% confident
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {voiceConfidence > 0.8 
                      ? 'High confidence - ready to submit'
                      : voiceConfidence > 0.5
                      ? 'Medium confidence - please verify'
                      : 'Low confidence - please check the number'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVoiceConfidence(0)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!validatePNR(pnrValue)}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-medium transition-colors',
            validatePNR(pnrValue)
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          )}
        >
          {isListening ? 'Listening...' : 'Check PNR Status'}
        </motion.button>

        {/* Voice Instructions */}
        {isSupported && (
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Click the microphone and say "Check PNR" followed by your 10-digit PNR number
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

// Specialized component for adding PNRs with voice
export const VoiceAddPNRInput: React.FC<Omit<VoicePNRInputProps, 'onPNRSubmit'> & {
  onPNRAdd?: (pnr: string) => void
}> = ({ onPNRAdd, ...props }) => {
  return (
    <VoicePNRInput
      {...props}
      onPNRSubmit={onPNRAdd}
      placeholder="Enter PNR to track or speak it"
    />
  )
}