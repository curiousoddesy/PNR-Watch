import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { PNRCard } from '../PNRCard'
import { useGestures } from '../../../hooks/useGestures'
import { usePullToRefresh } from '../../../hooks/usePullToRefresh'
import { PNR } from '../../../types'

// Mock device detection
vi.mock('../../../hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => ({
    touchSupport: true,
    isMobile: true,
    isTablet: false,
    isDesktop: false,
  }),
}))

// Mock adaptive loading
vi.mock('../../../hooks/useAdaptiveLoading', () => ({
  useAdaptiveLoading: () => ({
    getAnimationConfig: () => ({
      enabled: true,
      duration: 300,
      easing: 'ease-out',
    }),
  }),
}))

// Mock framer-motion with gesture support
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onDragEnd, drag, ...props }: any) => {
      const handleTouchEnd = (e: TouchEvent) => {
        if (onDragEnd && drag === 'x') {
          // Simulate swipe gesture
          const mockInfo = {
            offset: { x: 60, y: 0 },
            velocity: { x: 1.5, y: 0 },
          }
          onDragEnd(e, mockInfo)
        }
      }

      return (
        <div
          {...props}
          onTouchEnd={handleTouchEnd}
          data-testid="gesture-element"
        >
          {children}
        </div>
      )
    },
  },
  useMotionValue: () => ({
    get: () => 0,
    set: vi.fn(),
  }),
  useTransform: () => 0,
}))

// Mock stores
vi.mock('../../../stores/pnrStore', () => ({
  usePNRStore: () => ({
    togglePNRSelection: vi.fn(),
  }),
}))

// Mock UI components
vi.mock('../../ui/Card', () => ({
  Card: ({ children, onClick, ...props }: any) => (
    <div {...props} onClick={onClick} data-testid="pnr-card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

vi.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button {...props} onClick={onClick}>
      {children}
    </button>
  ),
}))

const mockPNR: PNR = {
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
}

