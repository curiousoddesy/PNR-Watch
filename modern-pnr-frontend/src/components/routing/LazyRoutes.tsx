import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBoundary } from '../ui/ErrorBoundary'

// Lazy load main route components
const Dashboard = lazy(() => import('../features/Dashboard'))
const PNRDetails = lazy(() => import('../features/PNRDetails'))
const AddPNR = lazy(() => import('../features/AddPNR'))
const Settings = lazy(() => import('../features/Settings'))
const Analytics = lazy(() => import('../features/Analytics'))

// Lazy load optional features
const VoiceInterface = lazy(() => import('../features/VoiceInterface'))
const AdvancedSearch = lazy(() => import('../features/AdvancedSearch'))
const NotificationCenter = lazy(() => import('../features/NotificationCenter'))

// Route-based code splitting with Suspense boundaries
export function LazyRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route 
            path="/pnr/:pnrNumber" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <PNRDetails />
              </Suspense>
            } 
          />
          
          <Route 
            path="/add-pnr" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AddPNR />
              </Suspense>
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Settings />
              </Suspense>
            } 
          />
          
          {/* Optional features with dynamic imports */}
          <Route 
            path="/analytics" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <Analytics />
              </Suspense>
            } 
          />
          
          <Route 
            path="/voice" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <VoiceInterface />
              </Suspense>
            } 
          />
          
          <Route 
            path="/search" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdvancedSearch />
              </Suspense>
            } 
          />
          
          <Route 
            path="/notifications" 
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <NotificationCenter />
              </Suspense>
            } 
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

// Loading fallback component for route transitions
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-text-secondary">Loading page...</p>
      </div>
    </div>
  )
}