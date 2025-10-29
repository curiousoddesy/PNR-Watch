import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SmartInput } from './ui/SmartInput'
import { SmartSuggestions } from './ui/SmartSuggestions'
import { ErrorRecovery } from './ui/ErrorRecovery'
import { VoiceInterface } from './ui/VoiceInterface'
import { VoicePNRInput } from './ui/VoicePNRInput'
import { PredictiveInput } from './ui/PredictiveInput'
import { VoiceCommand } from '../types'

export const IntelligentFeaturesDemo: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string>('smart-input')
  const [pnrValue, setPnrValue] = useState('')
  const [showError, setShowError] = useState(false)
  const [lastVoiceCommand, setLastVoiceCommand] = useState<VoiceCommand | null>(null)

  const demos = [
    { id: 'smart-input', title: 'Smart Input & Auto-completion', icon: '🧠' },
    { id: 'smart-suggestions', title: 'Smart Suggestions', icon: '💡' },
    { id: 'predictive-input', title: 'Predictive Text Input', icon: '🔮' },
    { id: 'voice-interface', title: 'Voice Interface', icon: '🎤' },
    { id: 'voice-pnr-input', title: 'Voice PNR Input', icon: '🎫' },
    { id: 'error-recovery', title: 'Error Recovery', icon: '🔧' }
  ]

  const handlePNRSubmit = (pnr: string) => {
    console.log('PNR submitted:', pnr)
    // Simulate processing
    setTimeout(() => {
      alert(`Processing PNR: ${pnr}`)
    }, 500)
  }

  const handleVoiceCommand = (command: VoiceCommand) => {
    setLastVoiceCommand(command)
    console.log('Voice command received:', command)
  }

  const renderDemo = () => {
    switch (selectedDemo) {
      case 'smart-input':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">PNR Auto-completion</h3>
              <SmartInput
                type="pnr"
                placeholder="Start typing a PNR number..."
                onValueChange={setPnrValue}
                className="w-full max-w-md"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Try typing "123" or any digits to see auto-completion suggestions
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Station Auto-completion</h3>
              <SmartInput
                type="station"
                placeholder="Start typing a station name..."
                className="w-full max-w-md"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Try typing "New" or "Mumbai" to see station suggestions
              </p>
            </div>
          </div>
        )

      case 'smart-suggestions':
        return (
          <div className="space-y-6">
            <SmartSuggestions
              context={{ currentPage: 'demo', userActivity: 'browsing' }}
              onSuggestionClick={(suggestion) => {
                console.log('Suggestion clicked:', suggestion)
                alert(`Executing: ${suggestion.title}`)
              }}
              maxSuggestions={6}
            />
          </div>
        )

      case 'predictive-input':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Predictive PNR Input</h3>
              <PredictiveInput
                type="pnr"
                placeholder="Start typing and see inline predictions..."
                onValueChange={setPnrValue}
                onPredictionAccept={(prediction) => {
                  console.log('Prediction accepted:', prediction)
                }}
                className="w-full max-w-md"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Type a few digits and see inline predictions. Press Tab or → to accept.
              </p>
            </div>
          </div>
        )

      case 'voice-interface':
        return (
          <div className="space-y-6">
            <VoiceInterface
              onCommand={handleVoiceCommand}
              showTranscript={true}
              showCommands={true}
            />
            
            {lastVoiceCommand && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Last Voice Command:
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Command:</strong> {lastVoiceCommand.command}</p>
                  <p><strong>Intent:</strong> {lastVoiceCommand.intent}</p>
                  <p><strong>Confidence:</strong> {Math.round(lastVoiceCommand.confidence * 100)}%</p>
                  {Object.keys(lastVoiceCommand.parameters).length > 0 && (
                    <p><strong>Parameters:</strong> {JSON.stringify(lastVoiceCommand.parameters)}</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )

      case 'voice-pnr-input':
        return (
          <div className="space-y-6">
            <VoicePNRInput
              onPNRSubmit={handlePNRSubmit}
              onVoiceCommand={handleVoiceCommand}
              placeholder="Enter PNR or click microphone to speak"
              autoSubmitOnVoice={false}
            />
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>💡 <strong>Try saying:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>"Check PNR 1234567890"</li>
                <li>"Add PNR 9876543210"</li>
                <li>Or just speak any 10-digit number</li>
              </ul>
            </div>
          </div>
        )

      case 'error-recovery':
        return (
          <div className="space-y-6">
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowError(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Simulate Invalid PNR Error
              </button>
              <button
                onClick={() => setShowError(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear Error
              </button>
            </div>
            
            {showError && (
              <ErrorRecovery
                error="invalid_pnr"
                context={{ pnr: '123' }}
                onRetry={() => {
                  console.log('Retrying...')
                  setShowError(false)
                }}
                onDismiss={() => setShowError(false)}
                showSuggestions={true}
              />
            )}
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Click "Simulate Invalid PNR Error" to see intelligent error recovery in action.</p>
            </div>
          </div>
        )

      default:
        return <div>Select a demo from the sidebar</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Intelligent Features Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore smart input, voice interface, and AI-powered features
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Features
              </h2>
              <nav className="space-y-2">
                {demos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setSelectedDemo(demo.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                      selectedDemo === demo.id
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-xl">{demo.icon}</span>
                    <span className="text-sm font-medium">{demo.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <motion.div
                key={selectedDemo}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderDemo()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}