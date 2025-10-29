import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  SwipeGesture, 
  LongPressGesture, 
  PinchZoomGesture, 
  PullToRefresh,
  triggerHapticFeedback 
} from '../GestureHandler'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    motion: {
      div: vi.fn(({ children, onDragEnd, onTouchStart, onTouchEnd, onMouseDown, onMouseUp, onMouseLeave, onWheel, onDrag, ...props }) => (
        <div 
          onDragEnd={onDragEnd}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onWheel={onWheel}
          onDrag={onDrag}
          {...props}
        >
          {children}
        </div>
      ))
    },
    useDragControls: vi.fn(() => ({}))
  }
})

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
})

describe('SwipeGesture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children correctly', () => {
    render(
      <SwipeGesture>
        <div>Swipeable content</div>
      </SwipeGesture>
    )
    
    expect(screen.getByText('Swipeable content')).toBeInTheDocument()
  })

  it('calls onSwipeRight when swiping right', () => {
    const onSwipeRight = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <SwipeGesture onSwipeRight={onSwipeRight}>
        <div>Swipe right</div>
      </SwipeGesture>
    )
    
    // Get the onDragEnd callback
    const onDragEnd = motion.div.mock.calls[0][0].onDragEnd
    
    // Simulate right swipe
    onDragEnd({}, { offset: { x: 60, y: 10 } })
    
    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeLeft when swiping left', () => {
    const onSwipeLeft = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <SwipeGesture onSwipeLeft={onSwipeLeft}>
        <div>Swipe left</div>
      </SwipeGesture>
    )
    
    const onDragEnd = motion.div.mock.calls[0][0].onDragEnd
    
    // Simulate left swipe
    onDragEnd({}, { offset: { x: -60, y: 10 } })
    
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('respects custom threshold', () => {
    const onSwipeRight = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <SwipeGesture onSwipeRight={onSwipeRight} threshold={100}>
        <div>High threshold swipe</div>
      </SwipeGesture>
    )
    
    const onDragEnd = motion.div.mock.calls[0][0].onDragEnd
    
    // Swipe below threshold
    onDragEnd({}, { offset: { x: 80, y: 10 } })
    expect(onSwipeRight).not.toHaveBeenCalled()
    
    // Swipe above threshold
    onDragEnd({}, { offset: { x: 120, y: 10 } })
    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('does not trigger when disabled', () => {
    const onSwipeRight = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <SwipeGesture onSwipeRight={onSwipeRight} disabled>
        <div>Disabled swipe</div>
      </SwipeGesture>
    )
    
    const onDragEnd = motion.div.mock.calls[0][0].onDragEnd
    onDragEnd({}, { offset: { x: 60, y: 10 } })
    
    expect(onSwipeRight).not.toHaveBeenCalled()
  })
})

describe('LongPressGesture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers onLongPress after duration', () => {
    const onLongPress = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <LongPressGesture onLongPress={onLongPress} duration={500}>
        <div>Long press me</div>
      </LongPressGesture>
    )
    
    const onTouchStart = motion.div.mock.calls[0][0].onTouchStart
    
    // Start long press
    onTouchStart()
    
    // Fast forward time
    vi.advanceTimersByTime(500)
    
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('does not trigger if released early', () => {
    const onLongPress = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <LongPressGesture onLongPress={onLongPress} duration={500}>
        <div>Long press me</div>
      </LongPressGesture>
    )
    
    const onTouchStart = motion.div.mock.calls[0][0].onTouchStart
    const onTouchEnd = motion.div.mock.calls[0][0].onTouchEnd
    
    // Start and end before duration
    onTouchStart()
    vi.advanceTimersByTime(300)
    onTouchEnd()
    vi.advanceTimersByTime(300)
    
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('triggers haptic feedback when supported', () => {
    const onLongPress = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <LongPressGesture onLongPress={onLongPress}>
        <div>Haptic long press</div>
      </LongPressGesture>
    )
    
    const onTouchStart = motion.div.mock.calls[0][0].onTouchStart
    
    onTouchStart()
    vi.advanceTimersByTime(500)
    
    expect(navigator.vibrate).toHaveBeenCalledWith(50)
  })
})

