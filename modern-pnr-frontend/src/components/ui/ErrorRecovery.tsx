import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IntelligentError } from '../../types'
import { useIntelligentFeatures } from '../../hooks/useIntelligentFeatures'
import { cn } from '../../utils/cn'

interface ErrorRecoveryProps {
  error: string
  context?: Record<string, any>
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showSuggestions?: boolean
  autoHide?: boolean
  autoHideDelay?: number
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  context = {},
  onRetry,
  onDismiss,
  className,
  showSuggestions = true,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const { getErrorSuggestions } = useIntelligentFeatures()
  
  const errorInfo = getErrorSuggestions(error, context)

  // Auto-hide functionality
  React.useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoHideDelay)
      
      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleAutoFix = async () => {
    if (errorInfo.autoFix) {
      try {
        await errorInfo.autoFix()
        handleDismiss()
      } catch (fixError) {
        console.error('Auto-fix failed:', fixError)
      }
    }
  }

  const getErrorIcon = (code: string) => {
    switch (code) {
      case 'INVALID_PNR':
        return '🎫'
      case 'PNR_NOT_FOUND':
        return '🔍'
      case 'NETWORK_ERROR':
        return '🌐'
      default:
        return '⚠️'
    }
  }

  const getErrorColor = (code: string) => {
    switch (code) {
      case 'INVALID_PNR':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'PNR_NOT_FOUND':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'NETWORK_ERROR':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'border-l-4 rounded-lg p-4 shadow-md',
          getErrorColor(errorInfo.code),
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <span className="text-2xl" role="img" aria-label="error">
              {getErrorIcon(errorInfo.code)}
            </span>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {errorInfo.message}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  {errorInfo.code}
                </span>
              </div>
              
              {showSuggestions && errorInfo.suggestions.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center space-x-1"
                  >
                    <span>
                      {isExpanded ? 'Hide' : 'Show'} suggestions ({errorInfo.suggestions.length})
                    </span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      ▼
                    </motion.span>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 space-y-2"
                      >
                        {errorInfo.suggestions.map((suggestion, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{suggestion}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-2"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="mt-4 flex items-center space-x-3">
          {onRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Try Again
            </motion.button>
          )}
          
          {errorInfo.autoFix && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAutoFix}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Auto Fix
            </motion.button>
          )}
          
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
          >
            Dismiss
          </button>
        </div>
        
        {/* Progress bar for auto-hide */}
        {autoHide && (
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: autoHideDelay / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-1 bg-blue-500 opacity-30"
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Specialized error components
export const PNRError: React.FC<Omit<ErrorRecoveryProps, 'error'> & { pnr?: string }> = ({ 
  pnr, 
  ...props 
}) => {
  const error = pnr ? 'pnr_not_found' : 'invalid_pnr'
  const context = pnr ? { pnr } : {}
  
  return <ErrorRecovery error={error} context={context} {...props} />
}

export const NetworkError: React.FC<Omit<ErrorRecoveryProps, 'error'>> = (props) => {
  return <ErrorRecovery error="network_error" {...props} />
}

// Error boundary component with intelligent recovery
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

export class IntelligentErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
    
    // Log error for learning
    console.error('Intelligent Error Boundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      return (
        <div className="p-6 max-w-md mx-auto">
          <ErrorRecovery
            error="unknown_error"
            context={{ 
              errorMessage: this.state.error.message,
              errorId: this.state.errorId 
            }}
            onRetry={this.handleRetry}
            showSuggestions={true}
          />
        </div>
      )
    }

    return this.props.children
  }
}