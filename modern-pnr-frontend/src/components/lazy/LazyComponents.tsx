import { lazy, Suspense, ComponentType } from 'react'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBoundary } from '../ui/ErrorBoundary'

// Component-based lazy loading with error boundaries
export function createLazyComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn)
  
  return function LazyWrapper(props: T) {
    return (
      <ErrorBoundary>
        <Suspense fallback={fallback || <ComponentLoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
}

// Lazy load large feature components
export const LazyPNRDashboard = createLazyComponent(
  () => import('../features/pnr/PNRDashboard'),
  <div className="animate-pulse bg-surface rounded-lg h-96" />
)

export const LazyPNRTimeline = createLazyComponent(
  () => import('../features/pnr/PNRTimeline'),
  <div className="animate-pulse bg-surface rounded-lg h-64" />
)

export const LazyDataTable = createLazyComponent(
  () => import('../ui/DataTable'),
  <div className="animate-pulse bg-surface rounded-lg h-80" />
)

export const LazyChart = createLazyComponent(
  () => import('../ui/Chart'),
  <div className="animate-pulse bg-surface rounded-lg h-64" />
)

export const LazyMap = createLazyComponent(
  () => import('../features/map/InteractiveMap'),
  <div className="animate-pulse bg-surface rounded-lg h-96" />
)

// Lazy load animation-heavy components
export const LazyAnimatedBackground = createLazyComponent(
  () => import('../animations/AnimatedBackground'),
  <div className="bg-gradient-to-br from-primary/5 to-secondary/5" />
)

export const LazyParallaxSection = createLazyComponent(
  () => import('../animations/ParallaxSection'),
  <div className="bg-surface rounded-lg h-64" />
)

// Lazy load optional UI components
export const LazyQRScanner = createLazyComponent(
  () => import('../features/qr/QRScanner'),
  <div className="animate-pulse bg-surface rounded-lg h-64 flex items-center justify-center">
    <span className="text-text-secondary">Loading QR Scanner...</span>
  </div>
)

export const LazyVoiceRecorder = createLazyComponent(
  () => import('../features/voice/VoiceRecorder'),
  <div className="animate-pulse bg-surface rounded-lg h-32" />
)

export const LazyNotificationPanel = createLazyComponent(
  () => import('../features/notifications/NotificationPanel'),
  <div className="animate-pulse bg-surface rounded-lg h-48" />
)

// Default loading fallback
function ComponentLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="mt-2 text-sm text-text-secondary">Loading component...</p>
      </div>
    </div>
  )
}

// Hook for conditional component loading
export function useConditionalComponent() {
  const loadComponent = async (componentName: string) => {
    try {
      switch (componentName) {
        case 'qr-scanner':
          return (await import('../features/qr/QRScanner')).default
        case 'voice-recorder':
          return (await import('../features/voice/VoiceRecorder')).default
        case 'advanced-chart':
          return (await import('../ui/AdvancedChart')).default
        case 'map':
          return (await import('../features/map/InteractiveMap')).default
        default:
          throw new Error(`Unknown component: ${componentName}`)
      }
    } catch (error) {
      console.error(`Failed to load component: ${componentName}`, error)
      throw error
    }
  }

  return { loadComponent }
}