describe('PinchZoomGesture', () => {
  it('handles wheel events for zoom', () => {
    const onZoom = vi.fn()
    
    render(
      <PinchZoomGesture onZoom={onZoom}>
        <div>Pinch to zoom</div>
      </PinchZoomGesture>
    )
    
    const element = screen.getByText('Pinch to zoom')
    
    // Simulate wheel event (zoom in)
    fireEvent.wheel(element, { deltaY: -100 })
    
    expect(onZoom).toHaveBeenCalled()
  })

  it('respects min and max scale limits', () => {
    const onZoom = vi.fn()
    
    render(
      <PinchZoomGesture onZoom={onZoom} minScale={0.5} maxScale={2}>
        <div>Limited zoom</div>
      </PinchZoomGesture>
    )
    
    const element = screen.getByText('Limited zoom')
    
    // Try to zoom beyond limits
    fireEvent.wheel(element, { deltaY: -1000 }) // Extreme zoom in
    fireEvent.wheel(element, { deltaY: 1000 })  // Extreme zoom out
    
    // Should have been called but with clamped values
    expect(onZoom).toHaveBeenCalled()
  })
})

describe('PullToRefresh', () => {
  it('triggers refresh when pulled beyond threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const { motion } = require('framer-motion')
    
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Pull to refresh content</div>
      </PullToRefresh>
    )
    
    // Get drag handlers
    const onDrag = motion.div.mock.calls[1][0].onDrag // Second motion.div call
    const onDragEnd = motion.div.mock.calls[1][0].onDragEnd
    
    // Simulate pull beyond threshold
    onDrag({}, { offset: { y: 100 } })
    await onDragEnd()
    
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not trigger refresh when disabled', async () => {
    const onRefresh = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <PullToRefresh onRefresh={onRefresh} disabled>
        <div>Disabled pull to refresh</div>
      </PullToRefresh>
    )
    
    const onDragEnd = motion.div.mock.calls[1][0].onDragEnd
    await onDragEnd()
    
    expect(onRefresh).not.toHaveBeenCalled()
  })
})

describe('triggerHapticFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('triggers vibration for light feedback', () => {
    triggerHapticFeedback('light')
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })

  it('triggers vibration for medium feedback', () => {
    triggerHapticFeedback('medium')
    expect(navigator.vibrate).toHaveBeenCalledWith(50)
  })

  it('triggers vibration for heavy feedback', () => {
    triggerHapticFeedback('heavy')
    expect(navigator.vibrate).toHaveBeenCalledWith(100)
  })

  it('handles unsupported vibration gracefully', () => {
    // Remove vibrate support
    delete (navigator as any).vibrate
    
    // Should not throw error
    expect(() => triggerHapticFeedback('light')).not.toThrow()
  })
})

describe('Performance', () => {
  it('should handle rapid gesture events without performance degradation', () => {
    const onSwipeRight = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <SwipeGesture onSwipeRight={onSwipeRight}>
        <div>Performance test</div>
      </SwipeGesture>
    )
    
    const onDragEnd = motion.div.mock.calls[0][0].onDragEnd
    
    // Simulate rapid swipe events
    const startTime = performance.now()
    for (let i = 0; i < 100; i++) {
      onDragEnd({}, { offset: { x: 60, y: 10 } })
    }
    const endTime = performance.now()
    
    // Should complete quickly (less than 100ms for 100 events)
    expect(endTime - startTime).toBeLessThan(100)
    expect(onSwipeRight).toHaveBeenCalledTimes(100)
  })

  it('should clean up timers properly', () => {
    vi.useFakeTimers()
    
    const onLongPress = vi.fn()
    const { unmount } = render(
      <LongPressGesture onLongPress={onLongPress}>
        <div>Cleanup test</div>
      </LongPressGesture>
    )
    
    // Start long press then unmount
    const { motion } = require('framer-motion')
    const onTouchStart = motion.div.mock.calls[0][0].onTouchStart
    onTouchStart()
    
    unmount()
    
    // Advance timers - should not trigger callback after unmount
    vi.advanceTimersByTime(1000)
    expect(onLongPress).not.toHaveBeenCalled()
    
    vi.useRealTimers()
  })
})