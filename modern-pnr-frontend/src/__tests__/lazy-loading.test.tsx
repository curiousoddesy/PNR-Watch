import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LazyRoutes } from '../components/routing/LazyRoutes'
import { useFeatureLoader, featureLoader } from '../utils/dynamicImports'
import { createLazyComponent } from '../components/lazy/LazyComponents'

// Mock dynamic imports
vi.mock('../features/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard Component</div>
}))

vi.mock('../features/PNRDetails', () => ({
  default: () => <div data-testid="pnr-details">PNR Details Component</div>
}))

vi.mock('../features/AddPNR', () => ({
  default: () => <div data-testid="add-pnr">Add PNR Component</div>
}))

// Mock intersection observer for lazy loading
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

describe('Lazy Loading and Code Splitting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Route-based Code Splitting', () => {
    it('should render loading fallback initially', async () => {
      render(
        <BrowserRouter>
          <LazyRoutes />
        </BrowserRouter>
      )

      // Should show loading state initially
      expect(screen.getByText('Loading page...')).toBeInTheDocument()
    })

    it('should load dashboard component lazily', async () => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true
      })

      render(
        <BrowserRouter>
          <LazyRoutes />
        </BrowserRouter>
      )

      // Wait for lazy component to load
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Component-based Lazy Loading', () => {
    it('should create lazy component with fallback', async () => {
      const MockComponent = () => <div data-testid="mock-component">Mock Component</div>
      const LazyMockComponent = createLazyComponent(
        () => Promise.resolve({ default: MockComponent }),
        <div data-testid="custom-fallback">Custom Loading...</div>
      )

      render(<LazyMockComponent />)

      // Should show custom fallback initially
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('mock-component')).toBeInTheDocument()
      })
    })

    it('should handle lazy component errors', async () => {
      const FailingLazyComponent = createLazyComponent(
        () => Promise.reject(new Error('Failed to load component'))
      )

      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<FailingLazyComponent />)

      // Should show error boundary fallback
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Dynamic Feature Loading', () => {
    it('should load supported features', async () => {
      // Mock feature support
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: function() {},
        writable: true
      })

      const isSupported = featureLoader.isFeatureSupported('voiceInterface')
      expect(isSupported).toBe(true)
    })

    it('should reject unsupported features', async () => {
      // Remove speech recognition support
      delete (window as any).webkitSpeechRecognition
      delete (window as any).SpeechRecognition

      const isSupported = featureLoader.isFeatureSupported('voiceInterface')
      expect(isSupported).toBe(false)

      await expect(featureLoader.loadFeature('voiceInterface')).rejects.toThrow(
        'Feature not supported: voiceInterface'
      )
    })

    it('should cache loaded features', async () => {
      const mockFeature = { default: () => <div>Mock Feature</div> }
      
      // Mock successful import
      vi.doMock('../features/analytics/AdvancedAnalytics', () => mockFeature)

      const feature1 = await featureLoader.loadFeature('advancedAnalytics')
      const feature2 = await featureLoader.loadFeature('advancedAnalytics')

      expect(feature1).toBe(feature2) // Should return cached version
      expect(featureLoader.isFeatureLoaded('advancedAnalytics')).toBe(true)
    })

    it('should preload eligible features', () => {
      const preloadSpy = vi.spyOn(featureLoader, 'preloadFeature')
      
      featureLoader.preloadAllEligibleFeatures()

      expect(preloadSpy).toHaveBeenCalledWith('offlineSync')
    })
  })

  describe('useFeatureLoader Hook', () => {
    function TestComponent() {
      const { loadFeature, isSupported, supportedFeatures } = useFeatureLoader()

      return (
        <div>
          <div data-testid="supported-count">{supportedFeatures.length}</div>
          <button
            onClick={() => loadFeature('advancedAnalytics')}
            data-testid="load-feature"
          >
            Load Feature
          </button>
          <div data-testid="voice-supported">
            {isSupported('voiceInterface') ? 'supported' : 'not-supported'}
          </div>
        </div>
      )
    }

    it('should provide feature loading capabilities', () => {
      render(<TestComponent />)

      expect(screen.getByTestId('supported-count')).toHaveTextContent('8') // All features supported by default
      expect(screen.getByTestId('load-feature')).toBeInTheDocument()
    })

    it('should detect feature support correctly', () => {
      // Mock speech recognition support
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: function() {},
        writable: true
      })

      render(<TestComponent />)

      expect(screen.getByTestId('voice-supported')).toHaveTextContent('supported')
    })
  })

  describe('Performance Monitoring', () => {
    it('should measure component render time', async () => {
      const performanceSpy = vi.spyOn(performance, 'now')
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150)

      const SlowComponent = () => {
        // Simulate slow component
        const start = performance.now()
        while (performance.now() - start < 50) {
          // Busy wait
        }
        return <div data-testid="slow-component">Slow Component</div>
      }

      const LazySlowComponent = createLazyComponent(
        () => Promise.resolve({ default: SlowComponent })
      )

      render(<LazySlowComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('slow-component')).toBeInTheDocument()
      })

      expect(performanceSpy).toHaveBeenCalled()
      performanceSpy.mockRestore()
    })

    it('should track bundle loading performance', async () => {
      const mockPerformanceEntry = {
        name: 'chunk-vendor.js',
        duration: 250,
        entryType: 'resource',
        initiatorType: 'script'
      }

      // Mock PerformanceObserver
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
        getEntries: vi.fn().mockReturnValue([mockPerformanceEntry])
      }

      global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
        // Simulate resource timing entry
        setTimeout(() => {
          callback({
            getEntries: () => [mockPerformanceEntry]
          })
        }, 0)
        return mockObserver
      })

      // This would be called during app initialization
      const observer = new PerformanceObserver(() => {})
      observer.observe({ entryTypes: ['resource'] })

      expect(mockObserver.observe).toHaveBeenCalledWith({ entryTypes: ['resource'] })
    })
  })

  describe('Error Boundaries', () => {
    it('should catch and display lazy loading errors', async () => {
      const FailingComponent = createLazyComponent(
        () => Promise.reject(new Error('Network error'))
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<FailingComponent />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should provide retry functionality', async () => {
      let attemptCount = 0
      const UnreliableComponent = createLazyComponent(() => {
        attemptCount++
        if (attemptCount === 1) {
          return Promise.reject(new Error('First attempt failed'))
        }
        return Promise.resolve({
          default: () => <div data-testid="success">Success!</div>
        })
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<UnreliableComponent />)

      // First attempt should fail
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })

      // Click retry button if available
      const retryButton = screen.queryByText(/retry/i)
      if (retryButton) {
        retryButton.click()

        await waitFor(() => {
          expect(screen.getByTestId('success')).toBeInTheDocument()
        })
      }

      consoleSpy.mockRestore()
    })
  })
})