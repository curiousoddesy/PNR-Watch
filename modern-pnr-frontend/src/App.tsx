import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { queryClient } from './services/queryClient'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider, Button, useToastActions } from './components/ui'
import { ThemeSwitcher, AccessibilityControls } from './components/ui/ThemeSwitcher'
import { DesignSystemDemo } from './components/DesignSystemDemo'
import { PNRManagementDemo } from './components/PNRManagementDemo'
import { PNRDetailDemo } from './components/PNRDetailDemo'
import { SmartPNRFormsDemo } from './components/SmartPNRFormsDemo'
import { ErrorBoundary } from './components/ErrorBoundary'
import { monitoring } from './services/monitoring'
import './App.css'

function AppContent() {
  const toast = useToastActions()

  return (
    <>
      {/* Skip links for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <div className="min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 py-8"
        >
          <header className="text-center mb-8">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-4xl font-bold text-text mb-4"
            >
              Modern PNR Tracker
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-text-secondary mb-6"
            >
              Design System Components Demo with Dynamic Theming
            </motion.p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
              <ThemeSwitcher />
              <Button
                onClick={() => toast.info('Welcome!', 'Design system components are ready to use')}
                variant="primary"
              >
                Test Toast
              </Button>
            </div>

            {/* Accessibility Controls */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="max-w-md mx-auto mb-8 p-4 bg-surface rounded-lg border border-border"
            >
              <AccessibilityControls />
            </motion.div>
          </header>

          <main id="main-content" role="main">
            <div className="space-y-12">
              <SmartPNRFormsDemo />
              <PNRDetailDemo />
              <PNRManagementDemo />
              <DesignSystemDemo />
            </div>
          </main>
        </motion.div>
      </div>
    </>
  )
}

function App() {
  useEffect(() => {
    // Initialize monitoring service in production
    if (import.meta.env.PROD) {
      monitoring.initialize({
        sentryDsn: import.meta.env.VITE_SENTRY_DSN,
        apiEndpoint: import.meta.env.VITE_MONITORING_ENDPOINT,
        environment: import.meta.env.VITE_ENVIRONMENT,
        buildVersion: import.meta.env.VITE_BUILD_VERSION,
      })
    }
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