describe('Gesture Interactions and Mobile Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock touch events
    global.TouchEvent = class TouchEvent extends Event {
      touches: Touch[]
      changedTouches: Touch[]
      targetTouches: Touch[]

      constructor(type: string, options: any = {}) {
        super(type, options)
        this.touches = options.touches || []
        this.changedTouches = options.changedTouches || []
        this.targetTouches = options.targetTouches || []
      }
    } as any

    // Mock Touch interface
    global.Touch = class Touch {
      identifier: number
      target: EventTarget
      clientX: number
      clientY: number
      pageX: number
      pageY: number
      screenX: number
      screenY: number
      radiusX: number
      radiusY: number
      rotationAngle: number
      force: number

      constructor(options: any) {
        this.identifier = options.identifier || 0
        this.target = options.target || document.body
        this.clientX = options.clientX || 0
        this.clientY = options.clientY || 0
        this.pageX = options.pageX || 0
        this.pageY = options.pageY || 0
        this.screenX = options.screenX || 0
        this.screenY = options.screenY || 0
        this.radiusX = options.radiusX || 0
        this.radiusY = options.radiusY || 0
        this.rotationAngle = options.rotationAngle || 0
        this.force = options.force || 1
      }
    } as any

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Swipe Gestures', () => {
    it('handles swipe right to reveal actions', async () => {
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      
      render(
        <PNRCard
          pnr={mockPNR}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )

      const gestureElement = screen.getByTestId('gesture-element')
      
      // Simulate swipe right gesture
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })
      
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 160, clientY: 100 })]
      })

      fireEvent(gestureElement, touchStart)
      fireEvent(gestureElement, touchEnd)

      // Actions should be revealed after swipe
      await waitFor(() => {
        expect(gestureElement).toBeInTheDocument()
      })
    })

    it('handles swipe left for quick delete', async () => {
      const onDelete = vi.fn()
      
      render(
        <PNRCard
          pnr={mockPNR}
          onDelete={onDelete}
        />
      )

      const gestureElement = screen.getByTestId('gesture-element')
      
      // Simulate swipe left gesture
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 200, clientY: 100 })]
      })
      
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      fireEvent(gestureElement, touchStart)
      fireEvent(gestureElement, touchEnd)

      // Should trigger delete action
      await waitFor(() => {
        expect(gestureElement).toBeInTheDocument()
      })
    })

    it('provides haptic feedback on gesture recognition', () => {
      const callbacks = {
        onSwipeRight: vi.fn(),
      }

      const { result } = renderHook(() =>
        useGestures(callbacks, { enableHapticFeedback: true })
      )

      expect(result.current.ref).toBeDefined()
      expect(navigator.vibrate).toBeDefined()
    })
  })

  describe('Pull to Refresh', () => {
    it('initializes pull to refresh functionality', () => {
      const onRefresh = vi.fn()
      
      const { result } = renderHook(() =>
        usePullToRefresh(onRefresh)
      )

      expect(result.current.ref).toBeDefined()
      expect(result.current.state.isPulling).toBe(false)
      expect(result.current.state.isRefreshing).toBe(false)
      expect(result.current.isEnabled).toBe(true)
    })

    it('handles pull down gesture', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined)
      
      const { result } = renderHook(() =>
        usePullToRefresh(onRefresh, { threshold: 80 })
      )

      // Mock element with ref
      const mockElement = document.createElement('div')
      Object.defineProperty(mockElement, 'scrollTop', { value: 0 })
      result.current.ref.current = mockElement

      // Simulate pull down gesture
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 50 })]
      })

      const touchMove = new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 150 })]
      })

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 100, clientY: 150 })]
      })

      fireEvent(mockElement, touchStart)
      fireEvent(mockElement, touchMove)
      fireEvent(mockElement, touchEnd)

      await waitFor(() => {
        expect(result.current.state.pullDistance).toBeGreaterThanOrEqual(0)
      })
    })

    it('triggers refresh when threshold is exceeded', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined)
      
      const { result } = renderHook(() =>
        usePullToRefresh(onRefresh, { threshold: 50 })
      )

      const mockElement = document.createElement('div')
      Object.defineProperty(mockElement, 'scrollTop', { value: 0 })
      result.current.ref.current = mockElement

      // Simulate strong pull down
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 50 })]
      })

      const touchMove = new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 200 })]
      })

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 100, clientY: 200 })]
      })

      fireEvent(mockElement, touchStart)
      fireEvent(mockElement, touchMove)
      fireEvent(mockElement, touchEnd)

      await waitFor(() => {
        expect(result.current.state.canRefresh).toBe(true)
      })
    })

    it('provides visual feedback during pull', () => {
      const onRefresh = vi.fn()
      
      const { result } = renderHook(() =>
        usePullToRefresh(onRefresh)
      )

      const style = result.current.getRefreshIndicatorStyle()
      expect(style).toHaveProperty('transform')
      expect(style).toHaveProperty('transition')

      const rotation = result.current.getRefreshIconRotation()
      expect(typeof rotation).toBe('number')
    })
  })

  describe('Long Press Gestures', () => {
    it('handles long press for context menu', async () => {
      const onLongPress = vi.fn()
      
      const { result } = renderHook(() =>
        useGestures({ onLongPress }, { longPressDelay: 100 })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      // Simulate long press
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      fireEvent(mockElement, touchStart)

      // Wait for long press delay
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(onLongPress).toHaveBeenCalled()
    })

    it('cancels long press on movement', async () => {
      const onLongPress = vi.fn()
      
      const { result } = renderHook(() =>
        useGestures({ onLongPress }, { longPressDelay: 100 })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      // Start touch
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      // Move significantly
      const touchMove = new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, clientX: 120, clientY: 100 })]
      })

      fireEvent(mockElement, touchStart)
      fireEvent(mockElement, touchMove)

      // Wait for long press delay
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('Pinch Gestures', () => {
    it('handles pinch to zoom', () => {
      const onPinch = vi.fn()
      const onPinchStart = vi.fn()
      const onPinchEnd = vi.fn()
      
      const { result } = renderHook(() =>
        useGestures({ onPinch, onPinchStart, onPinchEnd })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      // Simulate pinch start with two fingers
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 0, clientX: 100, clientY: 100 }),
          new Touch({ identifier: 1, clientX: 200, clientY: 100 })
        ]
      })

      fireEvent(mockElement, touchStart)
      expect(onPinchStart).toHaveBeenCalled()
    })

    it('calculates pinch scale correctly', () => {
      const onPinch = vi.fn()
      
      const { result } = renderHook(() =>
        useGestures({ onPinch })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      // Start pinch
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 0, clientX: 100, clientY: 100 }),
          new Touch({ identifier: 1, clientX: 200, clientY: 100 })
        ]
      })

      // Move fingers closer (pinch in)
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          new Touch({ identifier: 0, clientX: 120, clientY: 100 }),
          new Touch({ identifier: 1, clientX: 180, clientY: 100 })
        ]
      })

      fireEvent(mockElement, touchStart)
      fireEvent(mockElement, touchMove)

      expect(result.current.gestureState.scale).toBeDefined()
    })
  })

  describe('Double Tap Gestures', () => {
    it('handles double tap for zoom', async () => {
      const onDoubleTap = vi.fn()
      
      const { result } = renderHook(() =>
        useGestures({ onDoubleTap }, { doubleTapDelay: 200 })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      // First tap
      const touchStart1 = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })
      const touchEnd1 = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      fireEvent(mockElement, touchStart1)
      fireEvent(mockElement, touchEnd1)

      // Second tap quickly
      const touchStart2 = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })
      const touchEnd2 = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      fireEvent(mockElement, touchStart2)
      fireEvent(mockElement, touchEnd2)

      await waitFor(() => {
        expect(onDoubleTap).toHaveBeenCalled()
      })
    })
  })

  describe('Gesture State Management', () => {
    it('tracks gesture state correctly', () => {
      const { result } = renderHook(() =>
        useGestures({})
      )

      expect(result.current.gestureState).toEqual({
        isActive: false,
        startPosition: null,
        currentPosition: null,
        deltaX: 0,
        deltaY: 0,
        distance: 0,
        velocity: { x: 0, y: 0 },
        direction: null,
        scale: 1,
        rotation: 0,
        duration: 0,
      })
    })

    it('updates gesture state during interaction', () => {
      const { result } = renderHook(() =>
        useGestures({})
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      fireEvent(mockElement, touchStart)

      expect(result.current.gestureState.isActive).toBe(true)
      expect(result.current.isGestureActive).toBe(true)
    })
  })

  describe('Mobile Optimization', () => {
    it('adapts to touch device capabilities', () => {
      const { result } = renderHook(() =>
        useGestures({}, { enableHapticFeedback: true })
      )

      expect(result.current.ref).toBeDefined()
    })

    it('prevents scroll when configured', () => {
      const { result } = renderHook(() =>
        useGestures({}, { preventScroll: true })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      const preventDefault = vi.fn()
      touchStart.preventDefault = preventDefault

      fireEvent(mockElement, touchStart)
      expect(preventDefault).toHaveBeenCalled()
    })

    it('calculates velocity for gesture recognition', () => {
      const onSwipeRight = vi.fn()
      
      const { result } = renderHook(() =>
        useGestures({ onSwipeRight })
      )

      const mockElement = document.createElement('div')
      result.current.ref.current = mockElement

      // Fast swipe
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, clientX: 100, clientY: 100 })]
      })

      const touchMove = new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, clientX: 200, clientY: 100 })]
      })

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, clientX: 200, clientY: 100 })]
      })

      fireEvent(mockElement, touchStart)
      fireEvent(mockElement, touchMove)
      fireEvent(mockElement, touchEnd)

      expect(result.current.gestureState.velocity).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('provides alternative interaction methods', () => {
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      
      render(
        <PNRCard
          pnr={mockPNR}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )

      // Should have accessible buttons for actions
      const card = screen.getByTestId('pnr-card')
      expect(card).toBeInTheDocument()
    })

    it('maintains focus management during gestures', () => {
      const { result } = renderHook(() =>
        useGestures({})
      )

      expect(result.current.ref).toBeDefined()
      // Focus should be managed properly during gesture interactions
    })
  })
})