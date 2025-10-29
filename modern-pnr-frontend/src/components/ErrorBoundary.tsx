/**
 * Production-ready Error Boundary with monitoring integration
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { monitoring } from '../services/monitoring'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean // Whether to isolate errors to this boundary
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, isolate } = this.props

    // Update state with error info
    this.setState({ errorInfo })

    // Report to monitoring service
    monitoring.captureError(error, {
      type: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      isolate,
      retryCount: this.retryCount,
    })

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group('🚨 React Error Boundary')
      console.error('Error:', error)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // Dispatch custom event for global error handling
    window.dispatchEvent(new CustomEvent('react-error', {
      detail: {
        error,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      }
    }))
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      
      monitoring.trackEvent('error_boundary_retry', {
        errorId: this.state.errorId,
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
      })

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
      })
    }
  }

  handleReload = () => {
    monitoring.trackEvent('error_boundary_reload', {
      errorId: this.state.errorId,
      retryCount: this.retryCount,
    })

    window.location.reload()
  }

  handleReport = () => {
    const { error, errorInfo, errorId } = this.state
    
    if (!error || !errorInfo) return

    monitoring.trackEvent('error_boundary_report', {
      errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    })

    // Create detailed error report
    const report = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
    }

    // Copy to clipboard
    navigator.clipboard?.writeText(JSON.stringify(report, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please share this with support.')
      })
      .catch(() => {
        // Fallback: show in modal or download as file
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `error-report-${errorId}.json`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. The error has been reported automatically.
              </p>

              {import.meta.env.DEV && error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-gray-100 rounded p-3 text-xs font-mono text-gray-800 overflow-auto max-h-32">
                    <div className="font-semibold mb-1">Error:</div>
                    <div className="mb-2">{error.message}</div>
                    {error.stack && (
                      <>
                        <div className="font-semibold mb-1">Stack:</div>
                        <pre className="whitespace-pre-wrap">{error.stack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {this.retryCount < this.maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Reload Page
                </button>
              </div>

              <button
                onClick={this.handleReport}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Copy Error Report
              </button>

              {errorId && (
                <p className="mt-4 text-xs text-gray-400">
                  Error ID: {errorId}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    monitoring.captureError(error, {
      type: 'react_hook_error',
      componentStack: errorInfo?.componentStack,
    })
  }, [])
}

// Feature-specific error boundaries
export const FeatureErrorBoundary: React.FC<Props & { feature: string }> = ({ 
  feature, 
  children, 
  ...props 
}) => (
  <ErrorBoundary
    {...props}
    onError={(error, errorInfo) => {
      monitoring.trackEvent('feature_error', {
        feature,
        error: error.message,
        componentStack: errorInfo.componentStack,
      })
      props.onError?.(error, errorInfo)
    }}
    fallback={
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {feature} Feature Unavailable
            </h3>
            <p className="mt-1 text-sm text-red-700">
              This feature is temporarily unavailable. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

export default ErrorBoundary