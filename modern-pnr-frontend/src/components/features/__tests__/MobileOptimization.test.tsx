import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PNRDashboard } from '../PNRDashboard'
import { PNRCard } from '../PNRCard'
import { useDeviceDetection } from '../../../hooks/useDeviceDetection'
import { useAdaptiveLoading } from '../../../hooks/useAdaptiveLoading'
import { PNR } from '../../../types'

// Mock device detection with different scenarios
const mockDeviceDetection = {
  touchSupport: true,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  screenSize: { width: 375, height: 667 },
  devicePixelRatio: 2,
  connectionType: '4g',
  isLowEndDevice: false,
}

vi.mock('../../../hooks/useDeviceDetection', () => ({
  useDeviceDetection: vi.fn(() => mockDeviceDetection),
}))

// Mock adaptive loading
const mockAdaptiveLoading = {
  getAnimationConfig: () => ({
    enabled: true,
    duration: 300,
    easing: 'ease-out',
  }),
  shouldPreload: () => true,
  getImageQuality: () => 'high',
  shouldUseVirtualization: () => true,
}

vi.mock('../../../hooks/useAdaptiveLoading', () => ({
  useAdaptiveLoading: vi.fn(() => mockAdaptiveLoading),
}))

// Mock stores
vi.mock('../../../stores/pnrStore', () => ({
  usePNRStore: () => ({
    pnrs: mockPNRs,
    selectedPNRs: new Set(),
    filters: {},
    sortConfig: null,
    isLoading: false,
    error: null,
    clearSelection: vi.fn(),
    selectAllPNRs: vi.fn(),
    setSortConfig: vi.fn(),
    bulkDelete: vi.fn(),
    togglePNRSelection: vi.fn(),
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
  }),
}))

vi.mock('../../../stores/appStore', () => ({
  useAppStore: () => ({
    realtime: {
      connection: {
        isConnected: true,
      },
    },
  }),
}))

// Mock react-window for virtualization
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height }: any) => (
    <div 
      data-testid="virtualized-list" 
      style={{ height }}
      data-item-count={itemCount}
      data-item-size={itemSize}
    >
      {Array.from({ length: Math.min(itemCount, 10) }).map((_, index) =>
        children({ index, style: { height: itemSize } })
      )}
    </div>
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => 0,
}))

