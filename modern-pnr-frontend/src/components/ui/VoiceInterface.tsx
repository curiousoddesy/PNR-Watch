import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceCommand } from '../../types'
import { useVoice } from '../../hooks/useVoice'
import { cn } from '../../utils/cn'

interface VoiceInterfaceProps {
  className?: string
  showTranscript?: boolean
  showCommands?: boolean
  onCommand?: (command: VoiceCommand) => void
  compact?: boolean
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  className,
  showTranscript = true,
  showCommands = true,
  onCommand,
  compact = false
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([])
  
  const {
    isSupported,
    isListening,
    isEnabled,
    currentTranscript,
    lastCommand,
    error,
    startListening,
    stopListening,
    toggleListening,
    speak,
    settings,
    updateSettings,
    executeCommand,
    clearError,
    clearTranscript
  } = useVoice({
    onCommand: (command) => {
      setCommandHistory(prev => [command, ...prev.slice(0, 4)]) // Keep last 5 commands
      executeCommand(command)
      onCommand?.(command)
    }
  })

  // Auto-clear transcript after a delay
  useEffect(() => {
    if (currentTranscript && !isListening) {
      const timer = setTimeout(() => {
        clearTranscript()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [currentTranscript, isListening, clearTranscript])

  if (!isSupported) {
    return (
      <div className={cn('p-4 bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
        <div className="text-center text-gray-600 dark:text-gray-400">
          <span className="text-2xl mb-2 block">🎤</span>
          <p className="text-sm">Voice features are not supported in this browser</p>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    if (error) return 'text-red-500'
    if (isListening) return 'text-green-500'
    if (isEnabled) return 'text-blue-500'
    return 'text-gray-500'
  }

  const getStatusText = () => {
    if (error) return 'Error'
    if (isListening) return 'Listening...'
    if (isEnabled) return 'Ready'
    return 'Disabled'
  }

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          disabled={!isEnabled}
          className={cn(
            'p-2 rounded-full transition-colors',
            isListening 
              ? 'bg-red-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-600',
            !isEnabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <motion.div
            animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
          >
            🎤
          </motion.div>
        </motion.button>
        
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate"
          >
            "{currentTranscript}"
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
            className="text-2xl"
          >
            🎤
          </motion.div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Voice Assistant
            </h3>
            <p className={cn('text-sm', getStatusColor())}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          ⚙️
        </button>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Voice
              </label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSettings({ enabled: e.target.checked })}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Continuous Listening
              </label>
              <input
                type="checkbox"
                checked={settings.continuous}
                onChange={(e) => updateSettings({ continuous: e.target.checked })}
                className="rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
              >
                <option value="en-US">English (US)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
                <option value="bn-IN">Bengali</option>
                <option value="te-IN">Telugu</option>
                <option value="ta-IN">Tamil</option>
                <option value="mr-IN">Marathi</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleListening}
          disabled={!isEnabled}
          className={cn(
            'flex-1 py-3 px-4 rounded-lg font-medium transition-colors',
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600',
            !isEnabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </motion.button>
        
        <button
          onClick={() => speak('Voice assistant is ready')}
          disabled={!isEnabled}
          className={cn(
            'p-3 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors',
            !isEnabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Test speech"
        >
          🔊
        </button>
      </div>

      {/* Current Transcript */}
      {showTranscript && (
        <AnimatePresence>
          {currentTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                    {isListening ? 'Listening...' : 'You said:'}
                  </p>
                  <p className="text-blue-700 dark:text-blue-200">
                    "{currentTranscript}"
                  </p>
                </div>
                <motion.div
                  animate={isListening ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                  transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
                  className="text-blue-500"
                >
                  🎵
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Command History */}
      {showCommands && commandHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Recent Commands
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {commandHistory.map((command, index) => (
              <motion.div
                key={command.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white truncate">
                    {command.command}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {command.intent} • {Math.round(command.confidence * 100)}% confidence
                  </p>
                </div>
                <div className="ml-2 text-xs text-gray-400">
                  {new Date(command.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!isListening && !currentTranscript && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Try saying:
          </p>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>• "Check PNR 1234567890"</li>
            <li>• "Add PNR 9876543210"</li>
            <li>• "Go to dashboard"</li>
            <li>• "Help"</li>
          </ul>
        </div>
      )}
    </div>
  )
}

// Floating Voice Button Component
export const VoiceButton: React.FC<{
  className?: string
  onCommand?: (command: VoiceCommand) => void
}> = ({ className, onCommand }) => {
  const { isSupported, isListening, toggleListening, isEnabled } = useVoice({ onCommand })

  if (!isSupported) return null

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleListening}
      disabled={!isEnabled}
      className={cn(
        'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50',
        'flex items-center justify-center text-white text-xl',
        isListening 
          ? 'bg-red-500 hover:bg-red-600' 
          : 'bg-blue-500 hover:bg-blue-600',
        !isEnabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <motion.div
        animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
      >
        🎤
      </motion.div>
      
      {/* Listening indicator */}
      {isListening && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 rounded-full bg-red-500"
        />
      )}
    </motion.button>
  )
}