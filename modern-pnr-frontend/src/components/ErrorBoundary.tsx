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
        <div className="min-h-screen flex items-center bg-paper text-ink px-6">
          <div className="mx-auto max-w-md w-full">
            <p className="type-eyebrow mb-4">Error</p>
            <h1 className="type-display text-ink mb-4" style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}>
              Something broke.
            </h1>
            <p className="text-[16px] text-ink-2 mb-10 tracking-tight">
              The page didn't load the way it should. A reload usually fixes it.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-10 p-4 rounded-xl text-[12px] text-left overflow-auto max-h-40 type-mono text-ink-2 border border-rule">
                {this.state.error.message}
              </pre>
            )}

            <button onClick={this.handleReload} className="btn-primary">
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
