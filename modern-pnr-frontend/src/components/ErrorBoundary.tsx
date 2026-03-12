import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught:', error, errorInfo.componentStack)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-ground bg-vivid px-4">
          <div
            className="max-w-sm w-full rounded-3xl p-8 text-center relative overflow-hidden"
            style={{
              background: 'var(--glass-bg-heavy)',
              backdropFilter: 'blur(50px) saturate(2)',
              WebkitBackdropFilter: 'blur(50px) saturate(2)',
              border: '0.5px solid var(--glass-border)',
              boxShadow: 'inset 0 1.5px 1px 0 var(--glass-highlight), 0 12px 40px var(--glass-shadow-drop)',
            }}
          >
            {/* Top specular highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

            {/* Error icon — glass circle */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(255, 59, 48, 0.1)' }}
            >
              <svg className="w-7 h-7 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <h1 className="text-[18px] font-display font-bold text-ink mb-1">
              Something went wrong
            </h1>
            <p className="text-[14px] text-ink-muted/60 mb-6">
              Please try reloading the page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre
                className="mb-6 p-3 rounded-2xl text-[11px] text-left overflow-auto max-h-28 font-mono text-ink-muted/50"
                style={{ background: 'rgba(120, 120, 128, 0.08)' }}
              >
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleReload}
              className="px-7 py-3 rounded-2xl text-[15px] font-semibold text-white transition-all"
              style={{
                background: '#007AFF',
                boxShadow: '0 4px 16px rgba(0, 122, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
