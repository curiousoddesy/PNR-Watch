import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Preload critical routes and components
const preloadRoutes = {
  '/': () => import('../features/Dashboard'),
  '/dashboard': () => import('../features/Dashboard'),
  '/add-pnr': () => import('../features/AddPNR'),
  '/pnr': () => import('../features/PNRDetails'),
}

// Preload optional features based on user behavior
const optionalFeatures = {
  voice: () => import('../features/VoiceInterface'),
  search: () => import('../features/AdvancedSearch'),
  analytics: () => import('../features/Analytics'),
  notifications: () => import('../features/NotificationCenter'),
}

export function RoutePreloader() {
  const location = useLocation()

  useEffect(() => {
    // Preload critical routes on app start
    const preloadCriticalRoutes = async () => {
      try {
        // Preload dashboard immediately
        await preloadRoutes['/']()
        
        // Preload add PNR form after a short delay
        setTimeout(() => {
          preloadRoutes['/add-pnr']()
        }, 1000)
        
        // Preload PNR details after another delay
        setTimeout(() => {
          preloadRoutes['/pnr']()
        }, 2000)
      } catch (error) {
        console.warn('Failed to preload critical routes:', error)
      }
    }

    preloadCriticalRoutes()
  }, [])

  useEffect(() => {
    // Preload related routes based on current location
    const preloadRelatedRoutes = async () => {
      try {
        switch (location.pathname) {
          case '/':
          case '/dashboard':
            // From dashboard, user likely to add PNR or view details
            setTimeout(() => preloadRoutes['/add-pnr'](), 500)
            break
            
          case '/add-pnr':
            // After adding PNR, user likely to view dashboard
            setTimeout(() => preloadRoutes['/dashboard'](), 500)
            break
            
          default:
            break
        }
      } catch (error) {
        console.warn('Failed to preload related routes:', error)
      }
    }

    preloadRelatedRoutes()
  }, [location.pathname])

  return null
}

// Hook for dynamic feature loading
export function useFeatureLoader() {
  const loadFeature = async (featureName: keyof typeof optionalFeatures) => {
    try {
      const feature = await optionalFeatures[featureName]()
      return feature
    } catch (error) {
      console.error(`Failed to load feature: ${featureName}`, error)
      throw error
    }
  }

  const preloadFeature = (featureName: keyof typeof optionalFeatures) => {
    // Preload without waiting for result
    optionalFeatures[featureName]().catch(error => {
      console.warn(`Failed to preload feature: ${featureName}`, error)
    })
  }

  return { loadFeature, preloadFeature }
}