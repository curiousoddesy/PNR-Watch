// Dynamic import utilities for optional features
export interface FeatureModule {
  default: React.ComponentType<any>
  [key: string]: any
}

export interface FeatureConfig {
  name: string
  path: string
  preload?: boolean
  condition?: () => boolean
}

// Feature registry for dynamic loading
export const FEATURES: Record<string, FeatureConfig> = {
  voiceInterface: {
    name: 'Voice Interface',
    path: '../features/voice/VoiceInterface',
    preload: false,
    condition: () => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  },
  qrScanner: {
    name: 'QR Scanner',
    path: '../features/qr/QRScanner',
    preload: false,
    condition: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  },
  advancedAnalytics: {
    name: 'Advanced Analytics',
    path: '../features/analytics/AdvancedAnalytics',
    preload: false,
    condition: () => true
  },
  geolocation: {
    name: 'Geolocation Features',
    path: '../features/location/GeolocationFeatures',
    preload: false,
    condition: () => 'geolocation' in navigator
  },
  pushNotifications: {
    name: 'Push Notifications',
    path: '../features/notifications/PushNotifications',
    preload: false,
    condition: () => 'Notification' in window && 'serviceWorker' in navigator
  },
  offlineSync: {
    name: 'Offline Sync',
    path: '../features/offline/OfflineSync',
    preload: true,
    condition: () => 'serviceWorker' in navigator
  },
  advancedSearch: {
    name: 'Advanced Search',
    path: '../features/search/AdvancedSearch',
    preload: false,
    condition: () => true
  },
  dataVisualization: {
    name: 'Data Visualization',
    path: '../features/charts/DataVisualization',
    preload: false,
    condition: () => true
  }
}

// Dynamic feature loader
export class FeatureLoader {
  private loadedFeatures = new Map<string, FeatureModule>()
  private loadingPromises = new Map<string, Promise<FeatureModule>>()

  async loadFeature(featureName: string): Promise<FeatureModule> {
    // Return cached feature if already loaded
    if (this.loadedFeatures.has(featureName)) {
      return this.loadedFeatures.get(featureName)!
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(featureName)) {
      return this.loadingPromises.get(featureName)!
    }

    const feature = FEATURES[featureName]
    if (!feature) {
      throw new Error(`Feature not found: ${featureName}`)
    }

    // Check if feature is supported
    if (feature.condition && !feature.condition()) {
      throw new Error(`Feature not supported: ${featureName}`)
    }

    // Start loading
    const loadingPromise = this.importFeature(feature.path)
    this.loadingPromises.set(featureName, loadingPromise)

    try {
      const module = await loadingPromise
      this.loadedFeatures.set(featureName, module)
      this.loadingPromises.delete(featureName)
      return module
    } catch (error) {
      this.loadingPromises.delete(featureName)
      throw error
    }
  }

  private async importFeature(path: string): Promise<FeatureModule> {
    try {
      // Dynamic import with error handling
      const module = await import(/* @vite-ignore */ path)
      return module
    } catch (error) {
      console.error(`Failed to import feature from ${path}:`, error)
      throw new Error(`Failed to load feature: ${error}`)
    }
  }

  preloadFeature(featureName: string): void {
    const feature = FEATURES[featureName]
    if (!feature || !feature.preload) return

    // Preload without waiting for result
    this.loadFeature(featureName).catch(error => {
      console.warn(`Failed to preload feature ${featureName}:`, error)
    })
  }

  preloadAllEligibleFeatures(): void {
    Object.keys(FEATURES).forEach(featureName => {
      const feature = FEATURES[featureName]
      if (feature.preload && (!feature.condition || feature.condition())) {
        this.preloadFeature(featureName)
      }
    })
  }

  isFeatureLoaded(featureName: string): boolean {
    return this.loadedFeatures.has(featureName)
  }

  isFeatureSupported(featureName: string): boolean {
    const feature = FEATURES[featureName]
    return feature ? (!feature.condition || feature.condition()) : false
  }

  getLoadedFeatures(): string[] {
    return Array.from(this.loadedFeatures.keys())
  }

  getSupportedFeatures(): string[] {
    return Object.keys(FEATURES).filter(name => this.isFeatureSupported(name))
  }
}

// Global feature loader instance
export const featureLoader = new FeatureLoader()

// React hook for feature loading
export function useFeatureLoader() {
  const loadFeature = async (featureName: string) => {
    try {
      return await featureLoader.loadFeature(featureName)
    } catch (error) {
      console.error(`Failed to load feature ${featureName}:`, error)
      throw error
    }
  }

  const preloadFeature = (featureName: string) => {
    featureLoader.preloadFeature(featureName)
  }

  const isSupported = (featureName: string) => {
    return featureLoader.isFeatureSupported(featureName)
  }

  const isLoaded = (featureName: string) => {
    return featureLoader.isFeatureLoaded(featureName)
  }

  return {
    loadFeature,
    preloadFeature,
    isSupported,
    isLoaded,
    supportedFeatures: featureLoader.getSupportedFeatures(),
    loadedFeatures: featureLoader.getLoadedFeatures()
  }
}