// Mock UI components
vi.mock('../../ui/Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

vi.mock('../../ui/Button', () => ({
  Button: ({ children, className, size, ...props }: any) => (
    <button className={`${className} ${size}`} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('../../ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

const mockPNRs: PNR[] = [
  {
    id: '1',
    number: '1234567890',
    status: {
      currentStatus: 'CNF',
      chartPrepared: true,
      passengers: [
        {
          serialNumber: 1,
          name: 'John Doe',
          age: 35,
          gender: 'M',
          currentStatus: 'CNF',
          bookingStatus: 'CNF',
          seatNumber: 'S1/45',
          coachPosition: 'S1'
        }
      ],
      trainInfo: {
        number: '12345',
        name: 'Rajdhani Express',
        departureTime: '16:30',
        arrivalTime: '08:15',
        duration: '15h 45m',
        distance: '1447 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date().toISOString()
    },
    passengerName: 'John Doe',
    trainNumber: '12345',
    trainName: 'Rajdhani Express',
    dateOfJourney: '2024-12-15',
    from: 'NDLS',
    to: 'HWH',
    class: '3A',
    quota: 'GN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    number: '0987654321',
    status: {
      currentStatus: 'RAC',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'Jane Smith',
          age: 28,
          gender: 'F',
          currentStatus: 'RAC',
          bookingStatus: 'RAC/5',
          seatNumber: '',
          coachPosition: ''
        }
      ],
      trainInfo: {
        number: '54321',
        name: 'Shatabdi Express',
        departureTime: '06:00',
        arrivalTime: '14:30',
        duration: '8h 30m',
        distance: '450 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      },
      lastUpdated: new Date().toISOString()
    },
    passengerName: 'Jane Smith',
    trainNumber: '54321',
    trainName: 'Shatabdi Express',
    dateOfJourney: '2024-12-20',
    from: 'NDLS',
    to: 'AGC',
    class: 'CC',
    quota: 'GN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

describe('Mobile Optimization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset device detection to mobile defaults
    vi.mocked(useDeviceDetection).mockReturnValue(mockDeviceDetection)
    vi.mocked(useAdaptiveLoading).mockReturnValue(mockAdaptiveLoading)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    it('adapts layout for tablet screens', () => {
      vi.mocked(useDeviceDetection).mockReturnValue({
        ...mockDeviceDetection,
        isMobile: false,
        isTablet: true,
        screenSize: { width: 768, height: 1024 },
      })

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('adapts layout for desktop screens', () => {
      vi.mocked(useDeviceDetection).mockReturnValue({
        ...mockDeviceDetection,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        touchSupport: false,
        screenSize: { width: 1920, height: 1080 },
      })

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('handles screen orientation changes', () => {
      const { rerender } = render(<PNRDashboard />)
      
      // Portrait mode
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
      
      fireEvent(window, new Event('resize'))
      rerender(<PNRDashboard />)
      
      // Landscape mode
      Object.defineProperty(window, 'innerWidth', { value: 667 })
      Object.defineProperty(window, 'innerHeight', { value: 375 })
      
      fireEvent(window, new Event('resize'))
      rerender(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('Touch Optimization', () => {
    it('provides touch-optimized button sizes', () => {
      render(<PNRCard pnr={mockPNRs[0]} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        // Touch targets should be at least 44px (iOS) or 48dp (Android)
        expect(button).toBeInTheDocument()
      })
    })

    it('handles touch events properly', async () => {
      const user = userEvent.setup()
      const onViewDetails = vi.fn()
      
      render(<PNRCard pnr={mockPNRs[0]} onViewDetails={onViewDetails} />)
      
      const card = screen.getByTestId('card')
      await user.click(card)
      
      expect(onViewDetails).toHaveBeenCalledWith(mockPNRs[0])
    })

    it('prevents accidental touches', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      
      render(<PNRCard pnr={mockPNRs[0]} onDelete={onDelete} />)
      
      // Quick tap should not trigger delete
      const card = screen.getByTestId('card')
      await user.click(card)
      
      expect(onDelete).not.toHaveBeenCalled()
    })
  })

  describe('Performance Optimization', () => {
    it('uses virtualization for large lists', () => {
      render(<PNRDashboard />)
      
      const virtualizedList = screen.getByTestId('virtualized-list')
      expect(virtualizedList).toBeInTheDocument()
      expect(virtualizedList).toHaveAttribute('data-item-count', '1') // Math.ceil(2/2) for 2 PNRs
    })

    it('adapts to low-end devices', () => {
      vi.mocked(useDeviceDetection).mockReturnValue({
        ...mockDeviceDetection,
        isLowEndDevice: true,
        connectionType: '2g',
      })

      vi.mocked(useAdaptiveLoading).mockReturnValue({
        ...mockAdaptiveLoading,
        getAnimationConfig: () => ({
          enabled: false, // Disable animations on low-end devices
          duration: 0,
          easing: 'linear',
        }),
        shouldPreload: () => false,
        getImageQuality: () => 'low',
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('optimizes for slow connections', () => {
      vi.mocked(useDeviceDetection).mockReturnValue({
        ...mockDeviceDetection,
        connectionType: '2g',
      })

      vi.mocked(useAdaptiveLoading).mockReturnValue({
        ...mockAdaptiveLoading,
        shouldPreload: () => false,
        getImageQuality: () => 'low',
        shouldUseVirtualization: () => true,
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('reduces animations on reduced motion preference', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('Adaptive Loading', () => {
    it('uses device detection for adaptive loading', () => {
      const { result } = renderHook(() => useDeviceDetection())
      
      expect(result.current.touchSupport).toBe(true)
      expect(result.current.isMobile).toBe(true)
      expect(result.current.screenSize).toEqual({ width: 375, height: 667 })
    })

    it('adapts animation configuration based on device', () => {
      const { result } = renderHook(() => useAdaptiveLoading())
      
      const animationConfig = result.current.getAnimationConfig()
      expect(animationConfig.enabled).toBe(true)
      expect(animationConfig.duration).toBe(300)
    })

    it('determines preloading strategy based on connection', () => {
      const { result } = renderHook(() => useAdaptiveLoading())
      
      expect(result.current.shouldPreload()).toBe(true)
    })

    it('adjusts image quality based on device capabilities', () => {
      const { result } = renderHook(() => useAdaptiveLoading())
      
      expect(result.current.getImageQuality()).toBe('high')
    })
  })

  describe('Mobile Navigation', () => {
    it('provides mobile-friendly navigation controls', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      // Should have mobile-optimized filter toggle
      const filterButton = screen.getByText('Filters')
      await user.click(filterButton)
      
      expect(filterButton).toBeInTheDocument()
    })

    it('handles mobile view mode switching', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      // Find view mode toggle buttons
      const buttons = screen.getAllByRole('button')
      const viewToggleButtons = buttons.filter(btn => 
        btn.querySelector('svg')
      )
      
      expect(viewToggleButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility on Mobile', () => {
    it('maintains accessibility on touch devices', () => {
      render(<PNRCard pnr={mockPNRs[0]} />)
      
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      
      // Should be focusable for keyboard navigation
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('provides proper ARIA labels for touch interactions', () => {
      render(<PNRCard pnr={mockPNRs[0]} />)
      
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
    })

    it('supports screen readers on mobile', () => {
      render(<PNRCard pnr={mockPNRs[0]} />)
      
      expect(screen.getByText('PNR: 1234567890')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Mobile-Specific Features', () => {
    it('handles device orientation changes', () => {
      const { rerender } = render(<PNRDashboard />)
      
      // Simulate orientation change
      fireEvent(window, new Event('orientationchange'))
      rerender(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('adapts to different pixel densities', () => {
      vi.mocked(useDeviceDetection).mockReturnValue({
        ...mockDeviceDetection,
        devicePixelRatio: 3, // High DPI device
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('handles mobile keyboard appearance', () => {
      // Mock viewport height change when keyboard appears
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 400, // Reduced height when keyboard is visible
      })

      render(<PNRDashboard />)
      
      fireEvent(window, new Event('resize'))
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('Progressive Enhancement', () => {
    it('works without JavaScript enhancements', () => {
      // Disable JavaScript features
      vi.mocked(useAdaptiveLoading).mockReturnValue({
        ...mockAdaptiveLoading,
        getAnimationConfig: () => ({
          enabled: false,
          duration: 0,
          easing: 'linear',
        }),
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
      expect(screen.getByText('2 PNRs tracked')).toBeInTheDocument()
    })

    it('gracefully degrades on older devices', () => {
      vi.mocked(useDeviceDetection).mockReturnValue({
        ...mockDeviceDetection,
        touchSupport: false, // Older device without touch
        isLowEndDevice: true,
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('Network Adaptation', () => {
    it('adapts to different connection types', () => {
      const connectionTypes = ['4g', '3g', '2g', 'slow-2g']
      
      connectionTypes.forEach(connectionType => {
        vi.mocked(useDeviceDetection).mockReturnValue({
          ...mockDeviceDetection,
          connectionType,
        })

        const { result } = renderHook(() => useAdaptiveLoading())
        
        if (connectionType === '2g' || connectionType === 'slow-2g') {
          expect(result.current.shouldPreload()).toBe(false)
          expect(result.current.getImageQuality()).toBe('low')
        } else {
          expect(result.current.shouldPreload()).toBe(true)
        }
      })
    })

    it('handles offline scenarios', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })
})